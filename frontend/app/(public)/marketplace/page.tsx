"use client"

import { useCallback, useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { FilterBar, defaultFilters, type FilterState } from "@/components/filter-bar"
import { NFTGrid } from "@/components/nft-grid"
import { PageTransition } from "@/components/page-transition"
import { getMarketplaceFilterOptions, getMarketplaceNFTs } from "@/lib/api"
import type { NFT } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

export default function MarketplacePage() {
  const [nfts, setNfts] = useState<NFT[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<FilterState>(defaultFilters)
  const [filterOptions, setFilterOptions] = useState<{
    themes: string[]
    sources: string[]
    statuses: string[]
  }>({
    themes: [],
    sources: [],
    statuses: []
  })
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 24

  const loadMarketplace = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      const [marketplace, dynamicFilters] = await Promise.all([
        getMarketplaceNFTs({
          search: filters.search || undefined,
          theme: filters.theme && filters.theme !== "all" ? filters.theme : undefined,
          source: filters.source && filters.source !== "all" ? filters.source : undefined,
          status: filters.status && filters.status !== "all" ? filters.status : undefined,
          sort: filters.sort,
          page,
          limit: pageSize
        }),
        getMarketplaceFilterOptions()
      ])
      const { nfts: rows, total: totalCount } = marketplace
      setNfts(rows)
      setTotal(totalCount)
      setFilterOptions(dynamicFilters)
      setError(null)
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to load marketplace"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filters, page])

  useEffect(() => {
    void loadMarketplace(false)
  }, [loadMarketplace])

  useEffect(() => {
    setPage(1)
  }, [filters.theme, filters.source, filters.status, filters.sort, filters.search])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Marketplace</h1>
            <p className="mt-1 text-muted-foreground">{total} NFT(s) available to collect.</p>
          </div>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => void loadMarketplace(true)} disabled={loading || refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <FilterBar filters={filters} onFiltersChange={setFilters} options={filterOptions} className="mb-8" />
        {error && !loading ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" className="mt-4 bg-transparent" onClick={() => void loadMarketplace(true)}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <NFTGrid nfts={nfts} loading={loading} />
            {!loading && totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  className="bg-transparent"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  className="bg-transparent"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={page >= totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </PageTransition>
  )
}
