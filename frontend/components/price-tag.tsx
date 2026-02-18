import { cn } from "@/lib/utils"

export function PriceTag({
  eth,
  fiat,
  currency = "USD",
  size = "md",
  className,
}: {
  eth: number
  fiat?: number
  currency?: string
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const sizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-xl",
  }

  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className={cn("font-semibold text-foreground", sizes[size])}>
        {eth.toFixed(eth < 0.01 ? 4 : 3)} ETH
      </span>
      {fiat !== undefined && (
        <span className="text-xs text-muted-foreground">
          ${fiat.toLocaleString()} {currency}
        </span>
      )}
    </div>
  )
}
