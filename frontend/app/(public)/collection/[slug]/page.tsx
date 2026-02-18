"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { use } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Layers, Coins, TrendingUp, RefreshCw } from "lucide-react"
import { NFTGrid } from "@/components/nft-grid"
import { PageTransition } from "@/components/page-transition"
import { getCollectionBySlug, getCollectionNFTs } from "@/lib/api"
import type { Collection, NFT } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function CollectionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [collection, setCollection] = useState<Collection | null>(null)
  const [nfts, setNfts] = useState<NFT[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<"newest" | "price-high" | "price-low">("newest")

  const loadCollection = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      const [c, n] = await Promise.all([getCollectionBySlug(slug), getCollectionNFTs(slug)])
      setCollection(c || null)
      setNfts(n)
      setError(null)
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to load collection"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [slug])

  useEffect(() => {
    void loadCollection(false)
  }, [loadCollection])

  const sortedNfts = useMemo(() => {
    const rows = nfts.slice()
    rows.sort((a, b) => {
      if (sortBy === "price-high") return b.priceEth - a.priceEth
      if (sortBy === "price-low") return a.priceEth - b.priceEth
      return new Date(b.mintedAt).getTime() - new Date(a.mintedAt).getTime()
    })
    return rows
  }, [nfts, sortBy])

  if (!loading && !collection && !error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <h2 className="text-2xl font-bold text-foreground">Collection Not Found</h2>
        <Link href="/collections" className="mt-4 text-primary hover:underline">Browse Collections</Link>
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <Link href="/collections" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> All Collections
        </Link>

        {error && (
          <div className="mb-6 rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" className="mt-3 bg-transparent" onClick={() => void loadCollection(true)}>
              Retry
            </Button>
          </div>
        )}

        {collection && (
          <>
            {/* Hero */}
            <div className="relative mb-8 overflow-hidden rounded-2xl border border-border">
              <div className="relative h-48 sm:h-64 bg-muted">
                <Image
                  src={collection.imageUrl || "/placeholder.svg"}
                  alt={collection.name}
                  fill
                  sizes="(max-width: 1280px) 100vw, 1280px"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6">
                <h1 className="text-3xl font-bold text-foreground">{collection.name}</h1>
                <p className="mt-1 text-muted-foreground max-w-lg">{collection.description}</p>
                <div className="mt-4 flex gap-6">
                  {[
                    { label: "Items", value: collection.nftCount, icon: Layers },
                    { label: "Floor", value: `${collection.floorPrice} ETH`, icon: Coins },
                    { label: "Volume", value: `${collection.totalVolume} ETH`, icon: TrendingUp },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-1.5 text-sm">
                      <s.icon className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-foreground">{s.value}</span>
                      <span className="text-muted-foreground">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{sortedNfts.length} NFT(s) in this collection</p>
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as "newest" | "price-high" | "price-low")}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="newest">Newest</option>
                  <option value="price-high">Price: High to low</option>
                  <option value="price-low">Price: Low to high</option>
                </select>
                <Button variant="outline" className="gap-2 bg-transparent" onClick={() => void loadCollection(true)} disabled={loading || refreshing}>
                  <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <NFTGrid nfts={sortedNfts} loading={loading} />
          </>
        )}
      </div>
    </PageTransition>
  )
}
