export type TrendSource = "twitter" | "instagram" | "reddit" | "manual";

export type PaymentStatus =
  | "created"
  | "pending"
  | "confirmed"
  | "failed"
  | "refunded";

export interface TrendTopic {
  id: string;
  source: TrendSource;
  topic: string;
  score: number;
  createdAt: string;
  pinned: boolean;
}

export interface GenerationJob {
  id: string;
  topicId: string;
  prompt: string;
  status: "queued" | "processing" | "completed" | "failed";
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedAsset {
  id: string;
  jobId: string;
  topic: string;
  prompt: string;
  mediaUrl: string;
  provider: string;
  createdAt: string;
}

export interface NftMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{ trait_type: string; value: string | number }>;
}

export interface PinnedMetadata {
  metadataUri: string;
  assetUri: string;
  cid: string;
  metadata: NftMetadata;
}

export interface MintRecord {
  id: string;
  seriesId: number;
  to: string;
  tokenUri: string;
  txHash: string;
  status: "submitted" | "confirmed" | "failed";
  tokenId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ListingRecord {
  id: string;
  tokenId: number;
  owner: string;
  tokenUri: string;
  status: "minted" | "listed" | "sold" | "transferred";
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  externalRef: string;
  amountUsd: number;
  currency: string;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptRecord {
  id: string;
  paymentId: string;
  txHash: string;
  wallet: string;
  createdAt: string;
}
