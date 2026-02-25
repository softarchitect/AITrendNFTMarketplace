"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { RefreshCw, Pause, Play, Eye, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { MintNowDialog } from "@/components/mint-now-dialog"
import { StatusPill } from "@/components/status-pill"
import { PageTransition } from "@/components/page-transition"
import { getAdminOverview, getMintControls, getMintQueue, getSystemStatus, retryMint, type RunMintCycleResult, updateMintControls } from "@/lib/api"
import type { NFT } from "@/lib/types"
import { toast } from "sonner"

export default function MintingQueuePage() {
  const [queue, setQueue] = useState<NFT[]>([])
  const [optimisticQueue, setOptimisticQueue] = useState<NFT[]>([])
  const [loading, setLoading] = useState(true)
  const [pipelineActive, setPipelineActive] = useState(true)
  const [topicLimit, setTopicLimit] = useState<number>(3)
  const [autoMintIntervalMinutes, setAutoMintIntervalMinutes] = useState<number>(15)
  const [autoMintBatchSize, setAutoMintBatchSize] = useState<number>(1)
  const [dailyMinimumTarget, setDailyMinimumTarget] = useState<number>(0)
  const [mintedToday, setMintedToday] = useState<number>(0)
  const [nextAutoMintAt, setNextAutoMintAt] = useState<string | null>(null)
  const [selected, setSelected] = useState<NFT | null>(null)
  const [retrying, setRetrying] = useState<string | null>(null)

  async function refreshQueue() {
    const data = await getMintQueue()
    setQueue(data)
  }

  useEffect(() => {
    Promise.all([getMintQueue(), getMintControls(), getAdminOverview(), getSystemStatus()])
      .then(([data, controls, overview, status]) => {
        setQueue(data)
        setPipelineActive(controls.pipelineEnabled)
        setTopicLimit(controls.trendTopicLimit ?? 3)
        setAutoMintIntervalMinutes(controls.autoMintIntervalMinutes ?? 15)
        setAutoMintBatchSize(controls.autoMintBatchSize ?? 1)
        setDailyMinimumTarget(controls.dailyMinimumTarget ?? 0)
        setMintedToday(overview.mintedToday ?? 0)
        const scheduler = status.find((item) => item.id === "scheduler")
        const nextMint =
          scheduler && typeof scheduler.metadata?.nextAutoMintAt === "string"
            ? scheduler.metadata.nextAutoMintAt
            : null
        setNextAutoMintAt(nextMint)
        setLoading(false)
      })
  }, [])

  async function handleRetry(nftId: string) {
    setRetrying(nftId)
    await retryMint(nftId)
    toast.success("Retry initiated")
    setRetrying(null)
  }

  async function handlePipelineToggle(value: boolean) {
    setPipelineActive(value)
    await updateMintControls({ pipelineEnabled: value })
    toast.info(`Pipeline ${value ? "resumed" : "paused"}`)
  }

  function buildOptimisticQueueItem(result: RunMintCycleResult): NFT {
    const nowIso = new Date().toISOString()
    const tokenId = result.listing?.tokenId ?? result.mint?.tokenId ?? 0
    const source = result.topic?.source ? String(result.topic.source) : "Affordable NFT"
    return {
      id: result.listing?.id ?? `pending-${Date.now()}`,
      tokenId,
      chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111),
      contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "",
      title: tokenId > 0 ? `Affordable NFT #${tokenId}` : "Affordable NFT (Processing)",
      description: "Mint pipeline started by admin.",
      imageUrl: "/placeholder.svg?height=512&width=512&query=trendmint%20processing",
      promptSummary: result.topic?.topic ?? "New trend mint in progress",
      trendSources: [source],
      themes: ["AI Art"],
      mintedAt: nowIso,
      listedAt: nowIso,
      editionSize: 1,
      editionAvailable: 1,
      editionNumber: 1,
      priceEth: 0,
      priceFiat: 0,
      currency: "USD",
      ipfsCid: "",
      traits: [
        { trait_type: "Source", value: source },
        { trait_type: "State", value: "Processing" }
      ],
      status: "Minting",
      creator: "Affordable NFT",
      collectionSlug: "trendmint-default"
    }
  }

  function buildOptimisticQueueItemFromRequest(request: {
    recipient?: string
    seriesId?: number
    limit: number
    themeOverride?: string
  }): NFT {
    const nowIso = new Date().toISOString()
    const seriesLabel = request.seriesId ? `Series #${request.seriesId}` : "Default Series"
    return {
      id: `pending-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tokenId: 0,
      chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111),
      contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "",
      title: "Affordable NFT (Processing)",
      description: "Mint pipeline started by admin.",
      imageUrl: "/placeholder.svg?height=512&width=512&query=trendmint%20processing",
      promptSummary: `Mint request queued (${seriesLabel}, limit ${request.limit}${request.themeOverride ? `, theme ${request.themeOverride}` : ""})`,
      trendSources: ["Admin"],
      themes: ["AI Art"],
      mintedAt: nowIso,
      listedAt: nowIso,
      editionSize: 1,
      editionAvailable: 1,
      editionNumber: 1,
      priceEth: 0,
      priceFiat: 0,
      currency: "USD",
      ipfsCid: "",
      traits: [
        { trait_type: "Source", value: "Admin" },
        { trait_type: "State", value: "Processing" }
      ],
      status: "Minting",
      creator: request.recipient ? `Recipient ${request.recipient.slice(0, 6)}...` : "Affordable NFT",
      collectionSlug: "trendmint-default"
    }
  }

  async function handleMintRequested(request: {
    recipient?: string
    seriesId?: number
    limit: number
    themeOverride?: string
  }) {
    const optimisticItem = buildOptimisticQueueItemFromRequest(request)
    setOptimisticQueue((current) => [optimisticItem, ...current])
    window.setTimeout(() => {
      setOptimisticQueue((current) => current.filter((item) => item.id !== optimisticItem.id))
      void refreshQueue()
    }, 15000)
  }

  async function handleMintStarted(result: RunMintCycleResult) {
    // Reconcile quickly when backend acknowledges the cycle start.
    const optimisticItem = buildOptimisticQueueItem(result)
    setOptimisticQueue((current) => [optimisticItem, ...current.slice(0, 4)])
    window.setTimeout(() => {
      setOptimisticQueue((current) => current.filter((item) => item.id !== optimisticItem.id))
      void refreshQueue()
    }, 12000)
  }

  return (
    <PageTransition>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Minting Queue</h1>
          <p className="text-muted-foreground">Monitor and manage the minting pipeline</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-2.5 py-1 text-xs">
              <span className="text-muted-foreground">Current topic limit</span>
              <span className="font-medium text-foreground">{topicLimit}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-2.5 py-1 text-xs">
              <span className="text-muted-foreground">Auto-mint interval</span>
              <span className="font-medium text-foreground">{autoMintIntervalMinutes} min</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-2.5 py-1 text-xs">
              <span className="text-muted-foreground">Auto-mint quantity</span>
              <span className="font-medium text-foreground">{autoMintBatchSize}/cycle</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-2.5 py-1 text-xs">
              <span className="text-muted-foreground">Daily minimum target</span>
              <span className="font-medium text-foreground">{dailyMinimumTarget > 0 ? dailyMinimumTarget : "off"}</span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-2.5 py-1 text-xs">
              <span className="text-muted-foreground">Today progress</span>
              <span className="font-medium text-foreground">
                {dailyMinimumTarget > 0 ? `${mintedToday}/${dailyMinimumTarget}` : `${mintedToday}/off`}
              </span>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-2.5 py-1 text-xs">
              <span className="text-muted-foreground">Next auto-mint</span>
              <span className="font-medium text-foreground">
                {nextAutoMintAt ? new Date(nextAutoMintAt).toLocaleString() : "n/a"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <MintNowDialog onMintRequested={handleMintRequested} onMintStarted={handleMintStarted} />
          <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
            <span className="text-sm text-muted-foreground">Pipeline</span>
            <Switch checked={pipelineActive} onCheckedChange={(v) => { void handlePipelineToggle(v) }} />
            {pipelineActive ? <Play className="h-3.5 w-3.5 text-[hsl(var(--success))]" /> : <Pause className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : queue.length + optimisticQueue.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-lg font-semibold text-foreground">Queue is empty</h3>
          <p className="mt-1 text-sm text-muted-foreground">All items have been processed</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <span>NFT</span><span>Status</span><span>Edition</span><span>Themes</span><span>Actions</span>
          </div>
          {[...optimisticQueue, ...queue].map((nft, i) => (
            <motion.div
              key={`${nft.id}-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 sm:gap-4 items-center border-b border-border px-4 py-3 hover:bg-muted/30 transition-colors last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <Image
                  src={nft.imageUrl || "/placeholder.svg"}
                  alt={nft.title}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-lg object-cover"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{nft.title}</p>
                  <p className="text-xs text-muted-foreground font-mono">{nft.id}</p>
                </div>
              </div>
              <StatusPill status={nft.status} />
              <span className="text-sm text-muted-foreground">{nft.editionSize} editions</span>
              <div className="flex gap-1">{nft.themes.slice(0, 2).map((t) => <span key={t} className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">{t}</span>)}</div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelected(nft)}>
                  <Eye className="h-3.5 w-3.5" /><span className="sr-only">View details</span>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRetry(nft.id)} disabled={retrying === nft.id}>
                  {retrying === nft.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  <span className="sr-only">Retry</span>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <Card className="border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-foreground">Queue Item Detail</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setSelected(null)}><X className="h-4 w-4" /><span className="sr-only">Close</span></Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative w-full rounded-xl aspect-video overflow-hidden">
                    <Image
                      src={selected.imageUrl || "/placeholder.svg"}
                      alt={selected.title}
                      fill
                      sizes="(max-width: 1024px) 92vw, 640px"
                      className="object-cover"
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Title</span><span className="text-foreground font-medium">{selected.title}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusPill status={selected.status} /></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Sources</span><span className="text-foreground">{selected.trendSources.join(", ")}</span></div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prompt Summary</p>
                    <p className="text-sm text-foreground bg-muted rounded-lg p-3">{selected.promptSummary}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Logs</p>
                    <div className="rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground space-y-1">
                      <p>[INFO] Trend data ingested from {selected.trendSources[0]}</p>
                      <p>[INFO] AI prompt generated successfully</p>
                      <p>[INFO] Image generation started...</p>
                      <p>{selected.status === "Generating" ? "[WAIT] Awaiting AI completion" : "[INFO] Image generated, minting initiated"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
