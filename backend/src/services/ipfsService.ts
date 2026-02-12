import { config } from "../config";
import { GeneratedAsset, NftMetadata, PinnedMetadata } from "../types";
import { GenericHttpIpfsProvider, IpfsProvider, MockIpfsProvider, PinataIpfsProvider } from "./ipfs/adapters";

export class IpfsService {
  private readonly provider: IpfsProvider;

  constructor(provider?: IpfsProvider) {
    if (provider) {
      this.provider = provider;
      return;
    }

    if (config.features.mockIpfs || config.ipfs.provider === "mock") {
      this.provider = new MockIpfsProvider();
      return;
    }

    if (config.ipfs.provider === "pinata") {
      const baseUrl = config.ipfs.apiBaseUrl ?? "https://api.pinata.cloud";
      const path = normalizePinJsonPath(config.ipfs.pinJsonPath);
      this.provider = new PinataIpfsProvider(baseUrl, path, {
        jwt: config.ipfs.apiJwt,
        apiKey: config.ipfs.apiKey,
        apiSecret: config.ipfs.apiSecret
      });
      return;
    }

    if (!config.ipfs.apiBaseUrl || !config.ipfs.apiKey) {
      throw new Error("Generic IPFS provider enabled but IPFS_API_BASE_URL / IPFS_API_KEY are missing.");
    }

    this.provider = new GenericHttpIpfsProvider(
      config.ipfs.apiBaseUrl,
      config.ipfs.apiKey,
      config.ipfs.pinJsonPath
    );
  }

  buildMetadata(asset: GeneratedAsset, editionSize: number): NftMetadata {
    return {
      name: `TrendMint: ${asset.topic}`,
      description: `Auto-generated from social trend topic: ${asset.topic}`,
      image: asset.mediaUrl,
      attributes: [
        { trait_type: "topic", value: asset.topic },
        { trait_type: "provider", value: asset.provider },
        { trait_type: "edition_size", value: editionSize }
      ]
    };
  }

  async pinAssetAndMetadata(asset: GeneratedAsset, editionSize: number): Promise<PinnedMetadata> {
    const metadata = this.buildMetadata(asset, editionSize);
    const pinned = await this.provider.pinJson(metadata);

    return {
      metadataUri: `ipfs://${pinned.cid}`,
      assetUri: asset.mediaUrl,
      cid: pinned.cid,
      metadata
    };
  }
}

function normalizePinJsonPath(pathValue: string): string {
  const trimmed = pathValue.trim();
  if (!trimmed) {
    return "/pinning/pinJSONToIPFS";
  }
  if (trimmed === "/pin/json") {
    return "/pinning/pinJSONToIPFS";
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}
