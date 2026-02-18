"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { UserCheck, Upload, Loader2, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type KYCStep = "start" | "uploading" | "processing" | "complete" | "rejected"

export default function KYCPage() {
  const [step, setStep] = useState<KYCStep>("start")

  async function handleStartKYC() {
    setStep("uploading")
    await new Promise((r) => setTimeout(r, 1500))
    setStep("processing")
    await new Promise((r) => setTimeout(r, 2500))
    setStep("complete")
    toast.success("KYC verification submitted!")
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
      <Card className="border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <UserCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Identity Verification</CardTitle>
          <CardDescription className="text-muted-foreground">
            Complete KYC to unlock purchasing capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Status steps */}
          <div className="mb-6 space-y-3">
            {[
              { label: "Document Upload", icon: Upload, active: step === "uploading", done: ["processing", "complete", "rejected"].includes(step) },
              { label: "Processing", icon: Clock, active: step === "processing", done: ["complete", "rejected"].includes(step) },
              { label: "Verification", icon: CheckCircle2, active: step === "complete", done: step === "complete" },
            ].map((s) => (
              <div key={s.label} className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                s.active ? "border-primary bg-primary/5" : s.done ? "border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5" : "border-border"
              )}>
                <s.icon className={cn("h-5 w-5", s.active ? "text-primary" : s.done ? "text-[hsl(var(--success))]" : "text-muted-foreground")} />
                <span className={cn("text-sm font-medium", s.active || s.done ? "text-foreground" : "text-muted-foreground")}>{s.label}</span>
                {s.active && <Loader2 className="ml-auto h-4 w-4 animate-spin text-primary" />}
                {s.done && !s.active && <CheckCircle2 className="ml-auto h-4 w-4 text-[hsl(var(--success))]" />}
              </div>
            ))}
          </div>

          {step === "start" && (
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-dashed border-border bg-muted/50 p-8 text-center">
                <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">KYC Provider Widget</p>
                <p className="mt-1 text-xs text-muted-foreground">Identity verification will be handled by a third-party provider</p>
              </div>
              <Button className="w-full" onClick={handleStartKYC}>
                Start Verification
              </Button>
            </div>
          )}

          {step === "uploading" && (
            <div className="py-4 text-center">
              <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading documents...</p>
            </div>
          )}

          {step === "processing" && (
            <div className="py-4 text-center">
              <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Verifying your identity...</p>
              <p className="mt-1 text-xs text-muted-foreground">This may take a few moments</p>
            </div>
          )}

          {step === "complete" && (
            <div className="py-4 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-[hsl(var(--success))]" />
              <p className="font-semibold text-foreground">Verification Complete</p>
              <p className="mt-1 text-sm text-muted-foreground">Your identity has been verified. You can now purchase NFTs.</p>
              <Button className="mt-4" onClick={() => window.history.back()}>
                Continue
              </Button>
            </div>
          )}

          {step === "rejected" && (
            <div className="py-4 text-center">
              <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" />
              <p className="font-semibold text-foreground">Verification Failed</p>
              <p className="mt-1 text-sm text-muted-foreground">Please try again with valid documents.</p>
              <Button className="mt-4" onClick={() => setStep("start")}>
                Retry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
