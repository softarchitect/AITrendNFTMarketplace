"use client"

import React from "react"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, AlertTriangle, XCircle, Wrench, Clock, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageTransition } from "@/components/page-transition"
import { getAuditLogs, getSystemStatus, getWebhookLogs } from "@/lib/api"
import type { SystemComponent } from "@/lib/types"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const statusIcons: Record<string, React.ElementType> = {
  Operational: CheckCircle2,
  Degraded: AlertTriangle,
  Down: XCircle,
  Maintenance: Wrench,
}

const statusColors: Record<string, string> = {
  Operational: "text-[hsl(var(--success))]",
  Degraded: "text-[hsl(var(--warning))]",
  Down: "text-destructive",
  Maintenance: "text-primary",
}

export default function AdminSystemStatusPage() {
  const [components, setComponents] = useState<SystemComponent[]>([])
  const [incidents, setIncidents] = useState<
    Array<{ id: string; date: string; title: string; desc: string; severity: "major" | "minor" | "info" }>
  >([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null)
  const [nowTs, setNowTs] = useState(() => Date.now())

  const loadStatus = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    }
    try {
      const [data, webhooks, audits] = await Promise.all([getSystemStatus(), getWebhookLogs(), getAuditLogs()])
      setComponents(data)
      const webhookIncidents: Array<{ id: string; date: string; title: string; desc: string; severity: "major" | "minor" | "info" }> = webhooks.slice(0, 4).map((item) => ({
        id: item.id,
        date: new Date(item.createdAt).toLocaleDateString(),
        title: `Webhook ${item.status}`,
        desc: item.reason ?? `Ref: ${item.externalRef ?? "-"}`,
        severity: item.status === "rejected" ? "major" : "info"
      }))
      const auditIncidents: Array<{ id: string; date: string; title: string; desc: string; severity: "major" | "minor" | "info" }> = audits.slice(0, 6).map((item) => ({
        id: item.id,
        date: new Date(item.createdAt).toLocaleDateString(),
        title: item.action,
        desc: `Actor: ${item.actor}`,
        severity:
          item.action.includes("failed") || item.action.includes("blocked")
            ? "major"
            : item.action.includes("updated") || item.action.includes("created")
              ? "info"
              : "minor"
      }))
      const merged = [...webhookIncidents, ...auditIncidents]
      setIncidents(merged.slice(0, 8))
      setLastRefreshedAt(Date.now())
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load system status"
      toast.error(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus(false)
    const timer = window.setInterval(() => {
      void loadStatus(true)
    }, 30000)
    return () => window.clearInterval(timer)
  }, [loadStatus])

  useEffect(() => {
    const ticker = window.setInterval(() => {
      setNowTs(Date.now())
    }, 1000)
    return () => window.clearInterval(ticker)
  }, [])

  const allOperational = components.length > 0 && components.every((c) => c.status === "Operational")

  function formatSinceRefresh(): string {
    if (!lastRefreshedAt) return "Not refreshed yet"
    const elapsedSeconds = Math.max(0, Math.floor((nowTs - lastRefreshedAt) / 1000))
    if (elapsedSeconds < 60) {
      return `${elapsedSeconds}s ago`
    }
    const minutes = Math.floor(elapsedSeconds / 60)
    const seconds = elapsedSeconds % 60
    return `${minutes}m ${seconds}s ago`
  }

  return (
    <PageTransition>
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">System Status</h1>
            <p className="text-muted-foreground">Detailed system health monitoring and incident log</p>
            <p className="text-xs text-muted-foreground mt-1">Last refreshed: {formatSinceRefresh()}</p>
          </div>
          <Button
            variant="outline"
            className="gap-2 bg-transparent"
            onClick={() => void loadStatus(true)}
            disabled={loading || refreshing}
          >
            {refreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall status */}
      <Card className={cn("border-border mb-6", allOperational && "border-[hsl(var(--success))]/30")}>
        <CardContent className="flex items-center gap-3 p-5">
          {allOperational ? (
            <>
              <CheckCircle2 className="h-6 w-6 text-[hsl(var(--success))]" />
              <div>
                <p className="font-semibold text-foreground">All Systems Operational</p>
                <p className="text-sm text-muted-foreground">Everything is running smoothly</p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="h-6 w-6 text-[hsl(var(--warning))]" />
              <div>
                <p className="font-semibold text-foreground">Some Systems Experiencing Issues</p>
                <p className="text-sm text-muted-foreground">Check details below</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3 mb-8">
          {components.map((comp, i) => {
            const Icon = statusIcons[comp.status] || CheckCircle2
            return (
              <motion.div key={comp.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-border">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Icon className={cn("h-5 w-5", statusColors[comp.status])} />
                      <div>
                        <p className="font-medium text-foreground">{comp.name}</p>
                        {comp.detail && (
                          <p className="text-xs text-muted-foreground">{comp.detail}</p>
                        )}
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last checked: {new Date(comp.lastChecked).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={cn("text-sm font-medium", statusColors[comp.status])}>{comp.status}</span>
                      {comp.lastIncident && (
                        <p className="text-xs text-muted-foreground">Last incident: {comp.lastIncident}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Incident log */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Incident Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {incidents.map((incident) => (
              <div key={incident.id} className="flex gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
                <div className={cn(
                  "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                  incident.severity === "major" ? "bg-destructive" : incident.severity === "minor" ? "bg-[hsl(var(--warning))]" : "bg-primary"
                )} />
                <div>
                  <p className="text-xs text-muted-foreground">{incident.date}</p>
                  <p className="text-sm font-medium text-foreground">{incident.title}</p>
                  <p className="text-xs text-muted-foreground">{incident.desc}</p>
                </div>
              </div>
            ))}
            {incidents.length === 0 && (
              <p className="text-sm text-muted-foreground">No incidents recorded yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </PageTransition>
  )
}
