"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import { StatusPill } from "@/components/status-pill"
import { PageTransition } from "@/components/page-transition"
import { getSystemStatus } from "@/lib/api"
import type { SystemComponent } from "@/lib/types"

export default function StatusPage() {
  const [components, setComponents] = useState<SystemComponent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSystemStatus().then((d) => { setComponents(d); setLoading(false) })
  }, [])

  const allOperational = components.every((c) => c.status === "Operational")

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">System Status</h1>
        <p className="text-muted-foreground mb-8">Current status of Affordable NFT infrastructure.</p>

        {/* Overall status */}
        <div className={`rounded-2xl border p-6 mb-8 ${allOperational ? "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5" : "border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5"}`}>
          <div className="flex items-center gap-3">
            {allOperational ? <CheckCircle2 className="h-6 w-6 text-[hsl(var(--success))]" /> : <AlertTriangle className="h-6 w-6 text-[hsl(var(--warning))]" />}
            <div>
              <h2 className="font-semibold text-foreground">{allOperational ? "All Systems Operational" : "Some Systems Degraded"}</h2>
              <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Component list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {components.map((comp) => (
              <div key={comp.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
                <div>
                  <h3 className="font-medium text-foreground">{comp.name}</h3>
                  {comp.lastIncident && (
                    <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> {comp.lastIncident}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {new Date(comp.lastChecked).toLocaleTimeString()}
                  </span>
                  <StatusPill status={comp.status} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Maintenance window */}
        <div className="mt-8 rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground mb-2">Scheduled Maintenance</h3>
          <p className="text-sm text-muted-foreground">
            Next maintenance window: February 15, 2026 02:00-04:00 UTC. IPFS pinning service upgrade. Minimal disruption expected.
          </p>
        </div>
      </div>
    </PageTransition>
  )
}
