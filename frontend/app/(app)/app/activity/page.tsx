"use client"

import React from "react"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { ShoppingCart, ArrowRightLeft, Tag, Coins, Trash2, ExternalLink, Search, Download, RefreshCw } from "lucide-react"
import { PageTransition } from "@/components/page-transition"
import { getUserActivity } from "@/lib/api"
import { useWallet } from "@/hooks/use-wallet"
import type { ActivityEvent } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const typeIcons: Record<string, React.ElementType> = {
  Purchase: ShoppingCart,
  Transfer: ArrowRightLeft,
  Listing: Tag,
  Mint: Coins,
  Delist: Trash2,
}

const typeColors: Record<string, string> = {
  Purchase: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  Transfer: "bg-primary/10 text-primary",
  Listing: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]",
  Mint: "bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]",
  Delist: "bg-destructive/10 text-destructive",
}

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | "Purchase" | "Transfer" | "Listing" | "Mint" | "Delist">("all")
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest")
  const { address } = useWallet()
  const txExplorerBaseUrl = useMemo(() => {
    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111)
    if (chainId === 11155111) return "https://sepolia.etherscan.io/tx/"
    if (chainId === 1) return "https://etherscan.io/tx/"
    return "https://sepolia.etherscan.io/tx/"
  }, [])

  const loadActivity = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      const data = await getUserActivity(address)
      setEvents(data)
      setError(null)
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to load activity"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [address])

  useEffect(() => {
    void loadActivity(false)
  }, [loadActivity])

  const filteredEvents = useMemo(() => {
    const searchValue = search.trim().toLowerCase()
    const rows = events.filter((event) => {
      const matchesSearch =
        !searchValue ||
        event.nftTitle.toLowerCase().includes(searchValue) ||
        event.type.toLowerCase().includes(searchValue) ||
        (event.txHash ?? "").toLowerCase().includes(searchValue)
      const matchesType = typeFilter === "all" || event.type === typeFilter
      return matchesSearch && matchesType
    })
    rows.sort((a, b) => {
      const left = new Date(a.timestamp).getTime()
      const right = new Date(b.timestamp).getTime()
      return sortBy === "newest" ? right - left : left - right
    })
    return rows
  }, [events, search, typeFilter, sortBy])

  function handleExportCsv() {
    const header = ["event_id", "type", "nft_title", "amount_eth", "timestamp", "tx_hash"]
    const rows = filteredEvents.map((event) => [
      event.id,
      event.type,
      event.nftTitle,
      event.amount?.toString() ?? "",
      event.timestamp,
      event.txHash ?? ""
    ])
    const csv = [header, ...rows]
      .map((line) => line.map((value) => `"${String(value).replaceAll("\"", "\"\"")}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `activity-${Date.now()}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <PageTransition>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Activity</h1>
          <p className="text-muted-foreground">{events.length} total account event(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search activity..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as "all" | "Purchase" | "Transfer" | "Listing" | "Mint" | "Delist")}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All types</option>
            <option value="Purchase">Purchase</option>
            <option value="Transfer">Transfer</option>
            <option value="Listing">Listing</option>
            <option value="Mint">Mint</option>
            <option value="Delist">Delist</option>
          </select>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "newest" | "oldest")}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => void loadActivity(true)} disabled={loading || refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={handleExportCsv} disabled={filteredEvents.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-lg font-semibold text-foreground">Could not load activity</h3>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4 bg-transparent" onClick={() => void loadActivity(true)}>
            Retry
          </Button>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-lg font-semibold text-foreground">No activity found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || typeFilter !== "all"
              ? "Try changing your filters."
              : address
                ? "Your activity will appear here as you interact with Affordable NFT."
                : "Connect your wallet to load account activity."}
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {filteredEvents.map((event, i) => {
              const Icon = typeIcons[event.type] || ShoppingCart
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative flex gap-4 pl-2"
                >
                  <div className={cn("relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", typeColors[event.type])}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-card p-3 min-w-0">
                    <Image
                      src={event.nftImageUrl || "/placeholder.svg"}
                      alt={event.nftTitle}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-lg object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{event.nftTitle}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.type}
                        {event.amount ? ` - ${event.amount} ETH` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleDateString()}
                      </span>
                      {event.txHash && (
                        <a
                          href={`${txExplorerBaseUrl}${event.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-primary"
                          aria-label="View transaction on explorer"
                        >
                          <ExternalLink className="h-3 w-3 cursor-pointer" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </PageTransition>
  )
}
