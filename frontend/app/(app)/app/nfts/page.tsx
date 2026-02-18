"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Grid3X3, List, Search, RefreshCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NFTCard, NFTCardSkeleton } from "@/components/nft-card"
import { PageTransition } from "@/components/page-transition"
import { getUserNFTs } from "@/lib/api"
import { useWallet } from "@/hooks/use-wallet"
import type { NFT } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export default function MyNFTsPage() {
  const [nfts, setNfts] = useState<NFT[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<"grid" | "list">("grid")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "Listed" | "Minting" | "SoldOut">("all")
  const [themeFilter, setThemeFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"newest" | "price-high" | "price-low">("newest")
  const {
    address,
    isConnected,
    isWrongChain,
    isConnecting,
    isSwitchingChain,
    connectMetaMask,
    connectWalletConnect,
    switchToConfiguredChain,
    hasMetaMask,
    hasWalletConnect
  } = useWallet()

  const loadNfts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      const data = await getUserNFTs(address)
      setNfts(data)
      setError(null)
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to load NFTs"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [address])

  useEffect(() => {
    void loadNfts(false)
  }, [loadNfts])

  async function handleConnectWallet() {
    try {
      if (hasMetaMask) {
        await connectMetaMask()
        return
      }
      if (hasWalletConnect) {
        await connectWalletConnect()
        return
      }
      toast.error("No wallet connector is available. Configure MetaMask or WalletConnect.")
    } catch (connectError) {
      const message = connectError instanceof Error ? connectError.message : "Wallet connection failed"
      toast.error(message)
    }
  }

  const allThemes = useMemo(
    () => Array.from(new Set(nfts.flatMap((item) => item.themes))).sort((a, b) => a.localeCompare(b)),
    [nfts]
  )

  const filtered = useMemo(() => {
    const searchValue = search.toLowerCase().trim()
    const rows = nfts
      .filter((n) => {
        const matchesSearch =
          !searchValue ||
          n.title.toLowerCase().includes(searchValue) ||
          n.themes.some((t) => t.toLowerCase().includes(searchValue))
        const matchesStatus = statusFilter === "all" || n.status === statusFilter
        const matchesTheme = themeFilter === "all" || n.themes.includes(themeFilter)
        return matchesSearch && matchesStatus && matchesTheme
      })
      .slice()
    rows.sort((a, b) => {
      if (sortBy === "price-high") return b.priceEth - a.priceEth
      if (sortBy === "price-low") return a.priceEth - b.priceEth
      return new Date(b.mintedAt).getTime() - new Date(a.mintedAt).getTime()
    })
    return rows
  }, [nfts, search, sortBy, statusFilter, themeFilter])

  return (
    <PageTransition>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My NFTs</h1>
          <p className="text-muted-foreground">{nfts.length} items in your collection</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search NFTs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "Listed" | "Minting" | "SoldOut")}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All status</option>
            <option value="Listed">Listed</option>
            <option value="Minting">Minting</option>
            <option value="SoldOut">SoldOut</option>
          </select>
          <select
            value={themeFilter}
            onChange={(e) => setThemeFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All themes</option>
            {allThemes.map((theme) => (
              <option key={theme} value={theme}>{theme}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "newest" | "price-high" | "price-low")}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="newest">Newest</option>
            <option value="price-high">Price: High to low</option>
            <option value="price-low">Price: Low to high</option>
          </select>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => void loadNfts(true)} disabled={loading || refreshing}>
            {refreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          <div className="flex rounded-lg border border-border">
            <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-r-none", view === "grid" && "bg-secondary")} onClick={() => setView("grid")}>
              <Grid3X3 className="h-4 w-4" />
              <span className="sr-only">Grid view</span>
            </Button>
            <Button variant="ghost" size="icon" className={cn("h-9 w-9 rounded-l-none", view === "list" && "bg-secondary")} onClick={() => setView("list")}>
              <List className="h-4 w-4" />
              <span className="sr-only">List view</span>
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => <NFTCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h3 className="text-lg font-semibold text-foreground">Failed to load NFTs</h3>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4 bg-transparent" onClick={() => void loadNfts(true)}>
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <Grid3X3 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No NFTs found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || statusFilter !== "all" || themeFilter !== "all"
              ? "Try different filters or search terms."
              : address
                ? "Start collecting from the marketplace."
                : "Connect your wallet to see owned NFTs."}
          </p>
          {!isConnected && (
            <Button className="mt-4" onClick={() => void handleConnectWallet()} disabled={isConnecting}>
              {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Connect Wallet
            </Button>
          )}
          {isConnected && isWrongChain && (
            <Button variant="outline" className="mt-4 bg-transparent" onClick={() => void switchToConfiguredChain()} disabled={isSwitchingChain}>
              {isSwitchingChain ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Switch to Ethereum
            </Button>
          )}
          <Link href="/marketplace" className="mt-4 text-sm text-primary hover:underline">
            Browse Marketplace
          </Link>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((nft, i) => (
            <motion.div key={nft.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <NFTCard nft={nft} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((nft, i) => (
            <motion.div key={nft.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
              <div className="flex items-center gap-4 rounded-xl border border-border p-3 hover:bg-secondary/50 transition-colors">
                <Image
                  src={nft.imageUrl || "/placeholder.svg"}
                  alt={nft.title}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{nft.title}</p>
                  <p className="text-xs text-muted-foreground">{nft.themes.join(", ")}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">{nft.priceEth} ETH</p>
                  <p className="text-xs text-muted-foreground">${nft.priceFiat}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </PageTransition>
  )
}
