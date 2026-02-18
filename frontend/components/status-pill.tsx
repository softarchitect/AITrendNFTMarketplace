import { cn } from "@/lib/utils"

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  // NFT statuses
  Generating: { bg: "bg-[hsl(var(--warning))]/15", text: "text-[hsl(var(--warning))]", dot: "bg-[hsl(var(--warning))]" },
  Minting: { bg: "bg-primary/15", text: "text-primary", dot: "bg-primary" },
  Listed: { bg: "bg-[hsl(var(--success))]/15", text: "text-[hsl(var(--success))]", dot: "bg-[hsl(var(--success))]" },
  SoldOut: { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" },
  Delisted: { bg: "bg-destructive/15", text: "text-destructive", dot: "bg-destructive" },
  // Listing statuses
  Active: { bg: "bg-[hsl(var(--success))]/15", text: "text-[hsl(var(--success))]", dot: "bg-[hsl(var(--success))]" },
  PendingPayment: { bg: "bg-[hsl(var(--warning))]/15", text: "text-[hsl(var(--warning))]", dot: "bg-[hsl(var(--warning))]" },
  PendingTransfer: { bg: "bg-primary/15", text: "text-primary", dot: "bg-primary" },
  Completed: { bg: "bg-[hsl(var(--success))]/15", text: "text-[hsl(var(--success))]", dot: "bg-[hsl(var(--success))]" },
  Cancelled: { bg: "bg-destructive/15", text: "text-destructive", dot: "bg-destructive" },
  // System statuses
  Operational: { bg: "bg-[hsl(var(--success))]/15", text: "text-[hsl(var(--success))]", dot: "bg-[hsl(var(--success))]" },
  Degraded: { bg: "bg-[hsl(var(--warning))]/15", text: "text-[hsl(var(--warning))]", dot: "bg-[hsl(var(--warning))]" },
  Down: { bg: "bg-destructive/15", text: "text-destructive", dot: "bg-destructive" },
  Maintenance: { bg: "bg-primary/15", text: "text-primary", dot: "bg-primary" },
  // Gateway / onchain
  Pending: { bg: "bg-[hsl(var(--warning))]/15", text: "text-[hsl(var(--warning))]", dot: "bg-[hsl(var(--warning))]" },
  Processing: { bg: "bg-primary/15", text: "text-primary", dot: "bg-primary" },
  Confirmed: { bg: "bg-[hsl(var(--success))]/15", text: "text-[hsl(var(--success))]", dot: "bg-[hsl(var(--success))]" },
  Failed: { bg: "bg-destructive/15", text: "text-destructive", dot: "bg-destructive" },
  Transferring: { bg: "bg-primary/15", text: "text-primary", dot: "bg-primary" },
  Complete: { bg: "bg-[hsl(var(--success))]/15", text: "text-[hsl(var(--success))]", dot: "bg-[hsl(var(--success))]" },
  // KYC
  NotStarted: { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" },
  Verified: { bg: "bg-[hsl(var(--success))]/15", text: "text-[hsl(var(--success))]", dot: "bg-[hsl(var(--success))]" },
  Rejected: { bg: "bg-destructive/15", text: "text-destructive", dot: "bg-destructive" },
  // Trend source
  Paused: { bg: "bg-[hsl(var(--warning))]/15", text: "text-[hsl(var(--warning))]", dot: "bg-[hsl(var(--warning))]" },
  Error: { bg: "bg-destructive/15", text: "text-destructive", dot: "bg-destructive" },
}

const defaultConfig = { bg: "bg-muted", text: "text-muted-foreground", dot: "bg-muted-foreground" }

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const config = statusConfig[status] || defaultConfig
  const label = status.replace(/([A-Z])/g, " $1").trim()

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.bg,
        config.text,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {label}
    </span>
  )
}
