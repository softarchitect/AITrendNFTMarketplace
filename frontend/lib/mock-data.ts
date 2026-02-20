import type {
  NFT, Listing, Receipt, TrendSource, Theme, User, PartnerKey,
  Collection, ActivityEvent, SystemComponent, Drop, AdminOverview,
} from "./types"

// ─── NFTs ─────────────────────────────────────────────────────
export const mockNFTs: NFT[] = [
  {
    id: "nft-001", tokenId: 1001, chainId: 1, contractAddress: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
    title: "Neon Pulse #1", description: "A vibrant exploration of digital consciousness, born from trending conversations about AI sentience.", imageUrl: "https://picsum.photos/seed/nft1/600/600",
    promptSummary: "Neon cityscape with pulsating AI neural networks, cyberpunk aesthetic, trending digital art style",
    trendSources: ["Twitter/X", "Reddit"], themes: ["AI Art", "Cyberpunk"], mintedAt: "2026-02-08T10:30:00Z", listedAt: "2026-02-08T10:35:00Z",
    editionSize: 50, editionAvailable: 32, priceEth: 0.085, priceFiat: 245, currency: "USD",
    ipfsCid: "QmX7b3v9HvNzKqp4TjS5nDx8kEwKjLqp4TjS5nDx8kEwKj", traits: [{ trait_type: "Style", value: "Cyberpunk" }, { trait_type: "Palette", value: "Neon" }, { trait_type: "Mood", value: "Energetic" }, { trait_type: "Complexity", value: "High" }],
    status: "Listed", creator: "TrendMint AI", collectionSlug: "neural-visions",
  },
  {
    id: "nft-002", tokenId: 1002, chainId: 1, contractAddress: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
    title: "Quantum Garden #7", description: "Organic meets digital in this serene garden of quantum particles, inspired by breakthroughs in quantum computing.", imageUrl: "https://picsum.photos/seed/nft2/600/600",
    promptSummary: "Quantum garden with organic particle formations, serene blues and greens, nature meets technology",
    trendSources: ["Reddit", "Aggregator"], themes: ["Science", "Nature"], mintedAt: "2026-02-08T09:15:00Z", listedAt: "2026-02-08T09:20:00Z",
    editionSize: 25, editionAvailable: 18, priceEth: 0.12, priceFiat: 347, currency: "USD",
    ipfsCid: "QmY8c4w0IuOzLrq5UkT6oDy9lFxLrq5UkT6oDy9lFxLrq5", traits: [{ trait_type: "Style", value: "Organic Tech" }, { trait_type: "Palette", value: "Cool" }, { trait_type: "Mood", value: "Serene" }, { trait_type: "Complexity", value: "Medium" }],
    status: "Listed", creator: "TrendMint AI", collectionSlug: "quantum-nature",
  },
  {
    id: "nft-003", tokenId: 1003, chainId: 1, contractAddress: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
    title: "Solar Flare Protocol", description: "Dramatic solar eruptions reimagined as blockchain protocols, trending after the recent solar maximum.", imageUrl: "https://picsum.photos/seed/nft3/600/600",
    promptSummary: "Solar flare explosion with data streams, golden and crimson tones, dramatic celestial blockchain",
    trendSources: ["Twitter/X", "Instagram"], themes: ["Space", "Blockchain"], mintedAt: "2026-02-07T14:00:00Z", listedAt: "2026-02-07T14:10:00Z",
    editionSize: 100, editionAvailable: 67, priceEth: 0.045, priceFiat: 130, currency: "USD",
    ipfsCid: "QmZ9d5x1JvPaMsq6VlU7pEz0mGzMsq6VlU7pEz0mGzMsq6", traits: [{ trait_type: "Style", value: "Celestial" }, { trait_type: "Palette", value: "Warm" }, { trait_type: "Mood", value: "Dramatic" }, { trait_type: "Complexity", value: "High" }],
    status: "Listed", creator: "TrendMint AI", collectionSlug: "cosmic-chain",
  },
  {
    id: "nft-004", tokenId: 1004, chainId: 1, contractAddress: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
    title: "Urban Decay Remix", description: "Street art culture meets machine learning in this gritty urban interpretation of trending graffiti styles.", imageUrl: "https://picsum.photos/seed/nft4/600/600",
    promptSummary: "Urban graffiti reimagined by AI, gritty textures, bold colors on concrete, street art evolution",
    trendSources: ["Instagram", "Twitter/X"], themes: ["Street Art", "Culture"], mintedAt: "2026-02-07T11:30:00Z", listedAt: "2026-02-07T11:40:00Z",
    editionSize: 75, editionAvailable: 44, priceEth: 0.065, priceFiat: 188, currency: "USD",
    ipfsCid: "QmA0e6y2KwQbNtq7WmV8qFa1nHtq7WmV8qFa1nHtq7WmV8", traits: [{ trait_type: "Style", value: "Street Art" }, { trait_type: "Palette", value: "Bold" }, { trait_type: "Mood", value: "Rebellious" }, { trait_type: "Complexity", value: "Medium" }],
    status: "Listed", creator: "TrendMint AI", collectionSlug: "street-machine",
  },
  {
    id: "nft-005", tokenId: 1005, chainId: 1, contractAddress: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
    title: "Deep Ocean Genesis", description: "Bioluminescent deep-sea creatures as imagined by AI, trending after new species discovery.", imageUrl: "https://picsum.photos/seed/nft5/600/600",
    promptSummary: "Bioluminescent deep sea creatures, dark ocean with glowing organisms, ethereal underwater world",
    trendSources: ["Reddit", "Aggregator"], themes: ["Nature", "Science"], mintedAt: "2026-02-06T16:45:00Z", listedAt: "2026-02-06T16:50:00Z",
    editionSize: 30, editionAvailable: 12, priceEth: 0.15, priceFiat: 434, currency: "USD",
    ipfsCid: "QmB1f7z3LxRcOuq8XnW9rGb2oIuq8XnW9rGb2oIuq8XnW9", traits: [{ trait_type: "Style", value: "Bioluminescent" }, { trait_type: "Palette", value: "Deep Blue" }, { trait_type: "Mood", value: "Mysterious" }, { trait_type: "Complexity", value: "Very High" }],
    status: "Listed", creator: "TrendMint AI", collectionSlug: "quantum-nature",
  },
  {
    id: "nft-006", tokenId: 1006, chainId: 1, contractAddress: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
    title: "Retro Synth Wave", description: "80s synthwave aesthetics powered by modern AI generation, riding the retro-futurism trend.", imageUrl: "https://picsum.photos/seed/nft6/600/600",
    promptSummary: "Retro synthwave sunset with chrome text and neon grids, 80s nostalgia meets futurism",
    trendSources: ["Twitter/X", "Reddit"], themes: ["Retro", "Music"], mintedAt: "2026-02-06T08:00:00Z", listedAt: "2026-02-06T08:10:00Z",
    editionSize: 200, editionAvailable: 145, priceEth: 0.025, priceFiat: 72, currency: "USD",
    ipfsCid: "QmC2g8A4MzSdPvr9YoX0sHc3pJvr9YoX0sHc3pJvr9YoX0", traits: [{ trait_type: "Style", value: "Synthwave" }, { trait_type: "Palette", value: "Neon Retro" }, { trait_type: "Mood", value: "Nostalgic" }, { trait_type: "Complexity", value: "Low" }],
    status: "Listed", creator: "TrendMint AI", collectionSlug: "retro-future",
  },
  {
    id: "nft-007", tokenId: 1007, chainId: 1, contractAddress: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
    title: "Fractal Mind #12", description: "Infinite fractal patterns representing the complexity of human thought, generated from neuroscience trends.", imageUrl: "https://picsum.photos/seed/nft7/600/600",
    promptSummary: "Fractal patterns of human neural pathways, infinite zoom, blue-purple tones, consciousness visualization",
    trendSources: ["Aggregator"], themes: ["AI Art", "Science"], mintedAt: "2026-02-05T19:20:00Z", listedAt: "2026-02-05T19:30:00Z",
    editionSize: 10, editionAvailable: 3, priceEth: 0.35, priceFiat: 1012, currency: "USD",
    ipfsCid: "QmD3h9B5NaTePwq0ZpY1tId4qPwq0ZpY1tId4qPwq0ZpY1", traits: [{ trait_type: "Style", value: "Fractal" }, { trait_type: "Palette", value: "Cool Spectrum" }, { trait_type: "Mood", value: "Contemplative" }, { trait_type: "Complexity", value: "Very High" }],
    status: "Listed", creator: "TrendMint AI", collectionSlug: "neural-visions",
  },
  {
    id: "nft-008", tokenId: 1008, chainId: 1, contractAddress: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
    title: "Tokyo Drift Protocol", description: "Japanese street racing culture fused with blockchain technology, trending from a viral meme.", imageUrl: "https://picsum.photos/seed/nft8/600/600",
    promptSummary: "Japanese drift car in neon-lit Tokyo streets, blockchain data trails, anime-inspired",
    trendSources: ["Twitter/X", "Reddit", "Instagram"], themes: ["Culture", "Automotive"], mintedAt: "2026-02-05T07:00:00Z", listedAt: "2026-02-05T07:15:00Z",
    editionSize: 50, editionAvailable: 0, priceEth: 0.095, priceFiat: 275, currency: "USD",
    ipfsCid: "QmE4i0C6ObUfQxq1AqZ2uJe5rQxq1AqZ2uJe5rQxq1AqZ2", traits: [{ trait_type: "Style", value: "Anime Tech" }, { trait_type: "Palette", value: "Neon Tokyo" }, { trait_type: "Mood", value: "Fast" }, { trait_type: "Complexity", value: "High" }],
    status: "SoldOut", creator: "TrendMint AI", collectionSlug: "street-machine",
  },
  {
    id: "nft-009", tokenId: 0, chainId: 1, contractAddress: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
    title: "Aurora Borealis v2", description: "AI-generated northern lights with parametric distortion, currently minting.", imageUrl: "https://picsum.photos/seed/nft9/600/600",
    promptSummary: "Northern lights with parametric glitch effects, arctic landscape, vivid greens and purples",
    trendSources: ["Aggregator", "Reddit"], themes: ["Nature", "Generative"], mintedAt: "", listedAt: "",
    editionSize: 40, editionAvailable: 40, priceEth: 0.075, priceFiat: 217, currency: "USD",
    ipfsCid: "", traits: [{ trait_type: "Style", value: "Generative" }, { trait_type: "Palette", value: "Aurora" }, { trait_type: "Mood", value: "Awe" }, { trait_type: "Complexity", value: "High" }],
    status: "Minting", creator: "TrendMint AI", collectionSlug: "quantum-nature",
  },
  {
    id: "nft-010", tokenId: 0, chainId: 1, contractAddress: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
    title: "Algorithmic Baroque", description: "Classical baroque painting style reimagined through generative algorithms, currently being generated.", imageUrl: "https://picsum.photos/seed/nft10/600/600",
    promptSummary: "Baroque painting with algorithmic distortions, gold and deep red, classical meets digital",
    trendSources: ["Twitter/X"], themes: ["Classic Art", "AI Art"], mintedAt: "", listedAt: "",
    editionSize: 15, editionAvailable: 15, priceEth: 0.2, priceFiat: 578, currency: "USD",
    ipfsCid: "", traits: [{ trait_type: "Style", value: "Neo-Baroque" }, { trait_type: "Palette", value: "Gold & Crimson" }, { trait_type: "Mood", value: "Grand" }, { trait_type: "Complexity", value: "Very High" }],
    status: "Generating", creator: "TrendMint AI", collectionSlug: "neural-visions",
  },
  {
    id: "nft-011", tokenId: 1009, chainId: 1, contractAddress: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
    title: "Pixel Storm #3", description: "A chaotic pixel storm capturing the intensity of viral internet moments.", imageUrl: "https://picsum.photos/seed/nft11/600/600",
    promptSummary: "Pixel art storm vortex, vibrant 8-bit colors, digital chaos energy",
    trendSources: ["Twitter/X", "Reddit"], themes: ["Pixel Art", "Internet Culture"], mintedAt: "2026-02-04T12:00:00Z", listedAt: "2026-02-04T12:10:00Z",
    editionSize: 150, editionAvailable: 98, priceEth: 0.035, priceFiat: 101, currency: "USD",
    ipfsCid: "QmF5j1D7PcVgRyr2BrA3vKf6sRyr2BrA3vKf6sRyr2BrA3", traits: [{ trait_type: "Style", value: "Pixel Art" }, { trait_type: "Palette", value: "Vibrant" }, { trait_type: "Mood", value: "Chaotic" }, { trait_type: "Complexity", value: "Low" }],
    status: "Listed", creator: "TrendMint AI", collectionSlug: "retro-future",
  },
  {
    id: "nft-012", tokenId: 1010, chainId: 1, contractAddress: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef12",
    title: "Zen Circuit Board", description: "Japanese zen garden principles applied to circuit board layouts, a meditation on technology.", imageUrl: "https://picsum.photos/seed/nft12/600/600",
    promptSummary: "Zen garden with circuit board patterns, minimalist, sand and copper tones, peaceful technology",
    trendSources: ["Aggregator"], themes: ["Minimalism", "Technology"], mintedAt: "2026-02-03T20:00:00Z", listedAt: "2026-02-03T20:15:00Z",
    editionSize: 20, editionAvailable: 8, priceEth: 0.18, priceFiat: 520, currency: "USD",
    ipfsCid: "QmG6k2E8QdWhSzs3CsB4wLg7tSzs3CsB4wLg7tSzs3CsB4", traits: [{ trait_type: "Style", value: "Zen Tech" }, { trait_type: "Palette", value: "Earth & Copper" }, { trait_type: "Mood", value: "Peaceful" }, { trait_type: "Complexity", value: "Medium" }],
    status: "Listed", creator: "TrendMint AI", collectionSlug: "neural-visions",
  },
]

// ─── Collections ──────────────────────────────────────────────
export const mockCollections: Collection[] = [
  { slug: "neural-visions", name: "Neural Visions", description: "AI-generated art exploring the intersection of artificial intelligence and human consciousness.", imageUrl: "https://picsum.photos/seed/col1/800/400", nftCount: 48, floorPrice: 0.085, totalVolume: 12.5 },
  { slug: "quantum-nature", name: "Quantum Nature", description: "Where quantum physics meets the natural world, rendered through cutting-edge AI models.", imageUrl: "https://picsum.photos/seed/col2/800/400", nftCount: 32, floorPrice: 0.12, totalVolume: 8.7 },
  { slug: "cosmic-chain", name: "Cosmic Chain", description: "Celestial phenomena reimagined as blockchain protocols and decentralized networks.", imageUrl: "https://picsum.photos/seed/col3/800/400", nftCount: 24, floorPrice: 0.045, totalVolume: 5.3 },
  { slug: "street-machine", name: "Street Machine", description: "Urban culture and street art evolved through machine learning algorithms.", imageUrl: "https://picsum.photos/seed/col4/800/400", nftCount: 56, floorPrice: 0.065, totalVolume: 15.2 },
  { slug: "retro-future", name: "Retro Future", description: "Nostalgia-driven futurism blending 80s aesthetics with modern generative art.", imageUrl: "https://picsum.photos/seed/col5/800/400", nftCount: 40, floorPrice: 0.025, totalVolume: 3.8 },
]

// ─── Listings ─────────────────────────────────────────────────
export const mockListings: Listing[] = [
  { id: "lst-001", nftId: "nft-001", priceEth: 0.085, priceFiat: 245, status: "Active", createdAt: "2026-02-08T10:35:00Z" },
  { id: "lst-002", nftId: "nft-002", priceEth: 0.12, priceFiat: 347, status: "Active", createdAt: "2026-02-08T09:20:00Z" },
  { id: "lst-003", nftId: "nft-003", priceEth: 0.045, priceFiat: 130, status: "Completed", createdAt: "2026-02-07T14:10:00Z" },
  { id: "lst-004", nftId: "nft-004", priceEth: 0.065, priceFiat: 188, status: "PendingPayment", createdAt: "2026-02-07T11:40:00Z" },
  { id: "lst-005", nftId: "nft-005", priceEth: 0.15, priceFiat: 434, status: "PendingTransfer", createdAt: "2026-02-06T16:50:00Z" },
]

// ─── Receipts ─────────────────────────────────────────────────
export const mockReceipts: Receipt[] = [
  { id: "rct-001", listingId: "lst-003", userId: "usr-001", amountFiat: 130, currency: "USD", gateway: "Wert", gatewayStatus: "Confirmed", onchainStatus: "Complete", txHash: "0xabc123def456789012345678901234567890abcdef12345678901234567890ab", createdAt: "2026-02-07T14:15:00Z" },
  { id: "rct-002", listingId: "lst-004", userId: "usr-001", amountFiat: 188, currency: "USD", gateway: "Vellis", gatewayStatus: "Processing", onchainStatus: "Pending", createdAt: "2026-02-07T12:00:00Z" },
  { id: "rct-003", listingId: "lst-005", userId: "usr-002", amountFiat: 434, currency: "USD", gateway: "Wert", gatewayStatus: "Confirmed", onchainStatus: "Transferring", txHash: "0xdef789abc012345678901234567890abcdef1234567890abcdef1234567890cd", createdAt: "2026-02-06T17:00:00Z" },
]

// ─── Trend Sources ────────────────────────────────────────────
export const mockTrendSources: TrendSource[] = [
  { id: "ts-001", name: "Twitter/X", status: "Active", pollingInterval: 60, lastPolledAt: "2026-02-09T12:00:00Z", rateLimitMode: "Standard" },
  { id: "ts-002", name: "Reddit", status: "Active", pollingInterval: 120, lastPolledAt: "2026-02-09T11:58:00Z", rateLimitMode: "Conservative" },
  { id: "ts-003", name: "Instagram", status: "Paused", pollingInterval: 300, lastPolledAt: "2026-02-09T10:00:00Z", rateLimitMode: "Standard" },
  { id: "ts-004", name: "Aggregator", status: "Active", pollingInterval: 180, lastPolledAt: "2026-02-09T11:55:00Z", rateLimitMode: "Aggressive" },
]

// ─── Themes ───────────────────────────────────────────────────
export const mockThemes: Theme[] = [
  { id: "th-001", name: "AI Art", type: "Trending", description: "Art generated by and about artificial intelligence", active: true, priority: 1 },
  { id: "th-002", name: "Cyberpunk", type: "Trending", description: "Futuristic dystopian cyberpunk aesthetics", active: true, priority: 2 },
  { id: "th-003", name: "Nature", type: "Trending", description: "Natural world and environmental themes", active: true, priority: 3 },
  { id: "th-004", name: "Space", type: "Pinned", description: "Cosmic and celestial commissioned series", active: true, priority: 1 },
  { id: "th-005", name: "Street Art", type: "Pinned", description: "Urban street art commissioned collection", active: true, priority: 2 },
  { id: "th-006", name: "Retro", type: "Trending", description: "Retro and vintage aesthetics reimagined", active: true, priority: 4 },
  { id: "th-007", name: "Minimalism", type: "Pinned", description: "Clean minimalist commissioned pieces", active: false, priority: 3 },
  { id: "th-008", name: "Science", type: "Trending", description: "Scientific discoveries and phenomena", active: true, priority: 5 },
]

// ─── Users ────────────────────────────────────────────────────
export const mockUsers: User[] = [
  { id: "usr-001", email: "alice@example.com", displayName: "Alice Chen", role: "User", kycStatus: "Verified", twoFAEnabled: true, walletAddresses: ["0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38"] },
  { id: "usr-002", email: "bob@example.com", displayName: "Bob Martinez", role: "User", kycStatus: "Pending", twoFAEnabled: false, walletAddresses: ["0x853e46Dd7745D1643A36c944Cd0f8696g3cE49"] },
  { id: "usr-003", email: "admin@trendmint.io", displayName: "System Admin", role: "Admin", kycStatus: "Verified", twoFAEnabled: true, walletAddresses: [] },
  { id: "usr-004", email: "partner@gallery.com", displayName: "Gallery Partner", role: "Partner", kycStatus: "Verified", twoFAEnabled: true, walletAddresses: ["0x964f57Ee8856E2754B47d055De1g9787h4dF50"] },
  { id: "usr-005", email: "carol@example.com", displayName: "Carol Davis", role: "User", kycStatus: "NotStarted", twoFAEnabled: false, walletAddresses: [] },
]

// ─── Partner Keys ─────────────────────────────────────────────
export const mockPartnerKeys: PartnerKey[] = [
  { id: "pk-001", label: "Gallery Production", keyPrefix: "pk_live_7x9k", createdAt: "2026-01-15T10:00:00Z", lastUsedAt: "2026-02-09T08:30:00Z", permissions: ["BulkPurchase", "Transfer", "Relist"] },
  { id: "pk-002", label: "Gallery Staging", keyPrefix: "pk_test_3m2n", createdAt: "2026-01-20T14:00:00Z", lastUsedAt: "2026-02-08T16:45:00Z", permissions: ["BulkPurchase", "Transfer"] },
]

// ─── Activity Events ──────────────────────────────────────────
export const mockActivityEvents: ActivityEvent[] = [
  { id: "act-001", type: "Purchase", nftTitle: "Solar Flare Protocol", nftImageUrl: "https://picsum.photos/seed/nft3/600/600", amount: 0.045, timestamp: "2026-02-07T14:15:00Z", txHash: "0xabc123" },
  { id: "act-002", type: "Listing", nftTitle: "Neon Pulse #1", nftImageUrl: "https://picsum.photos/seed/nft1/600/600", amount: 0.085, timestamp: "2026-02-08T10:35:00Z" },
  { id: "act-003", type: "Mint", nftTitle: "Quantum Garden #7", nftImageUrl: "https://picsum.photos/seed/nft2/600/600", timestamp: "2026-02-08T09:15:00Z" },
  { id: "act-004", type: "Transfer", nftTitle: "Deep Ocean Genesis", nftImageUrl: "https://picsum.photos/seed/nft5/600/600", timestamp: "2026-02-06T17:30:00Z", txHash: "0xdef789" },
  { id: "act-005", type: "Purchase", nftTitle: "Urban Decay Remix", nftImageUrl: "https://picsum.photos/seed/nft4/600/600", amount: 0.065, timestamp: "2026-02-07T12:00:00Z" },
]

// ─── System Components ────────────────────────────────────────
export const mockSystemComponents: SystemComponent[] = [
  { id: "sc-001", name: "Trend Ingestion", status: "Operational", lastChecked: "2026-02-09T12:00:00Z" },
  { id: "sc-002", name: "AI Generator", status: "Operational", lastChecked: "2026-02-09T12:00:00Z" },
  { id: "sc-003", name: "Minting Service", status: "Operational", lastChecked: "2026-02-09T12:00:00Z" },
  { id: "sc-004", name: "IPFS Pinning", status: "Degraded", lastIncident: "Slower pin times observed", lastChecked: "2026-02-09T11:55:00Z" },
  { id: "sc-005", name: "Payment Gateway", status: "Operational", lastChecked: "2026-02-09T12:00:00Z" },
]

// ─── Drops ────────────────────────────────────────────────────
export const mockDrops: Drop[] = [
  { id: "drop-001", nftId: "nft-001", title: "Neon Pulse #1", imageUrl: "https://picsum.photos/seed/nft1/600/600", mintedAt: "2026-02-08T10:30:00Z", priceEth: 0.085, editionSize: 50, themes: ["AI Art", "Cyberpunk"] },
  { id: "drop-002", nftId: "nft-002", title: "Quantum Garden #7", imageUrl: "https://picsum.photos/seed/nft2/600/600", mintedAt: "2026-02-08T09:15:00Z", priceEth: 0.12, editionSize: 25, themes: ["Science", "Nature"] },
  { id: "drop-003", nftId: "nft-003", title: "Solar Flare Protocol", imageUrl: "https://picsum.photos/seed/nft3/600/600", mintedAt: "2026-02-07T14:00:00Z", priceEth: 0.045, editionSize: 100, themes: ["Space", "Blockchain"] },
  { id: "drop-004", nftId: "nft-004", title: "Urban Decay Remix", imageUrl: "https://picsum.photos/seed/nft4/600/600", mintedAt: "2026-02-07T11:30:00Z", priceEth: 0.065, editionSize: 75, themes: ["Street Art", "Culture"] },
  { id: "drop-005", nftId: "nft-005", title: "Deep Ocean Genesis", imageUrl: "https://picsum.photos/seed/nft5/600/600", mintedAt: "2026-02-06T16:45:00Z", priceEth: 0.15, editionSize: 30, themes: ["Nature", "Science"] },
]

// ─── Admin Overview ───────────────────────────────────────────
export const mockAdminOverview: AdminOverview = {
  mintedToday: 12,
  queued: 8,
  listed: 156,
  failed: 2,
  totalRevenue: 45.8,
  activeUsers: 342,
}

// ─── FAQ Data ─────────────────────────────────────────────────
export const mockFAQs = [
  { q: "What is Affordable NFT?", a: "Affordable NFT is an AI-powered NFT marketplace that automatically detects trending topics across social media, generates unique digital artwork using AI, and mints them as ERC-721 NFTs on Ethereum." },
  { q: "How are the artworks created?", a: "Our automated pipeline monitors trending conversations on Twitter/X, Reddit, Instagram, and aggregator feeds. When a significant trend is detected, our AI generates unique artwork inspired by that trend, which is then minted on-chain and listed for sale." },
  { q: "What are editions?", a: "Each NFT can have multiple copies (editions). For example, a popular piece might have 50 editions. Each edition is individually numbered and tracked on the blockchain." },
  { q: "How do I purchase an NFT?", a: "Connect your wallet (MetaMask or WalletConnect), browse the marketplace, select an NFT, and click Buy. You can pay with fiat currency through our payment gateway or directly with crypto." },
  { q: "What blockchain are the NFTs on?", a: "All Affordable NFT NFTs are ERC-721 tokens minted on the Ethereum mainnet. Each has a unique token ID and is backed by metadata stored on IPFS." },
  { q: "Do I need KYC verification?", a: "KYC verification is required for fiat purchases and certain transaction thresholds. You can complete KYC through our streamlined verification process in your account settings." },
  { q: "What is 2FA and do I need it?", a: "Two-factor authentication (2FA) adds an extra layer of security to your account. While not mandatory, we strongly recommend enabling it to protect your assets." },
  { q: "Can I resell my NFTs?", a: "Yes! Once you own an NFT, you can relist it on the Affordable NFT marketplace or transfer it to any Ethereum-compatible wallet." },
]
