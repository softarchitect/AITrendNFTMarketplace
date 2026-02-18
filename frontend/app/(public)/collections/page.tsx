"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowRight, RefreshCw, Search } from "lucide-react"
import { PageTransition } from "@/components/page-transition"
import { PriceTag } from "@/components/price-tag"
import { getCollections } from "@/lib/api"
import type { Collection } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState<"largest" | "floor-low" | "volume-high">("largest")

  const loadCollections = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      const data = await getCollections()
      setCollections(data)
      setError(null)
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to load collections"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadCollections(false)
  }, [loadCollections])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = collections
      .filter((col) => !q || col.name.toLowerCase().includes(q) || col.description.toLowerCase().includes(q))
      .slice()
    rows.sort((a, b) => {
      if (sortBy === "floor-low") return a.floorPrice - b.floorPrice
      if (sortBy === "volume-high") return b.totalVolume - a.totalVolume
      return b.nftCount - a.nftCount
    })
    return rows
  }, [collections, search, sortBy])

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Collections</h1>
            <p className="mt-1 text-muted-foreground">{collections.length} collection(s) available.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search collections..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "largest" | "floor-low" | "volume-high")}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="largest">Largest collections</option>
              <option value="floor-low">Lowest floor price</option>
              <option value="volume-high">Highest volume</option>
            </select>
            <Button variant="outline" className="gap-2 bg-transparent" onClick={() => void loadCollections(true)} disabled={loading || refreshing}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" className="mt-4 bg-transparent" onClick={() => void loadCollections(true)}>
              Retry
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">No collections match your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((col, i) => (
              <motion.div
                key={col.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Link href={`/collection/${col.slug}`}>
                  <div className="group overflow-hidden rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                    <div className="relative h-40 overflow-hidden bg-muted">
                      <Image
                        src={col.imageUrl || "/placeholder.svg"}
                        alt={col.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{col.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{col.description}</p>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <div className="flex gap-4">
                          <div>
                            <span className="text-xs text-muted-foreground">Floor</span>
                            <PriceTag eth={col.floorPrice} size="sm" />
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Items</span>
                            <p className="font-semibold text-foreground">{col.nftCount}</p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
