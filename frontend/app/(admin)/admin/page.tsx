"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Coins, ListOrdered, Tag, XCircle, DollarSign, AlertTriangle, ArrowRight, RefreshCw } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageTransition } from "@/components/page-transition"
import { getAdminOverview, getAdminPaymentSummary, getAdminUsers, getAuditLogs, getMintQueue, getTrendSources, getWebhookLogs } from "@/lib/api"
import type { AdminOverview, NFT } from "@/lib/types"
import { StatusPill } from "@/components/status-pill"
import { toast } from "sonner"

const alertToneClasses: Record<"warning" | "error" | "info", string> = {
  warning: "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5",
  error: "border-destructive/30 bg-destructive/5",
  info: "border-border bg-muted/30"
}

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [queue, setQueue] = useState<NFT[]>([])
  const [paymentSummary, setPaymentSummary] = useState<{ confirmed: number; processing: number; failed: number; total: number }>({
    confirmed: 0,
    processing: 0,
    failed: 0,
    total: 0
  })
  const [alerts, setAlerts] = useState<Array<{
    id: string
    title: string
    detail: string
    tone: "warning" | "error" | "info"
    href: string
    actionLabel: string
  }>>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadOverview = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    }
    try {
      const [o, q, pay, sources, users, webhooks, audits] = await Promise.all([
        getAdminOverview(),
        getMintQueue(),
        getAdminPaymentSummary(),
        getTrendSources(),
        getAdminUsers(),
        getWebhookLogs(),
        getAuditLogs()
      ])
      setOverview(o)
      setQueue(q.slice(0, 5))
      setPaymentSummary(pay)
      const nextAlerts: Array<{
        id: string
        title: string
        detail: string
        tone: "warning" | "error" | "info"
        href: string
        actionLabel: string
      }> = []
      for (const source of sources) {
        if (source.status === "Paused" || source.status === "Error") {
          nextAlerts.push({
            id: `source-${source.id}`,
            title: `${source.name} source ${source.status.toLowerCase()}`,
            detail: `Rate limit mode: ${source.rateLimitMode}`,
            tone: source.status === "Error" ? "error" : "warning",
            href: "/admin/trend-sources",
            actionLabel: "Open trend sources"
          })
        }
      }
      const pendingKyc = users.filter((user) => user.kycStatus === "Pending").length
      if (pendingKyc > 0) {
        nextAlerts.push({
          id: "kyc-pending",
          title: `${pendingKyc} pending KYC review${pendingKyc === 1 ? "" : "s"}`,
          detail: `${users.length} total registered users`,
          tone: "info",
          href: "/admin/users",
          actionLabel: "Review users"
        })
      }
      const rejectedWebhooks = webhooks.filter((item) => item.status === "rejected")
      if (rejectedWebhooks.length > 0) {
        nextAlerts.push({
          id: `webhook-${rejectedWebhooks[0].id}`,
          title: `${rejectedWebhooks.length} rejected webhook${rejectedWebhooks.length === 1 ? "" : "s"}`,
          detail: rejectedWebhooks[0].reason ?? "Check webhook signature and payload format",
          tone: "error",
          href: "/admin/system-status",
          actionLabel: "Open system status"
        })
      }
      const recentCriticalAudit = audits.find((item) => item.action.includes("failed") || item.action.includes("blocked"))
      if (recentCriticalAudit) {
        nextAlerts.push({
          id: `audit-${recentCriticalAudit.id}`,
          title: recentCriticalAudit.action.replace(/_/g, " "),
          detail: `Actor: ${recentCriticalAudit.actor}`,
          tone: "warning",
          href: "/admin/system-status",
          actionLabel: "View audit stream"
        })
      }
      setAlerts(nextAlerts.slice(0, 4))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load admin overview"
      toast.error(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadOverview(false)
  }, [loadOverview])

  if (loading || !overview) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />)}</div>
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
      </div>
    )
  }

  const kpis = [
    { label: "Minted Today", value: overview.mintedToday, icon: Coins, color: "text-primary" },
    { label: "Queued", value: overview.queued, icon: ListOrdered, color: "text-[hsl(var(--warning))]" },
    { label: "Listed", value: overview.listed, icon: Tag, color: "text-[hsl(var(--success))]" },
    { label: "Failed", value: overview.failed, icon: XCircle, color: "text-destructive" },
  ]

  return (
    <PageTransition>
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Overview</h1>
            <p className="text-muted-foreground">System health and pipeline status at a glance</p>
          </div>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => void loadOverview(true)} disabled={refreshing}>
            {refreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 mb-6">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
                <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Minting Queue Preview */}
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-foreground">Minting Queue</CardTitle>
            <Link href="/admin/minting-queue">
              <Button variant="ghost" size="sm" className="text-muted-foreground">View all <ArrowRight className="ml-1 h-3 w-3" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {queue.map((nft) => (
                <div key={nft.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Image
                    src={nft.imageUrl || "/placeholder.svg"}
                    alt={nft.title}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{nft.title}</p>
                    <p className="text-xs text-muted-foreground">{nft.themes.join(", ")}</p>
                  </div>
                  <StatusPill status={nft.status} />
                </div>
              ))}
              {queue.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Queue is empty</p>}
            </div>
          </CardContent>
        </Card>

        {/* Payment Status & Alerts */}
        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2 mb-4">
                <DollarSign className="h-5 w-5 text-[hsl(var(--success))]" />
                <span className="text-3xl font-bold text-foreground">{overview.totalRevenue.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">USD total</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Confirmed", value: String(paymentSummary.confirmed), color: "text-[hsl(var(--success))]" },
                  { label: "Processing", value: String(paymentSummary.processing), color: "text-[hsl(var(--warning))]" },
                  { label: "Failed", value: String(paymentSummary.failed), color: "text-destructive" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border p-3 text-center">
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{paymentSummary.total} total payment session(s)</p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))]" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className={`rounded-lg border p-3 ${alertToneClasses[alert.tone]}`}>
                  <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">{alert.detail}</p>
                  <Link href={alert.href} className="mt-2 inline-flex items-center text-xs font-medium text-primary hover:underline">
                    {alert.actionLabel}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </div>
              ))}
              {alerts.length === 0 && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-sm font-medium text-foreground">{overview.activeUsers} active users today</p>
                  <p className="text-xs text-muted-foreground">No active alerts.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  )
}
