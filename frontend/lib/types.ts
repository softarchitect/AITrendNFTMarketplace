// ─── NFT ──────────────────────────────────────────────────────
export type NFTStatus = "Generating" | "Minting" | "Listed" | "SoldOut" | "Delisted"

export interface NFT {
  id: string
  tokenId: number
  chainId: number
  contractAddress: string
  title: string
  description: string
  imageUrl: string
  animationUrl?: string
  promptSummary: string
  trendSources: string[]
  themes: string[]
  mintedAt: string
  listedAt: string
  editionSize: number
  editionAvailable: number
  editionNumber?: number
  priceEth: number
  priceFiat?: number
  currency: string
  ipfsCid: string
  traits: { trait_type: string; value: string }[]
  status: NFTStatus
  creator: string
  collectionSlug: string
}

// ─── Listing ──────────────────────────────────────────────────
export type ListingStatus = "Active" | "PendingPayment" | "PendingTransfer" | "Completed" | "Cancelled"

export interface Listing {
  id: string
  nftId: string
  priceEth: number
  priceFiat: number
  status: ListingStatus
  createdAt: string
}

// ─── Receipt / Payment ───────────────────────────────────────
export type GatewayStatus = "Pending" | "Processing" | "Confirmed" | "Failed"
export type OnchainStatus = "Pending" | "Transferring" | "Complete" | "Failed"

export interface Receipt {
  id: string
  listingId: string
  userId: string
  amountFiat: number
  currency: string
  gateway: string
  gatewayStatus: GatewayStatus
  onchainStatus: OnchainStatus
  txHash?: string
  createdAt: string
}

// ─── Trend Source ─────────────────────────────────────────────
export type TrendSourceStatus = "Active" | "Paused" | "Error"
export type RateLimitMode = "Standard" | "Aggressive" | "Conservative"

export interface TrendSource {
  id: string
  name: string
  status: TrendSourceStatus
  pollingInterval: number
  lastPolledAt: string
  rateLimitMode: RateLimitMode
}

// ─── Theme ────────────────────────────────────────────────────
export type ThemeType = "Trending" | "Pinned"

export interface Theme {
  id: string
  name: string
  type: ThemeType
  description: string
  active: boolean
  priority: number
}

// ─── User ─────────────────────────────────────────────────────
export type UserRole = "User" | "Admin" | "Partner"
export type KYCStatus = "NotStarted" | "Pending" | "Verified" | "Rejected"

export interface User {
  id: string
  email: string
  displayName: string
  role: UserRole
  kycStatus: KYCStatus
  twoFAEnabled: boolean
  walletAddresses: string[]
  notificationPreferences?: {
    newDrops: boolean
    purchaseConfirmations: boolean
    transferUpdates: boolean
    platformAnnouncements: boolean
  }
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
  lastLoginAt?: string
}

// ─── Partner Key ──────────────────────────────────────────────
export type PartnerPermission = "BulkPurchase" | "Transfer" | "Relist"

export interface PartnerKey {
  id: string
  label: string
  keyPrefix: string
  createdAt: string
  lastUsedAt: string
  permissions: PartnerPermission[]
}

// ─── Collection ───────────────────────────────────────────────
export interface Collection {
  slug: string
  name: string
  description: string
  imageUrl: string
  nftCount: number
  floorPrice: number
  totalVolume: number
}

// ─── Activity Event ───────────────────────────────────────────
export type ActivityType = "Purchase" | "Transfer" | "Listing" | "Mint" | "Delist"

export interface ActivityEvent {
  id: string
  type: ActivityType
  nftTitle: string
  nftImageUrl: string
  amount?: number
  timestamp: string
  txHash?: string
}

// ─── System Component Status ──────────────────────────────────
export type SystemComponentStatus = "Operational" | "Degraded" | "Down" | "Maintenance"

export interface SystemComponent {
  id: string
  name: string
  status: SystemComponentStatus
  detail?: string
  lastIncident?: string
  lastChecked: string
}

// ─── Drop ─────────────────────────────────────────────────────
export interface Drop {
  id: string
  nftId: string
  title: string
  imageUrl: string
  mintedAt: string
  priceEth: number
  editionSize: number
  themes: string[]
}

// ─── Admin Overview ───────────────────────────────────────────
export interface AdminOverview {
  mintedToday: number
  queued: number
  listed: number
  failed: number
  totalRevenue: number
  activeUsers: number
}
