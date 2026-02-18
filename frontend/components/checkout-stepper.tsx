"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

const steps = [
  { label: "Details", description: "Review order" },
  { label: "Verify", description: "KYC & 2FA" },
  { label: "Payment", description: "Complete payment" },
  { label: "Transfer", description: "On-chain transfer" },
  { label: "Receipt", description: "Confirmation" },
]

export function CheckoutStepper({ currentStep }: { currentStep: number }) {
  return (
    <nav aria-label="Checkout progress" className="w-full">
      <ol className="flex items-center">
        {steps.map((step, i) => {
          const isComplete = i < currentStep
          const isCurrent = i === currentStep
          return (
            <li key={step.label} className={cn("flex items-center", i < steps.length - 1 && "flex-1")}>
              <div className="flex flex-col items-center gap-1 min-w-0">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all duration-300",
                    isComplete && "border-[hsl(var(--success))] bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
                    isCurrent && "border-primary bg-primary text-primary-foreground",
                    !isComplete && !isCurrent && "border-border bg-background text-muted-foreground"
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={cn(
                  "text-[10px] font-medium text-center hidden sm:block",
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={cn(
                  "mx-2 h-0.5 flex-1 rounded-full transition-colors duration-300",
                  isComplete ? "bg-[hsl(var(--success))]" : "bg-border"
                )} />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
