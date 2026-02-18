"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { RefreshCw, Loader2, Clock, Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { StatusPill } from "@/components/status-pill"
import { PageTransition } from "@/components/page-transition"
import { getTrendSources, testTrendSource, updateTrendSource } from "@/lib/api"
import type { TrendSource } from "@/lib/types"
import { toast } from "sonner"

export default function TrendSourcesPage() {
  const [sources, setSources] = useState<TrendSource[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)

  useEffect(() => {
    getTrendSources()
      .then((data) => {
        setSources(data)
        setLoading(false)
      })
      .catch(() => {
        toast.error("Failed to load trend sources")
        setLoading(false)
      })
  }, [])

  async function handleTest(id: string) {
    try {
      setTesting(id)
      const result = await testTrendSource(id)
      if (result.ok) {
        toast.success(result.detail)
      } else {
        toast.error("Source connectivity test failed")
      }
    } catch {
      toast.error("Failed to run source connectivity test")
    } finally {
      setTesting(null)
    }
  }

  async function handleToggle(id: string, currentStatus: string) {
    try {
      const newStatus = currentStatus === "Active" ? "Paused" : "Active"
      const updated = await updateTrendSource(id, { status: newStatus as TrendSource["status"] })
      setSources((prev) => prev.map((s) => (s.id === id ? { ...s, status: updated.status } : s)))
      toast.success(`Source ${newStatus === "Active" ? "enabled" : "paused"}`)
    } catch {
      toast.error("Failed to update source status")
    }
  }

  async function handleRateLimitChange(id: string, value: TrendSource["rateLimitMode"]) {
    try {
      const updated = await updateTrendSource(id, { rateLimitMode: value })
      setSources((prev) =>
        prev.map((item) => (item.id === id ? { ...item, rateLimitMode: updated.rateLimitMode } : item))
      )
      toast.success("Rate limit mode saved")
    } catch {
      toast.error("Failed to save rate limit mode")
    }
  }

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Trend Sources</h1>
        <p className="text-muted-foreground">Manage data ingestion sources for trend detection</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{[1, 2, 3, 4].map((i) => <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sources.map((source, i) => (
            <motion.div key={source.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Wifi className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-foreground">{source.name}</CardTitle>
                      <p className="text-xs text-muted-foreground font-mono">{source.id}</p>
                    </div>
                  </div>
                  <Switch
                    checked={source.status === "Active"}
                    onCheckedChange={() => handleToggle(source.id, source.status)}
                  />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <StatusPill status={source.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Polling</span>
                    <span className="text-sm text-foreground">{source.pollingInterval}s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Last Polled</span>
                    <span className="text-sm text-foreground">{new Date(source.lastPolledAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Rate Limit</span>
                    <Select
                      value={source.rateLimitMode}
                      onValueChange={(value) => void handleRateLimitChange(source.id, value as TrendSource["rateLimitMode"])}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Aggressive">Aggressive</SelectItem>
                        <SelectItem value="Conservative">Conservative</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" size="sm" className="w-full gap-2 bg-transparent" onClick={() => handleTest(source.id)} disabled={testing === source.id}>
                    {testing === source.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Test Source
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </PageTransition>
  )
}
