import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { TREND_MINT_721_ABI } from "../abi/trendMint721";
import { config } from "../config";
import { InMemoryStore } from "../store/inMemoryStore";

export class MinterService {
  private readonly contract?: Contract;
  private readonly tokenMintedTopic: string;
  private readonly isMock: boolean;

  constructor(
    private readonly db: InMemoryStore,
    modeOverride?: "mock" | "chain"
  ) {
    this.tokenMintedTopic =
      "0x3191137ea8b27f088ed27d0bd0d4c3f7379e9f5c6c1483f009e26d63f89bf0ed";
    this.isMock =
      modeOverride === "mock" ? true : modeOverride === "chain" ? false : !(config.rpcUrl && config.contractAddress && config.minterPrivateKey);
    if (!this.isMock) {
      const provider = new JsonRpcProvider(config.rpcUrl);
      const wallet = new Wallet(config.minterPrivateKey!, provider);
      this.contract = new Contract(config.contractAddress, TREND_MINT_721_ABI, wallet);
    }
  }

  get mode(): "mock" | "chain" {
    return this.isMock ? "mock" : "chain";
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

    const tx = await this.contract.mintFromSeries(seriesId, to, tokenUri);
    const receipt = await tx.wait();
    const tokenId = this.extractTokenIdFromReceipt(receipt?.logs);
    return {
      txHash: tx.hash,
      tokenId
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
}
