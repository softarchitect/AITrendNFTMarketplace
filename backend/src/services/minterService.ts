import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { TREND_MINT_721_ABI } from "../abi/trendMint721";
import { config } from "../config";
import { InMemoryStore } from "../store/inMemoryStore";

export class MinterService {
  private readonly contract?: Contract;
  private readonly adminContract?: Contract;
  private readonly tokenMintedTopic: string;
  private readonly isMock: boolean;
  private readonly minterAddress?: string;
  private readonly adminAddress?: string;

  constructor(
    private readonly db: InMemoryStore,
    modeOverride?: "mock" | "chain"
  ) {
    this.tokenMintedTopic =
      "0x3191137ea8b27f088ed27d0bd0d4c3f7379e9f5c6c1483f009e26d63f89bf0ed";
    this.isMock =
      modeOverride === "mock" ? true : modeOverride === "chain" ? false : !(config.rpcUrl && config.contractAddress && config.minterPrivateKey);
    if (!this.isMock) {
      // Use static network to avoid repeated network detection flakiness on some RPC providers.
      const provider = new JsonRpcProvider(
        config.rpcUrl,
        { chainId: config.chainId, name: "sepolia" },
        { staticNetwork: true }
      );
      const minterWallet = new Wallet(config.minterPrivateKey!, provider);
      this.minterAddress = minterWallet.address.toLowerCase();
      this.contract = new Contract(config.contractAddress, TREND_MINT_721_ABI, minterWallet);
      if (config.adminPrivateKey) {
        const adminWallet = new Wallet(config.adminPrivateKey, provider);
        this.adminAddress = adminWallet.address.toLowerCase();
        this.adminContract = new Contract(config.contractAddress, TREND_MINT_721_ABI, adminWallet);
      }
    }
  }

  get mode(): "mock" | "chain" {
    return this.isMock ? "mock" : "chain";
  }

  async getSignerStatus(): Promise<{
    mode: "mock" | "chain";
    contractAddress: string;
    chainId: number;
    minterAddress?: string;
    adminAddress?: string;
    adminConfigured: boolean;
    hasDefaultAdminRole?: boolean;
  }> {
    const base = {
      mode: this.mode,
      contractAddress: config.contractAddress,
      chainId: config.chainId,
      minterAddress: this.minterAddress,
      adminAddress: this.adminAddress,
      adminConfigured: Boolean(config.adminPrivateKey)
    };
    if (this.isMock || !this.adminContract || !this.adminAddress) {
      return base;
    }
    try {
      const adminRole = await this.adminContract.DEFAULT_ADMIN_ROLE();
      const hasRole = await this.adminContract.hasRole(adminRole, this.adminAddress);
      return {
        ...base,
        hasDefaultAdminRole: Boolean(hasRole)
      };
    } catch {
      return base;
    }
  }

  async mintFromSeries(seriesId: number, to: string, tokenUri: string): Promise<{
    txHash: string;
    tokenId?: number;
  }> {
    if (this.isMock) {
      const tokenId = this.db.listings.size + 1;
      return { txHash: `0xmockmint${tokenId.toString(16).padStart(8, "0")}`, tokenId };
    }

    if (!this.contract) {
      throw new Error("Minter contract not initialized");
    }

    try {
      const tx = await this.contract.mintFromSeries(seriesId, to, tokenUri);
      const receipt = await tx.wait();
      const tokenId = this.extractTokenIdFromReceipt(receipt?.logs);
      return {
        txHash: tx.hash,
        tokenId
      };
    } catch (error) {
      throw this.toFriendlyChainError(error, seriesId);
    }
  }

  async ensureSeriesMintable(seriesId: number): Promise<void> {
    if (this.isMock) return;
    if (!this.contract) {
      throw new Error("Minter contract not initialized");
    }
    try {
      const [maxSupplyRaw, mintedCountRaw] = await this.contract.seriesInfo(seriesId);
      const maxSupply = Number(maxSupplyRaw);
      const mintedCount = Number(mintedCountRaw);
      if (Number.isFinite(maxSupply) && Number.isFinite(mintedCount) && mintedCount >= maxSupply) {
        throw new Error(
          `Series ${seriesId} has reached max supply (${mintedCount}/${maxSupply}). Create a new series or use another series ID.`
        );
      }
    } catch (error) {
      throw this.toFriendlyChainError(error, seriesId);
    }
  }

  async createSeries(input: {
    seriesId: number;
    maxSupply: number;
    metadataRoot?: string;
  }): Promise<{ txHash: string }> {
    if (this.isMock) {
      return { txHash: `0xmockcreateseries${input.seriesId.toString(16).padStart(8, "0")}` };
    }
    if (!this.adminContract) {
      throw new Error("Admin signer not configured. Set ADMIN_PRIVATE_KEY to enable auto-series creation.");
    }
    if (!this.adminAddress) {
      throw new Error("Admin signer address is unavailable.");
    }
    try {
      const adminRole = await this.adminContract.DEFAULT_ADMIN_ROLE();
      const hasRole = await this.adminContract.hasRole(adminRole, this.adminAddress);
      if (!hasRole) {
        throw new Error("Configured admin signer does not have DEFAULT_ADMIN_ROLE on contract.");
      }
      const tx = await this.adminContract.createSeries(
        input.seriesId,
        input.maxSupply,
        input.metadataRoot ?? ""
      );
      await tx.wait();
      return { txHash: tx.hash };
    } catch (error) {
      throw this.toFriendlySeriesCreationError(error, input.seriesId);
    }
  }

  async getAvailableSeries(maxSeriesId = 30): Promise<Array<{
    seriesId: number;
    maxSupply: number;
    mintedCount: number;
    remaining: number;
  }>> {
    if (this.isMock) {
      return [
        {
          seriesId: config.defaultSeriesId,
          maxSupply: Number.MAX_SAFE_INTEGER,
          mintedCount: this.db.listings.size,
          remaining: Number.MAX_SAFE_INTEGER
        }
      ];
    }
    if (!this.contract) {
      throw new Error("Minter contract not initialized");
    }
    const result: Array<{
      seriesId: number;
      maxSupply: number;
      mintedCount: number;
      remaining: number;
    }> = [];
    for (let seriesId = 1; seriesId <= maxSeriesId; seriesId += 1) {
      try {
        const [maxSupplyRaw, mintedCountRaw] = await this.contract.seriesInfo(seriesId);
        const maxSupply = Number(maxSupplyRaw);
        const mintedCount = Number(mintedCountRaw);
        const remaining = Math.max(0, maxSupply - mintedCount);
        result.push({ seriesId, maxSupply, mintedCount, remaining });
      } catch (error) {
        const selector = this.extractSelector(error);
        if (selector === "0x99be754c") {
          continue;
        }
        throw this.toFriendlyChainError(error, seriesId);
      }
    }
    return result;
  }

  async getSeriesInfo(seriesId: number): Promise<{ maxSupply: number; mintedCount: number; remaining: number }> {
    if (this.isMock) {
      const mintedCount = [...this.db.listings.values()].filter((listing) => listing.seriesId === seriesId).length;
      const maxSupply = this.db.defaultEditionSize;
      return {
        maxSupply,
        mintedCount,
        remaining: Math.max(0, maxSupply - mintedCount)
      };
    }
    if (!this.contract) {
      throw new Error("Minter contract not initialized");
    }
    const [maxSupplyRaw, mintedCountRaw] = await this.contract.seriesInfo(seriesId);
    const maxSupply = Number(maxSupplyRaw);
    const mintedCount = Number(mintedCountRaw);
    return {
      maxSupply,
      mintedCount,
      remaining: Math.max(0, maxSupply - mintedCount)
    };
  }

  async transfer(from: string, to: string, tokenId: number): Promise<{ txHash: string }> {
    if (this.isMock) {
      return { txHash: `0xmocktransfer${tokenId.toString(16).padStart(8, "0")}` };
    }

    if (!this.contract) {
      throw new Error("Minter contract not initialized");
    }

    const tx = await this.contract.safeTransferFrom(from, to, tokenId);
    await tx.wait();
    return { txHash: tx.hash };
  }

  private extractTokenIdFromReceipt(
    logs: Array<{ topics?: ReadonlyArray<string> }> | undefined
  ): number | undefined {
    if (!logs) {
      return undefined;
    }
    const tokenMintedLog = logs.find((log) => log.topics?.[0]?.toLowerCase() === this.tokenMintedTopic);
    const tokenIdTopic = tokenMintedLog?.topics?.[1];
    if (!tokenIdTopic) {
      return undefined;
    }
    try {
      return Number(BigInt(tokenIdTopic));
    } catch {
      return undefined;
    }
  }

  private toFriendlyChainError(error: unknown, seriesId: number): Error {
    const selector = this.extractSelector(error);
    switch (selector) {
      case "0x99be754c":
        return new Error(
          `Series ${seriesId} does not exist on-chain. Create that series first (or use your configured default series).`
        );
      case "0x9c92c50e":
        return new Error(
          `Series ${seriesId} is sold out (max supply reached). Use another series ID.`
        );
      case "0xe2517d3f":
        return new Error("Backend minter wallet is missing MINTER_ROLE on the contract.");
      case "0xd93c0665":
        return new Error("Contract is paused. Unpause before minting.");
      default:
        if (error instanceof Error && error.message) {
          return new Error(error.message);
        }
        return new Error("On-chain mint failed");
    }
  }

  private toFriendlySeriesCreationError(error: unknown, seriesId: number): Error {
    const selector = this.extractSelector(error);
    const message =
      error instanceof Error ? error.message : typeof error === "string" ? error : "Series creation failed";
    // TrendMint721.SeriesAlreadyExists(uint256)
    if (
      selector === "0xf9b68be0" ||
      message.toLowerCase().includes("seriesalreadyexists") ||
      message.toLowerCase().includes("already exists")
    ) {
      return new Error(`Series ${seriesId} already exists.`);
    }
    if (message.toLowerCase().includes("invalidmaxsupply")) {
      return new Error("Series maxSupply must be greater than zero.");
    }
    if (message.toLowerCase().includes("default_admin_role") || message.toLowerCase().includes("accesscontrol")) {
      return new Error("Admin signer is not authorized to create series on this contract.");
    }
    if (error instanceof Error && error.message) {
      return new Error(error.message);
    }
    return new Error("On-chain series creation failed");
  }

  private extractSelector(error: unknown): string | undefined {
    const unknownError = error as {
      data?: string;
      error?: { data?: string };
      info?: { error?: { data?: string } };
    };
    const data =
      unknownError?.data ??
      unknownError?.error?.data ??
      unknownError?.info?.error?.data;
    if (typeof data === "string" && data.startsWith("0x") && data.length >= 10) {
      return data.slice(0, 10).toLowerCase();
    }
    return undefined;
  }
}
