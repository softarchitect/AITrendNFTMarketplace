"use client"

import React from "react"

import { useState } from "react"
import { motion } from "framer-motion"
import { Shield, Copy, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

const RECOVERY_CODES = ["A1B2-C3D4", "E5F6-G7H8", "I9J0-K1L2", "M3N4-O5P6", "Q7R8-S9T0", "U1V2-W3X4"]

export default function TwoFactorSetupPage() {
  const [step, setStep] = useState<"setup" | "verify" | "recovery">("setup")
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    setStep("recovery")
    setLoading(false)
    toast.success("Two-factor authentication enabled!")
  }

  function copyRecoveryCodes() {
    navigator.clipboard.writeText(RECOVERY_CODES.join("\n"))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Recovery codes copied to clipboard")
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
      <Card className="border-border">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">Two-Factor Authentication</CardTitle>
          <CardDescription className="text-muted-foreground">
            {step === "setup" && "Scan the QR code with your authenticator app"}
            {step === "verify" && "Enter the code from your authenticator"}
            {step === "recovery" && "Save your recovery codes"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "setup" && (
            <div className="space-y-6">
              {/* QR Code placeholder */}
              <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted">
                <div className="text-center text-muted-foreground">
                  <Shield className="mx-auto mb-2 h-8 w-8" />
                  <p className="text-xs">QR Code</p>
                  <p className="text-[10px]">Authenticator Setup</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground text-xs">Manual Entry Key</Label>
                <div className="rounded-lg border border-border bg-muted px-3 py-2 font-mono text-xs text-foreground select-all">
                  JBSWY3DPEHPK3PXP
                </div>
              </div>
              <Button className="w-full" onClick={() => setStep("verify")}>
                Continue
              </Button>
            </div>
          )}

          {step === "verify" && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verify-code" className="text-foreground">Verification Code</Label>
                <Input
                  id="verify-code"
                  type="text"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-lg tracking-[0.5em] font-mono"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || code.length < 6}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify & Enable
              </Button>
            </form>
          )}

          {step === "recovery" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Store these recovery codes somewhere safe. Each code can only be used once.
              </p>
              <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted p-4">
                {RECOVERY_CODES.map((rc) => (
                  <span key={rc} className="font-mono text-sm text-foreground">{rc}</span>
                ))}
              </div>
              <Button variant="outline" className="w-full gap-2 bg-transparent" onClick={copyRecoveryCodes}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy Codes"}
              </Button>
              <Button className="w-full" onClick={() => toast.success("Setup complete!")}>
                Done
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
