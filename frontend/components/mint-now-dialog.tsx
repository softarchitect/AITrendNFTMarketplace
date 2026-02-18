"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { getAdminMintSeries, getMintControls, getThemes, runMintCycle, type RunMintCycleResult } from "@/lib/api"
import { toast } from "sonner"

export interface MintCycleRequestPayload {
  recipient?: string
  seriesId?: number
  limit: number
  themeOverride?: string
}

interface MintNowDialogProps {
  onMintRequested?: (payload: MintCycleRequestPayload) => void | Promise<void>
  onMintStarted?: (result: RunMintCycleResult) => void | Promise<void>
}

export function MintNowDialog({ onMintRequested, onMintStarted }: MintNowDialogProps) {
  const MAX_TOPIC_LIMIT = 10
  const [open, setOpen] = useState(false)
  const [mintingNow, setMintingNow] = useState(false)
  const [recipient, setRecipient] = useState("")
  const [seriesId, setSeriesId] = useState("")
  const [themeOverride, setThemeOverride] = useState("")
  const [limit, setLimit] = useState("1")
  const [seriesLoading, setSeriesLoading] = useState(false)
  const [themeLoading, setThemeLoading] = useState(false)
  const [seriesOptions, setSeriesOptions] = useState<Array<{ seriesId: number; remaining: number; maxSupply: number }>>([])
  const [themeOptions, setThemeOptions] = useState<string[]>([])

  useEffect(() => {
    if (!open) return
    let active = true
    const loadSeries = async () => {
      try {
        setSeriesLoading(true)
        setThemeLoading(true)
        const [seriesResult, controlsResult, themesResult] = await Promise.allSettled([
          getAdminMintSeries(),
          getMintControls(),
          getThemes()
        ])
        if (!active) return

        if (controlsResult.status === "fulfilled") {
          const defaultLimit = Math.max(1, Math.min(MAX_TOPIC_LIMIT, controlsResult.value.trendTopicLimit ?? 3))
          setLimit(String(defaultLimit))
        }

        if (seriesResult.status === "fulfilled") {
          const response = seriesResult.value
          setSeriesOptions(response.series)
          if (response.series.length > 0) {
            const preferred = response.series.find((item) => item.seriesId === response.defaultSeriesId) ?? response.series[0]
            setSeriesId((current) => current || String(preferred.seriesId))
          }
        } else {
          setSeriesOptions([])
          toast.error("Could not load on-chain series list. You can still enter a series ID manually.")
        }

        if (themesResult.status === "fulfilled") {
          const selectableThemes = themesResult.value
            .filter((theme) => theme.active)
            .map((theme) => theme.name.trim())
            .filter((name) => name.length > 0)
          const dedupedThemes = Array.from(new Set(selectableThemes))
          setThemeOptions(dedupedThemes)
          // Default to the first active theme so it's available immediately on first open.
          setThemeOverride((current) => current || dedupedThemes[0] || "")
        } else {
          setThemeOptions([])
        }
      } catch {
        if (active) {
          setSeriesOptions([])
          setThemeOptions([])
          toast.error("Failed to load mint setup options")
        }
      } finally {
        if (active) {
          setSeriesLoading(false)
          setThemeLoading(false)
        }
      }
    }
    void loadSeries()
    return () => {
      active = false
    }
  }, [open])

  async function handleMintNow() {
    const parsedLimit = Number(limit)
    if (!Number.isFinite(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_TOPIC_LIMIT) {
      toast.error(`Topic limit must be between 1 and ${MAX_TOPIC_LIMIT}`)
      return
    }

    const parsedSeriesId = seriesId.trim().length > 0 ? Number(seriesId) : undefined
    if (seriesId.trim().length > 0 && (!Number.isFinite(parsedSeriesId) || Number(parsedSeriesId) <= 0)) {
      toast.error("Series ID must be a positive number")
      return
    }

    const payload: MintCycleRequestPayload = {
      recipient: recipient.trim() || undefined,
      seriesId: parsedSeriesId,
      limit: parsedLimit,
      themeOverride: themeOverride.trim() || undefined
    }

    try {
      // Close immediately so admin can watch queue updates while the request is running.
      setOpen(false)
      setRecipient("")
      setSeriesId("")
      setThemeOverride("")
      setLimit("3")
      if (onMintRequested) {
        await onMintRequested(payload)
      }
      setMintingNow(true)
      const result = await runMintCycle(payload)
      if (onMintStarted) {
        await onMintStarted(result)
      }
      toast.success("Mint cycle started successfully")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start mint cycle"
      toast.error(message)
    } finally {
      setMintingNow(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" disabled={mintingNow}>
          <Plus className="h-4 w-4" />
          Mint Now
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create NFT Mint Cycle</DialogTitle>
          <DialogDescription>
            Trigger the backend mint pipeline manually. Leave optional fields blank to use defaults.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="mint-recipient">Recipient Wallet (optional)</Label>
            <Input
              id="mint-recipient"
              placeholder="0x..."
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mint-series-id">Series ID (optional)</Label>
            {seriesLoading ? (
              <Input id="mint-series-id" value="Loading series..." disabled />
            ) : seriesOptions.length > 0 ? (
              <Select value={seriesId} onValueChange={setSeriesId} disabled={mintingNow}>
                <SelectTrigger id="mint-series-id">
                  <SelectValue placeholder="Select series" />
                </SelectTrigger>
                <SelectContent>
                  {seriesOptions.map((item) => (
                    <SelectItem key={item.seriesId} value={String(item.seriesId)}>
                      {`Series #${item.seriesId} (${item.remaining}/${item.maxSupply} left)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="mint-series-id"
                type="number"
                min={1}
                placeholder="1"
                value={seriesId}
                onChange={(event) => setSeriesId(event.target.value)}
                disabled={mintingNow}
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="mint-theme">Theme override (optional)</Label>
            {themeLoading ? (
              <Input id="mint-theme" value="Loading themes..." disabled />
            ) : themeOptions.length > 0 ? (
              <Select
                value={themeOverride || "__auto__"}
                onValueChange={(value) => setThemeOverride(value === "__auto__" ? "" : value)}
                disabled={mintingNow}
              >
                <SelectTrigger id="mint-theme">
                  <SelectValue placeholder="Auto-select from trend pipeline" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__auto__">Auto-select</SelectItem>
                  {themeOptions.map((themeName) => (
                    <SelectItem key={themeName} value={themeName}>
                      {themeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="mint-theme"
                placeholder="Type a theme name (e.g. AI Art)"
                value={themeOverride}
                onChange={(event) => setThemeOverride(event.target.value)}
                disabled={mintingNow}
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="mint-limit">Topic limit (1-10)</Label>
            <Input
              id="mint-limit"
              type="number"
              min={1}
              max={MAX_TOPIC_LIMIT}
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Defaults to the value configured in Admin Settings.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={mintingNow}>
            Cancel
          </Button>
          <Button onClick={() => void handleMintNow()} disabled={mintingNow || seriesLoading || themeLoading}>
            {mintingNow && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start Mint
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
