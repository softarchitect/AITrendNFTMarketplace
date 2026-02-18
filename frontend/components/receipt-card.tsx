"use client"

import { ExternalLink, Download, Receipt as ReceiptIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusPill } from "@/components/status-pill"
import type { Receipt } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ReceiptCard({ receipt, className }: { receipt: Receipt; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-5", className)}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <ReceiptIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Receipt #{receipt.id}</p>
            <p className="text-xs text-muted-foreground">{new Date(receipt.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <p className="text-lg font-bold text-foreground">${receipt.amountFiat.toLocaleString()} {receipt.currency}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Gateway</p>
          <p className="font-medium text-foreground">{receipt.gateway}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Payment Status</p>
          <StatusPill status={receipt.gatewayStatus} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">On-chain Status</p>
          <StatusPill status={receipt.onchainStatus} />
        </div>
        {receipt.txHash && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Transaction</p>
            <a href="#" className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline">
              {receipt.txHash.slice(0, 10)}...
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-border">
        <Button variant="outline" size="sm" className="w-full gap-2 bg-transparent" onClick={() => {}}>
          <Download className="h-3.5 w-3.5" />
          Download Invoice
        </Button>
      </div>
    </div>
  )
}
