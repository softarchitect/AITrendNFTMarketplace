import type {
  NFT, Collection, Listing, Receipt, TrendSource, Theme, User,
  PartnerKey, ActivityEvent, SystemComponent, Drop, AdminOverview,
} from "@/lib/types"
import { apiRequest, getApiBaseUrl } from "@/lib/api/client"

interface ListingDto {
  id: string
  tokenId: number
  seriesId?: number
  editionSize?: number
  editionNumber?: number
  editionAvailable?: number
  owner: string
  tokenUri: string
  imageUrl?: string
  priceUsd?: number
  themes?: string[]
  status: "minted" | "listed" | "sold" | "transferred"
  createdAt: string
  updatedAt: string
}

interface ReceiptDto {
  id: string
  paymentId: string
  listingId?: string
  txHash: string
  wallet: string
  amountUsd?: number
  currency?: string
  paymentStatus?: "created" | "pending" | "confirmed" | "failed" | "refunded"
  settlementStatus?: "pending" | "processing" | "completed" | "failed"
  gatewayProvider?: string
  createdAt: string
}

interface PaymentLogDto {
  id: string
  externalRef: string
  amountUsd: number
  currency: string
  status: "created" | "pending" | "confirmed" | "failed" | "refunded"
  createdAt: string
  updatedAt: string
}

export interface AdminPaymentDto {
  paymentId: string
  externalRef: string
  amountUsd: number
  currency: string
  paymentStatus: "created" | "pending" | "confirmed" | "failed" | "refunded"
  settlementStatus: "pending" | "processing" | "completed" | "failed"
  listingId?: string
  tokenId?: number
  buyerAddress?: string
  sellerAddress?: string
  checkoutUrl?: string
  txHash?: string
  receiptId?: string
  gatewayProvider: string
  createdAt: string
  updatedAt: string
}

export interface RunMintCycleResult {
  topic?: {
    id?: string
    source?: string
    topic?: string
  }
  mint?: {
    id?: string
    tokenId?: number
    status?: "submitted" | "confirmed" | "failed"
  }
  listing?: {
    id?: string
    tokenId?: number
    owner?: string
    tokenUri?: string
    status?: "minted" | "listed" | "sold" | "transferred"
  }
  minterMode?: string
}

interface PurchaseSessionDto {
  paymentId: string
  externalRef: string
  paymentStatus: "created" | "pending" | "confirmed" | "failed" | "refunded"
  settlementStatus: "pending" | "processing" | "completed" | "failed"
  checkoutUrl?: string
  listingId: string
  tokenId: number
  buyerAddress?: string
  sellerAddress?: string
  amountUsd: number
  currency: string
  txHash?: string
  receiptId?: string
  owner?: string
}

interface AdminConfigDto {
  trendSources: string[]
  trendSourceStatuses?: Array<{ source: string; status: "Active" | "Paused" }>
  trendSourceSettings?: Array<{
    source: string
    status: "Active" | "Paused"
    rateLimitMode: "Standard" | "Aggressive" | "Conservative"
  }>
  pinnedThemes: string[]
  mintCounters: {
    date: string
    perDay: number
    perHour: Record<string, number>
  }
  editionDefaults?: {
    defaultSize: number
    overrides: Array<{ seriesKey: string; size: number }>
  }
  themes?: ThemeDto[]
}

interface EditionsDto {
  defaultSize: number
  overrides: Array<{ seriesKey: string; size: number }>
}

interface AdminSessionDto {
  token?: string
  expiresAt: string
  user: {
    id: string
    email: string
    displayName: string
    role: "Admin"
  }
}

interface UserSessionDto {
  token?: string
  expiresAt: string
  user: {
    id: string
    email: string
    displayName: string
    role: "User"
  }
}

interface AdminControlsDto {
  dailyCap: number
  hourlyCap: number
  pipelineEnabled: boolean
  scheduleEnabled: boolean
  trendTopicLimit: number
  autoMintIntervalMinutes: number
  autoMintBatchSize: number
  dailyMinimumTarget: number
}

interface AdminSeriesDto {
  seriesId: number
  maxSupply: number
  mintedCount: number
  remaining: number
}

interface ThemeDto {
  id: string
  name: string
  type: "Trending" | "Pinned"
  description: string
  active: boolean
  priority: number
  createdAt: string
  updatedAt: string
}

interface GatewayConfigDto {
  provider: "mock" | "generic" | "vellis" | "wert" | "nowpayments"
  mode: "sandbox" | "live"
  webhookVerificationEnabled: boolean
  webhookSignatureHeader: string
}

interface PricingConfigDto {
  basePriceUsd: number
  tokenStepUsd: number
  themeOverrides: Record<string, number>
  seriesOverrides: Record<string, number>
  listingOverrides: Record<string, number>
}

interface SeriesLifecycleConfigDto {
  autoSeriesEnabled: boolean
  seriesIdTemplate: string
  defaultSeriesMaxSupply: number
  seriesMetadataRootTemplate: string
}

interface TrendSourceHealthDto {
  source: string
  lastAttemptAt?: string
  lastSuccessAt?: string
  consecutiveFailures: number
  lastError?: string
}

interface MarketplaceGatewayInfoDto {
  provider: string
  mode: "sandbox" | "live"
  checkoutType?: "crypto-only" | "fiat-or-gateway"
  kycRequired?: boolean
  twoFARequired?: boolean
}

interface GatewayHealthDto {
  provider: string
  ok: boolean
  detail: string
}

interface WebhookLogDto {
  id: string
  kind: "payment"
  externalRef?: string
  status: "accepted" | "rejected"
  reason?: string
  createdAt: string
}

interface AuditLogDto {
  id: string
  action: string
  actor: string
  createdAt: string
  details: Record<string, unknown>
}

interface AdminUserDto {
  id: string
  email: string
  displayName: string
  role: "User"
  kycStatus: "NotStarted" | "Pending" | "Verified" | "Rejected"
  twoFAEnabled: boolean
  isActive: boolean
  walletAddresses: string[]
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

export interface AdminAccountDto {
  id: string
  email: string
  displayName: string
  role: "Admin"
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

function createFallbackImage(tokenId: number): string {
  return `/placeholder.svg?height=512&width=512&query=trendmint%20nft%20${tokenId}`
}

function mapListingStatus(status: ListingDto["status"]): NFT["status"] {
  switch (status) {
    case "listed":
      return "Listed"
    case "sold":
      return "SoldOut"
    case "transferred":
      return "SoldOut"
    case "minted":
    default:
      return "Minting"
  }
}

function mapListingToNft(listing: ListingDto): NFT {
  const configuredUsd = listing.priceUsd
  const fallbackUsd = Number((100 + (listing.tokenId % 5) * 15).toFixed(2))
  const usdPrice = Number.isFinite(configuredUsd) && (configuredUsd ?? 0) > 0 ? Number(configuredUsd) : fallbackUsd
  const basePrice = Number((usdPrice / 3000).toFixed(6))
  const listingThemes = listing.themes && listing.themes.length > 0 ? listing.themes : ["AI Art"]
  return {
    id: listing.id,
    tokenId: listing.tokenId,
    chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111),
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "",
    title: `Affordable NFT #${listing.tokenId}`,
    description: `AI-generated NFT indexed from ${listing.tokenUri}`,
    imageUrl: listing.imageUrl || createFallbackImage(listing.tokenId),
    promptSummary: `Generated from ${listingThemes.join(", ")}`,
    trendSources: ["Twitter/X", "Reddit"],
    themes: listingThemes,
    mintedAt: listing.createdAt,
    listedAt: listing.updatedAt,
    editionSize: listing.editionSize ?? 1,
    editionAvailable: listing.editionAvailable ?? (listing.status === "listed" ? 1 : 0),
    editionNumber: listing.editionNumber ?? 1,
    priceEth: basePrice,
    priceFiat: usdPrice,
    currency: "USD",
    ipfsCid: listing.tokenUri.replace("ipfs://", ""),
    traits: [
      { trait_type: "Source", value: "Affordable NFT" },
      { trait_type: "Token", value: String(listing.tokenId) },
    ],
    status: mapListingStatus(listing.status),
    creator: "Affordable NFT",
    collectionSlug: "trendmint-default",
  }
}

function mapReceiptToUi(receipt: ReceiptDto): Receipt {
  const gatewayStatus: Receipt["gatewayStatus"] =
    receipt.paymentStatus === "confirmed"
      ? "Confirmed"
      : receipt.paymentStatus === "failed" || receipt.paymentStatus === "refunded"
        ? "Failed"
        : "Pending"
  const onchainStatus: Receipt["onchainStatus"] =
    receipt.settlementStatus === "completed"
      ? "Complete"
      : receipt.settlementStatus === "processing"
        ? "Transferring"
        : receipt.settlementStatus === "failed"
          ? "Failed"
          : "Pending"
  return {
    id: receipt.id,
    listingId: receipt.listingId ?? receipt.paymentId,
    userId: receipt.wallet,
    amountFiat: receipt.amountUsd ?? 0,
    currency: receipt.currency ?? "USD",
    gateway: receipt.gatewayProvider ?? "Gateway",
    gatewayStatus,
    onchainStatus,
    txHash: receipt.txHash,
    createdAt: receipt.createdAt,
  }
}

function randomIdempotencyKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function toTitleCase(value: string): string {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
}

function normalizeThemeName(value: string): string {
  return value.trim().replace(/\s+/g, " ")
}

function mapThemeDtoToUi(theme: ThemeDto): Theme {
  return {
    id: theme.id,
    name: theme.name,
    type: theme.type,
    description: theme.description,
    active: theme.active,
    priority: theme.priority,
  }
}

// ─── Public ───────────────────────────────────────────────────
export async function getFeaturedNFTs(): Promise<NFT[]> {
  const listings = await apiRequest<ListingDto[]>("/api/marketplace/listings")
  return listings.map(mapListingToNft).slice(0, 6)
}

export async function getMarketplaceNFTs(filters?: {
  search?: string
  theme?: string
  source?: string
  status?: string
  minPrice?: number
  maxPrice?: number
  sort?: string
  page?: number
  limit?: number
}): Promise<{ nfts: NFT[]; total: number }> {
  const listings = await apiRequest<ListingDto[]>("/api/marketplace/listings")
  let filtered = listings.map(mapListingToNft)
  if (filters?.search) {
    const query = filters.search.toLowerCase().trim()
    filtered = filtered.filter(
      (n) =>
        n.title.toLowerCase().includes(query) ||
        n.themes.some((theme) => theme.toLowerCase().includes(query))
    )
  }
  if (filters?.theme) {
    filtered = filtered.filter((n) => n.themes.some((theme) => theme.toLowerCase() === filters.theme?.toLowerCase()))
  }
  if (filters?.source) {
    filtered = filtered.filter((n) => n.trendSources.some((source) => source.toLowerCase() === filters.source?.toLowerCase()))
  }
  if (filters?.status) filtered = filtered.filter((n) => n.status === filters.status)
  if (filters?.minPrice !== undefined) {
    const minPrice = filters.minPrice
    filtered = filtered.filter((n) => n.priceEth >= minPrice)
  }
  if (filters?.maxPrice !== undefined) {
    const maxPrice = filters.maxPrice
    filtered = filtered.filter((n) => n.priceEth <= maxPrice)
  }
  if (filters?.sort === "price-asc") filtered = filtered.sort((a, b) => a.priceEth - b.priceEth)
  if (filters?.sort === "price-desc") filtered = filtered.sort((a, b) => b.priceEth - a.priceEth)
  if (filters?.sort === "newest") filtered = filtered.sort((a, b) => new Date(b.mintedAt).getTime() - new Date(a.mintedAt).getTime())
  if (filters?.sort === "trending") {
    filtered = filtered.sort((a, b) => {
      const left = b.editionAvailable / Math.max(1, b.editionSize)
      const right = a.editionAvailable / Math.max(1, a.editionSize)
      return left - right
    })
  }
  const total = filtered.length
  const page = Math.max(1, filters?.page ?? 1)
  const limit = Math.max(1, Math.min(60, filters?.limit ?? 24))
  const start = (page - 1) * limit
  const end = start + limit
  return { nfts: filtered.slice(start, end), total }
}

export async function getMarketplaceFilterOptions(): Promise<{
  themes: string[]
  sources: string[]
  statuses: string[]
}> {
  const listings = await apiRequest<ListingDto[]>("/api/marketplace/listings")
  const nfts = listings.map(mapListingToNft)
  const themes = Array.from(new Set(nfts.flatMap((item) => item.themes))).sort((a, b) => a.localeCompare(b))
  const sources = Array.from(new Set(nfts.flatMap((item) => item.trendSources))).sort((a, b) => a.localeCompare(b))
  const preferredStatusOrder = ["Listed", "Minting", "SoldOut", "Generating"]
  const statuses = Array.from(new Set(nfts.map((item) => item.status)))
    .sort((a, b) => {
      const left = preferredStatusOrder.indexOf(a)
      const right = preferredStatusOrder.indexOf(b)
      if (left === -1 && right === -1) return a.localeCompare(b)
      if (left === -1) return 1
      if (right === -1) return -1
      return left - right
    })
  return {
    themes,
    sources,
    statuses
  }
}

export async function getNFTById(id: string): Promise<NFT | undefined> {
  try {
    const listing = await apiRequest<ListingDto>(`/api/marketplace/listings/${id}`)
    return mapListingToNft(listing)
  } catch {
    return undefined
  }
}

export async function getCollections(): Promise<Collection[]> {
  const { nfts } = await getMarketplaceNFTs({ limit: 60, page: 1 })
  if (nfts.length === 0) {
    return []
  }
  const byTheme = new Map<string, NFT[]>()
  for (const nft of nfts) {
    const theme = nft.themes[0] ?? "AI Art"
    const key = slugify(theme)
    const bucket = byTheme.get(key) ?? []
    bucket.push(nft)
    byTheme.set(key, bucket)
  }
  const dynamicThemeCollections: Collection[] = [...byTheme.entries()].map(([slug, items]) => {
    const sample = items[0]
    const title = sample?.themes[0] ?? "AI Art"
    return {
      slug: `theme-${slug}`,
      name: `${title} Collection`,
      description: `Theme-focused collection for ${title}`,
      imageUrl: sample?.imageUrl ?? "/placeholder.svg?height=320&width=320&query=collection",
      nftCount: items.length,
      floorPrice: Math.min(...items.map((item) => item.priceEth)),
      totalVolume: Number(items.reduce((sum, item) => sum + item.priceEth, 0).toFixed(4)),
    }
  })
  const defaultCollection: Collection = {
    slug: "trendmint-default",
    name: "Affordable NFT Default",
    description: "All minted NFTs in the marketplace",
    imageUrl: nfts[0]?.imageUrl ?? "/placeholder.svg?height=320&width=320&query=collection",
    nftCount: nfts.length,
    floorPrice: Math.min(...nfts.map((item) => item.priceEth)),
    totalVolume: Number(nfts.reduce((sum, item) => sum + item.priceEth, 0).toFixed(4)),
  }
  return [defaultCollection, ...dynamicThemeCollections].sort((a, b) => b.nftCount - a.nftCount)
}

export async function getCollectionBySlug(slug: string): Promise<Collection | undefined> {
  const collections = await getCollections()
  return collections.find((item) => item.slug === slug)
}

export async function getCollectionNFTs(slug: string): Promise<NFT[]> {
  const { nfts } = await getMarketplaceNFTs()
  if (slug === "trendmint-default") {
    return nfts
  }
  if (slug.startsWith("theme-")) {
    const themeSlug = slug.replace(/^theme-/, "")
    return nfts.filter((nft) => nft.themes.some((theme) => slugify(theme) === themeSlug))
  }
  return nfts.filter((nft) => nft.collectionSlug === slug)
}

export async function getDrops(): Promise<Drop[]> {
  const featured = await getFeaturedNFTs()
  return featured.slice(0, 4).map((nft) => ({
    id: nft.id,
    nftId: nft.id,
    title: nft.title,
    imageUrl: nft.imageUrl,
    mintedAt: nft.mintedAt,
    priceEth: nft.priceEth,
    editionSize: nft.editionSize,
    themes: nft.themes,
  }))
}

export async function getSystemStatus(): Promise<SystemComponent[]> {
  return apiRequest<SystemComponent[]>("/api/admin/system-status")
}

// ─── Auth ─────────────────────────────────────────────────────
export async function connectWallet(): Promise<{ address: string }> {
  return { address: "" }
}

export async function userRegister(payload: {
  email: string
  password: string
  displayName: string
}): Promise<UserSessionDto> {
  return apiRequest<UserSessionDto>("/api/auth/register", {
    method: "POST",
    body: payload,
  })
}

export async function userLogin(email: string, password: string): Promise<UserSessionDto> {
  return apiRequest<UserSessionDto>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  })
}

export async function getUserSession(): Promise<UserSessionDto> {
  return apiRequest<UserSessionDto>("/api/auth/session")
}

export async function userLogout(): Promise<void> {
  await apiRequest("/api/auth/logout", { method: "POST" })
}

export async function changeUserPassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest("/api/auth/change-password", {
    method: "POST",
    body: {
      currentPassword,
      newPassword,
    },
  })
}

export async function getMe(): Promise<User> {
  return apiRequest<User>("/api/auth/me")
}

export async function updateProfile(data: Partial<User>): Promise<User> {
  return apiRequest<User>("/api/auth/me", {
    method: "PATCH",
    body: {
      email: data.email,
      displayName: data.displayName,
    },
  })
}

export async function updateUserSecurity(data: { twoFAEnabled: boolean }): Promise<User> {
  return apiRequest<User>("/api/auth/me/security", {
    method: "PATCH",
    body: data,
  })
}

export async function updateUserWallet(
  action: "add" | "remove",
  walletAddress: string
): Promise<User> {
  return apiRequest<User>("/api/auth/me/wallets", {
    method: "PATCH",
    body: { action, walletAddress },
  })
}

export async function updateUserNotifications(data: {
  newDrops?: boolean
  purchaseConfirmations?: boolean
  transferUpdates?: boolean
  platformAnnouncements?: boolean
}): Promise<User> {
  return apiRequest<User>("/api/auth/me/notifications", {
    method: "PATCH",
    body: data,
  })
}

// ─── User ─────────────────────────────────────────────────────
export async function getReceipts(walletAddress?: string): Promise<Receipt[]> {
  if (!walletAddress) return []
  const receipts = await apiRequest<ReceiptDto[]>(`/api/marketplace/receipts/${walletAddress}`)
  return receipts.map(mapReceiptToUi)
}

export async function getUserNFTs(walletAddress?: string): Promise<NFT[]> {
  if (!walletAddress) return []
  const owned = await apiRequest<ListingDto[]>(`/api/marketplace/ownership/${walletAddress}`)
  return owned.map(mapListingToNft)
}

export async function getUserActivity(walletAddress?: string): Promise<ActivityEvent[]> {
  if (!walletAddress) return []
  const normalizedWallet = walletAddress.toLowerCase()
  const [receipts, listings] = await Promise.all([
    apiRequest<ReceiptDto[]>(`/api/marketplace/receipts/${walletAddress}`),
    apiRequest<ListingDto[]>("/api/marketplace/listings"),
  ])
  const listingById = new Map(listings.map((listing) => [listing.id, listing]))
  const purchaseEvents: ActivityEvent[] = receipts.map((receipt) => {
    const listing = listingById.get(receipt.listingId ?? "")
    const tokenId = listing?.tokenId ?? 0
    return {
      id: `purchase-${receipt.id}`,
      type: "Purchase",
      nftTitle: listing ? `Affordable NFT #${listing.tokenId}` : `Affordable NFT Purchase ${receipt.id.slice(0, 8)}`,
      nftImageUrl: listing?.imageUrl || createFallbackImage(tokenId || 1),
      amount: undefined,
      timestamp: receipt.createdAt,
      txHash: receipt.txHash,
    }
  })
  const ownershipEvents: ActivityEvent[] = listings
    .filter((listing) => listing.owner.toLowerCase() === normalizedWallet)
    .map((listing) => ({
      id: `ownership-${listing.id}`,
      type: listing.status === "listed" ? "Listing" : listing.status === "transferred" ? "Transfer" : "Mint",
      nftTitle: `Affordable NFT #${listing.tokenId}`,
      nftImageUrl: listing.imageUrl || createFallbackImage(listing.tokenId),
      amount: Number((0.015 + (listing.tokenId % 5) * 0.005).toFixed(3)),
      timestamp: listing.updatedAt,
    }))
  const merged = [...purchaseEvents, ...ownershipEvents]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  return merged.slice(0, 24)
}

// ─── Checkout ─────────────────────────────────────────────────
export async function createCheckoutSession(
  listingId: string,
  options?: {
    buyerAddress: string
    idempotencyKey?: string
    amountUsd?: number
    currency?: string
  }
): Promise<{ sessionId: string; listing: Listing; checkoutUrl?: string }> {
  const nft = await getNFTById(listingId)
  const priceFiat = options?.amountUsd ?? nft?.priceFiat ?? 100
  const response = await apiRequest<PurchaseSessionDto>("/api/marketplace/purchase-session", {
    method: "POST",
    body: {
      listingId,
      buyerAddress: options?.buyerAddress ?? "0x0000000000000000000000000000000000000000",
      idempotencyKey: options?.idempotencyKey ?? randomIdempotencyKey(listingId),
      amountUsd: priceFiat,
      currency: options?.currency ?? "USD",
    },
  })

  const listing: Listing = {
    id: response.listingId,
    nftId: response.listingId,
    priceEth: nft?.priceEth ?? 0,
    priceFiat: response.amountUsd,
    status: response.paymentStatus === "confirmed" ? "PendingTransfer" : "PendingPayment",
    createdAt: new Date().toISOString(),
  }

  return { sessionId: response.paymentId, listing, checkoutUrl: response.checkoutUrl }
}

export async function getMarketplaceGatewayInfo(): Promise<MarketplaceGatewayInfoDto> {
  return apiRequest<MarketplaceGatewayInfoDto>("/api/marketplace/gateway-info")
}

export async function confirmPayment(
  sessionId: string
): Promise<{ status: "confirmed" | "pending" | "failed"; settlementStatus: "pending" | "processing" | "completed" | "failed" }> {
  const session = await apiRequest<PurchaseSessionDto>(`/api/marketplace/purchase-session/${sessionId}`)
  if (session.paymentStatus === "confirmed") {
    return { status: "confirmed", settlementStatus: session.settlementStatus }
  }
  if (session.paymentStatus === "failed" || session.paymentStatus === "refunded") {
    return { status: "failed", settlementStatus: session.settlementStatus }
  }
  return { status: "pending", settlementStatus: session.settlementStatus }
}

export async function pollTransferStatus(
  sessionId: string
): Promise<{ status: "pending" | "transferring" | "complete" | "failed"; txHash?: string; receiptId?: string }> {
  const session = await apiRequest<PurchaseSessionDto>(`/api/marketplace/purchase-session/${sessionId}`)
  if (session.settlementStatus === "completed") {
    return { status: "complete", txHash: session.txHash, receiptId: session.receiptId }
  }
  if (session.settlementStatus === "failed") return { status: "failed" }
  if (session.settlementStatus === "processing") return { status: "transferring" }
  return { status: "pending" }
}

export async function settleCheckoutSession(sessionId: string): Promise<{ txHash?: string; receiptId?: string }> {
  const response = await apiRequest<{ txHash?: string; receiptId?: string }>(
    `/api/marketplace/purchase-session/${sessionId}/settle`,
    { method: "POST" }
  )
  return response
}

// ─── Admin ────────────────────────────────────────────────────
export async function getAdminOverview(): Promise<AdminOverview> {
  const [config, listings, payments] = await Promise.all([
    apiRequest<AdminConfigDto>("/api/admin/config"),
    apiRequest<ListingDto[]>("/api/marketplace/listings"),
    apiRequest<PaymentLogDto[]>("/api/admin/logs/payments"),
  ])
  return {
    mintedToday: config.mintCounters.perDay,
    queued: listings.filter((item) => item.status === "minted").length,
    listed: listings.filter((item) => item.status === "listed").length,
    failed: payments.filter((item) => item.status === "failed").length,
    totalRevenue: payments.filter((item) => item.status === "confirmed").reduce((sum, item) => sum + item.amountUsd, 0),
    activeUsers: new Set(listings.map((item) => item.owner.toLowerCase())).size,
  }
}

export async function getAdminPaymentSummary(): Promise<{
  confirmed: number
  processing: number
  failed: number
  total: number
}> {
  const payments = await apiRequest<PaymentLogDto[]>("/api/admin/logs/payments")
  const confirmed = payments.filter((item) => item.status === "confirmed").length
  const processing = payments.filter((item) => item.status === "created" || item.status === "pending").length
  const failed = payments.filter((item) => item.status === "failed" || item.status === "refunded").length
  return {
    confirmed,
    processing,
    failed,
    total: payments.length,
  }
}

export async function adminLogin(email: string, password: string): Promise<AdminSessionDto> {
  return apiRequest<AdminSessionDto>("/api/admin/auth/login", {
    method: "POST",
    body: { email, password },
  })
}

export async function getAdminSession(): Promise<AdminSessionDto> {
  return apiRequest<AdminSessionDto>("/api/admin/auth/session")
}

export async function adminLogout(): Promise<void> {
  await apiRequest("/api/admin/auth/logout", { method: "POST" })
}

export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest("/api/admin/auth/change-password", {
    method: "POST",
    body: {
      currentPassword,
      newPassword,
    },
  })
}

export async function getAdminAccounts(): Promise<AdminAccountDto[]> {
  return apiRequest<AdminAccountDto[]>("/api/admin/admin-users")
}

export async function createAdminAccount(payload: {
  email: string
  password: string
  displayName: string
  isActive?: boolean
}): Promise<AdminAccountDto> {
  return apiRequest<AdminAccountDto>("/api/admin/admin-users", {
    method: "POST",
    body: payload,
  })
}

export async function updateAdminAccount(
  id: string,
  payload: {
    email?: string
    displayName?: string
    password?: string
    isActive?: boolean
  }
): Promise<AdminAccountDto> {
  return apiRequest<AdminAccountDto>(`/api/admin/admin-users/${id}`, {
    method: "PATCH",
    body: payload,
  })
}

export async function getEditionSettings(): Promise<EditionsDto> {
  return apiRequest<EditionsDto>("/api/admin/editions")
}

export async function getMintControls(): Promise<AdminControlsDto> {
  return apiRequest<AdminControlsDto>("/api/admin/mint-controls")
}

export async function updateMintControls(
  controls: Partial<AdminControlsDto>
): Promise<AdminControlsDto> {
  return apiRequest<AdminControlsDto>("/api/admin/mint-controls", {
    method: "POST",
    body: controls,
  })
}

export async function getGatewayConfig(): Promise<GatewayConfigDto> {
  return apiRequest<GatewayConfigDto>("/api/admin/gateway-config")
}

export async function updateGatewayConfig(
  patch: Partial<GatewayConfigDto>
): Promise<GatewayConfigDto> {
  return apiRequest<GatewayConfigDto>("/api/admin/gateway-config", {
    method: "POST",
    body: patch,
  })
}

export async function getPricingConfig(): Promise<PricingConfigDto> {
  return apiRequest<PricingConfigDto>("/api/admin/pricing-config")
}

export async function updatePricingConfig(
  patch: Partial<PricingConfigDto>
): Promise<PricingConfigDto> {
  return apiRequest<PricingConfigDto>("/api/admin/pricing-config", {
    method: "POST",
    body: patch,
  })
}

export async function getSeriesLifecycleConfig(): Promise<SeriesLifecycleConfigDto> {
  return apiRequest<SeriesLifecycleConfigDto>("/api/admin/series-lifecycle-config")
}

export async function updateSeriesLifecycleConfig(
  patch: Partial<SeriesLifecycleConfigDto>
): Promise<SeriesLifecycleConfigDto> {
  return apiRequest<SeriesLifecycleConfigDto>("/api/admin/series-lifecycle-config", {
    method: "POST",
    body: patch,
  })
}

export async function createAdminSeries(payload: {
  seriesId: number
  maxSupply: number
  metadataRoot?: string
}): Promise<{ seriesId: number; maxSupply: number; metadataRoot: string; txHash: string }> {
  return apiRequest("/api/admin/series", {
    method: "POST",
    body: payload,
  })
}

export async function previewNextAdminSeries(payload?: {
  seriesIdTemplate?: string
}): Promise<{
  mode: "mock" | "chain"
  template: string
  nextSeriesId: number
  existsOnChain: boolean
  chainReachable?: boolean
  warning?: string
}> {
  const params = new URLSearchParams()
  if (payload?.seriesIdTemplate?.trim()) {
    params.set("seriesIdTemplate", payload.seriesIdTemplate.trim())
  }
  const query = params.toString()
  return apiRequest(`/api/admin/series/preview-next${query ? `?${query}` : ""}`)
}

export async function createNextAdminSeries(payload?: {
  seriesIdTemplate?: string
  defaultSeriesMaxSupply?: number
  seriesMetadataRootTemplate?: string
}): Promise<{
  template: string
  seriesId: number
  maxSupply: number
  metadataRoot: string
  txHash: string
}> {
  return apiRequest("/api/admin/series/create-next", {
    method: "POST",
    body: payload,
  })
}

export async function getTrendSourceHealth(): Promise<TrendSourceHealthDto[]> {
  return apiRequest<TrendSourceHealthDto[]>("/api/admin/trend-source-health")
}

export async function getGatewayHealth(): Promise<GatewayHealthDto> {
  return apiRequest<GatewayHealthDto>("/api/admin/gateway-health")
}

export async function getWebhookLogs(): Promise<WebhookLogDto[]> {
  return apiRequest<WebhookLogDto[]>("/api/admin/logs/webhooks")
}

export async function getAuditLogs(): Promise<AuditLogDto[]> {
  return apiRequest<AuditLogDto[]>("/api/admin/logs/audit")
}

export async function updateDefaultEditionSize(size: number): Promise<{ defaultSize: number }> {
  return apiRequest<{ defaultSize: number }>("/api/admin/editions/default", {
    method: "POST",
    body: { size },
  })
}

export async function upsertEditionOverride(seriesKey: string, size: number): Promise<{ seriesKey: string; size: number }> {
  return apiRequest<{ seriesKey: string; size: number }>("/api/admin/editions/overrides", {
    method: "POST",
    body: { seriesKey, size },
  })
}

export async function getTrendSources(): Promise<TrendSource[]> {
  const config = await apiRequest<AdminConfigDto>("/api/admin/config")
  if (config.trendSourceSettings && config.trendSourceSettings.length > 0) {
    return config.trendSourceSettings.map(({ source, status, rateLimitMode }) => ({
      id: source.toLowerCase(),
      name: toTitleCase(source),
      status,
      pollingInterval: 60,
      lastPolledAt: new Date().toISOString(),
      rateLimitMode,
    }))
  }
  const sourceStates =
    config.trendSourceStatuses && config.trendSourceStatuses.length > 0
      ? config.trendSourceStatuses
      : config.trendSources.map((source) => ({ source, status: "Active" as const }))
  return sourceStates.map(({ source, status }) => ({
    id: source.toLowerCase(),
    name: toTitleCase(source),
    status,
    pollingInterval: 60,
    lastPolledAt: new Date().toISOString(),
    rateLimitMode: "Standard",
  }))
}

export async function updateTrendSource(id: string, data: Partial<TrendSource>): Promise<TrendSource> {
  const patchBody: {
    status?: "Active" | "Paused"
    rateLimitMode?: "Standard" | "Aggressive" | "Conservative"
  } = {}
  if (data.status) {
    patchBody.status = data.status === "Active" ? "Active" : "Paused"
  }
  if (data.rateLimitMode) {
    patchBody.rateLimitMode = data.rateLimitMode
  }
  const response = await apiRequest<{
    source: string
    status: "Active" | "Paused"
    rateLimitMode: "Standard" | "Aggressive" | "Conservative"
  }>(`/api/admin/trend-sources/${id}`, {
    method: "PATCH",
    body: patchBody,
  })
  return {
    id: response.source.toLowerCase(),
    name: toTitleCase(response.source),
    status: response.status,
    pollingInterval: 60,
    lastPolledAt: new Date().toISOString(),
    rateLimitMode: response.rateLimitMode,
  }
}

export async function testTrendSource(id: string): Promise<{ ok: boolean; detail: string; testedAt: string }> {
  return apiRequest<{ ok: boolean; detail: string; testedAt: string }>(`/api/admin/trend-sources/${id}/test`, {
    method: "POST",
  })
}

export async function getThemes(): Promise<Theme[]> {
  const themes = await apiRequest<ThemeDto[]>("/api/admin/themes")
  return themes.map(mapThemeDtoToUi)
}

export async function createTheme(payload: {
  name: string
  type?: "Trending" | "Pinned"
  description?: string
  active?: boolean
  priority?: number
}): Promise<Theme> {
  const normalized = normalizeThemeName(payload.name)
  const created = await apiRequest<ThemeDto>("/api/admin/themes", {
    method: "POST",
    body: {
      name: normalized,
      type: payload.type ?? "Pinned",
      active: payload.active ?? true,
      description: payload.description,
      priority: payload.priority,
    },
  })
  return mapThemeDtoToUi(created)
}

export async function updateTheme(
  id: string,
  patch: Partial<{
    name: string
    type: "Trending" | "Pinned"
    description: string
    active: boolean
    priority: number
  }>
): Promise<Theme> {
  const body = {
    ...patch,
    name: patch.name !== undefined ? normalizeThemeName(patch.name) : undefined,
  }
  const updated = await apiRequest<ThemeDto>(`/api/admin/themes/${id}`, {
    method: "PATCH",
    body,
  })
  return mapThemeDtoToUi(updated)
}

export async function deleteTheme(id: string): Promise<void> {
  await apiRequest(`/api/admin/themes/${id}`, {
    method: "DELETE",
  })
}

export async function pinTheme(id: string): Promise<Theme> {
  return updateTheme(id, { type: "Pinned", active: true })
}

export async function unpinTheme(id: string): Promise<void> {
  await deleteTheme(id)
}

export async function renameTheme(id: string, nextName: string): Promise<Theme> {
  const normalizedNext = normalizeThemeName(nextName)
  if (!normalizedNext) {
    throw new Error("Theme name is required")
  }
  return updateTheme(id, { name: normalizedNext })
}

export async function getMintQueue(): Promise<NFT[]> {
  const listings = await apiRequest<ListingDto[]>("/api/marketplace/listings")
  return listings
    .filter((item) => item.status === "minted")
    .map(mapListingToNft)
}

export async function retryMint(nftId: string): Promise<{ success: boolean }> {
  await apiRequest("/api/admin/run-cycle", {
    method: "POST",
    body: {},
  })
  void nftId
  return { success: true }
}

export async function runMintCycle(payload?: {
  recipient?: string
  seriesId?: number
  limit?: number
  themeOverride?: string
}): Promise<RunMintCycleResult> {
  return apiRequest<RunMintCycleResult>("/api/admin/run-cycle", {
    method: "POST",
    body: {
      recipient: payload?.recipient,
      seriesId: payload?.seriesId,
      limit: payload?.limit,
      themeOverride: payload?.themeOverride,
    },
  })
}

export async function getAdminMintSeries(max = 30): Promise<{
  mode: "mock" | "chain"
  defaultSeriesId: number
  series: AdminSeriesDto[]
}> {
  return apiRequest<{
    mode: "mock" | "chain"
    defaultSeriesId: number
    series: AdminSeriesDto[]
  }>(`/api/admin/series?max=${max}`)
}

export async function getAdminNFTs(): Promise<NFT[]> {
  const listings = await apiRequest<ListingDto[]>("/api/marketplace/listings")
  return listings.map(mapListingToNft)
}

export async function updateAdminListingThemes(listingId: string, themes: string[]): Promise<NFT> {
  const updated = await apiRequest<ListingDto>(`/api/admin/listings/${listingId}/themes`, {
    method: "PATCH",
    body: { themes },
  })
  return mapListingToNft(updated)
}

export async function getAdminReceipts(): Promise<Receipt[]> {
  const payments = await apiRequest<PaymentLogDto[]>("/api/admin/logs/payments")
  return payments.map((payment) => ({
    id: payment.id,
    listingId: payment.externalRef,
    userId: "wallet",
    amountFiat: payment.amountUsd,
    currency: payment.currency,
    gateway: "Sandbox",
    gatewayStatus: payment.status === "confirmed" ? "Confirmed" : payment.status === "failed" ? "Failed" : "Pending",
    onchainStatus: payment.status === "confirmed" ? "Pending" : payment.status === "failed" ? "Failed" : "Pending",
    createdAt: payment.createdAt,
  }))
}

export async function getAdminPayments(): Promise<AdminPaymentDto[]> {
  return apiRequest<AdminPaymentDto[]>("/api/admin/payments")
}

export async function settleAdminPayment(paymentId: string): Promise<{ txHash?: string; receiptId?: string }> {
  return apiRequest<{ txHash?: string; receiptId?: string }>(`/api/admin/payments/${paymentId}/settle`, {
    method: "POST",
  })
}

export async function getAdminUsers(): Promise<User[]> {
  return apiRequest<AdminUserDto[]>("/api/admin/users")
}

export async function createAdminUser(payload: {
  email: string
  password: string
  displayName: string
  kycStatus?: User["kycStatus"]
  twoFAEnabled?: boolean
  isActive?: boolean
}): Promise<User> {
  return apiRequest<AdminUserDto>("/api/admin/users", {
    method: "POST",
    body: payload,
  })
}

export async function updateUserKyc(userId: string, status: string): Promise<User> {
  return apiRequest<AdminUserDto>(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: {
      kycStatus: status,
    },
  })
}

export async function updateAdminUser(
  userId: string,
  payload: {
    email?: string
    displayName?: string
    kycStatus?: User["kycStatus"]
    twoFAEnabled?: boolean
    isActive?: boolean
    password?: string
  }
): Promise<User> {
  return apiRequest<AdminUserDto>(`/api/admin/users/${userId}`, {
    method: "PATCH",
    body: payload,
  })
}

export async function getApiKeys(): Promise<PartnerKey[]> {
  return apiRequest<PartnerKey[]>("/api/admin/api-keys")
}

export async function updateApiKey(
  id: string,
  payload: {
    label?: string
    permissions?: Array<"BulkPurchase" | "Transfer" | "Relist">
  }
): Promise<PartnerKey> {
  return apiRequest<PartnerKey>(`/api/admin/api-keys/${id}`, {
    method: "PATCH",
    body: payload,
  })
}

export async function createApiKey(label: string, permissions: string[]): Promise<{ key: string; partnerKey: PartnerKey }> {
  return apiRequest<{ key: string; partnerKey: PartnerKey }>("/api/admin/api-keys", {
    method: "POST",
    body: {
      label,
      permissions,
    },
  })
}

export async function revokeApiKey(id: string): Promise<{ success: boolean }> {
  await apiRequest(`/api/admin/api-keys/${id}`, { method: "DELETE" })
  return { success: true }
}

export async function getApiKeyUsage(): Promise<Array<{
  keyId: string
  requests: number
  errors: number
  lastCallAt: string
}>> {
  return apiRequest<Array<{
    keyId: string
    requests: number
    errors: number
    lastCallAt: string
  }>>("/api/admin/api-keys/usage")
}

export async function getAdminListings(): Promise<Listing[]> {
  const nfts = await getAdminNFTs()
  return nfts.map((nft) => ({
    id: nft.id,
    nftId: nft.id,
    priceEth: nft.priceEth,
    priceFiat: nft.priceFiat ?? 0,
    status: nft.status === "Listed" ? "Active" : "Completed",
    createdAt: nft.listedAt,
  }))
}

// ─── Partners ─────────────────────────────────────────────────
export async function getPartnerDocs(): Promise<{ endpoints: { method: string; path: string; description: string; auth: string }[] }> {
  return {
    endpoints: [
      { method: "POST", path: "/api/v1/bulk-purchase", description: "Purchase multiple NFTs in a single transaction", auth: "API Key (Bearer)" },
      { method: "POST", path: "/api/v1/transfer", description: "Transfer NFTs between wallets", auth: "API Key (Bearer)" },
      { method: "POST", path: "/api/v1/relist", description: "Relist NFTs with new pricing", auth: "API Key (Bearer)" },
      { method: "GET", path: "/api/v1/inventory", description: "Get current NFT inventory and availability", auth: "API Key (Bearer)" },
      { method: "GET", path: "/api/v1/receipts", description: "Get purchase receipts and transaction history", auth: "API Key (Bearer)" },
      { method: "POST", path: "/api/v1/webhooks", description: "Configure webhook endpoints for events", auth: "API Key (Bearer)" },
    ],
  }
}

export async function testApiCall(endpoint: string, apiKey: string): Promise<{ status: number; body: object }> {
  const base = getApiBaseUrl()
  const response = await fetch(`${base}${endpoint}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  return {
    status: response.status,
    body: response.ok ? await response.json() : { success: false, message: "Request failed" },
  }
}
