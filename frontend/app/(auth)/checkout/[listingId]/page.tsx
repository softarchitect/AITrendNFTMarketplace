"use client"

import { useState, useEffect, use, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { ShieldCheck, CreditCard, ArrowRight, Loader2, CheckCircle2, XCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckoutStepper } from "@/components/checkout-stepper"
import { PriceTag } from "@/components/price-tag"
import { MintingStatus } from "@/components/minting-status"
import {
  createCheckoutSession,
  confirmPayment,
  getMarketplaceGatewayInfo,
  getMe,
  pollTransferStatus,
  settleCheckoutSession
} from "@/lib/api"
import { useWallet } from "@/hooks/use-wallet"
import type { Listing } from "@/lib/types"
import { toast } from "sonner"

function toFriendlyCheckoutError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message
    if (message.includes("INVALID_API_KEY")) {
      return "Payment provider API key is invalid. Ask support/admin to update NOWPayments credentials."
    }
    if (message.includes("did not return a checkout URL")) {
      return "Gateway checkout URL was not returned. Please retry in a moment."
    }
    return message
  }
  return "Payment request failed. Please try again."
}

export default function CheckoutPage({ params }: { params: Promise<{ listingId: string }> }) {
  const { listingId } = use(params)
  const router = useRouter()
  const { address, isConnected, isWrongChain, switchToConfiguredChain, isSwitchingChain } = useWallet()
  const [step, setStep] = useState(0)
  const [listing, setListing] = useState<Listing | null>(null)
  const [sessionId, setSessionId] = useState("")
  const [checkoutUrl, setCheckoutUrl] = useState<string | undefined>(undefined)
  const [gatewayInfo, setGatewayInfo] = useState("Payment Gateway")
  const [kycStatus, setKycStatus] = useState<"NotStarted" | "Pending" | "Verified" | "Rejected">("Pending")
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [requiresKyc, setRequiresKyc] = useState(true)
  const [requiresTwoFA, setRequiresTwoFA] = useState(true)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [retryingSession, setRetryingSession] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkStatusCooldownSeconds, setCheckStatusCooldownSeconds] = useState(0)

  const getStorageKey = useCallback((walletAddress: string) => {
    return `checkout:idempotency:v2:${listingId}:${walletAddress.toLowerCase()}`
  }, [listingId])

  const createAndStoreIdempotencyKey = useCallback((walletAddress: string): string => {
    const key = getStorageKey(walletAddress)
    const created = `v2-${listingId}-${crypto.randomUUID()}`
    window.localStorage.setItem(key, created)
    return created
  }, [getStorageKey, listingId])

  const getOrCreateIdempotencyKey = useCallback((walletAddress: string): string => {
    const key = getStorageKey(walletAddress)
    const existing = window.localStorage.getItem(key)
    if (existing) return existing
    return createAndStoreIdempotencyKey(walletAddress)
  }, [createAndStoreIdempotencyKey, getStorageKey])

  const initializeCheckoutSession = useCallback(async (walletAddress: string, forceFresh = false): Promise<boolean> => {
    const idempotencyKey = forceFresh
      ? createAndStoreIdempotencyKey(walletAddress)
      : getOrCreateIdempotencyKey(walletAddress)
    try {
      const { sessionId: sid, listing: l, checkoutUrl: url } = await createCheckoutSession(listingId, {
        buyerAddress: walletAddress,
        idempotencyKey,
      })
      setSessionId(sid)
      setListing(l)
      setCheckoutUrl(url)
      setError(null)
      return true
    } catch (error: unknown) {
      const message = toFriendlyCheckoutError(error)
      setError(message)
      return false
    } finally {
      setLoading(false)
    }
  }, [createAndStoreIdempotencyKey, getOrCreateIdempotencyKey, listingId])

  useEffect(() => {
    getMe()
      .then((me) => {
        setKycStatus(me.kycStatus)
        setTwoFAEnabled(me.twoFAEnabled)
      })
      .catch(() => {
        setKycStatus("Pending")
        setTwoFAEnabled(false)
      })
  }, [])

  useEffect(() => {
    getMarketplaceGatewayInfo()
      .then((info) => {
        setGatewayInfo(`${info.provider.toUpperCase()} (${info.mode.toUpperCase()})`)
        setRequiresKyc(info.kycRequired ?? true)
        setRequiresTwoFA(info.twoFARequired ?? true)
      })
      .catch(() => {
        setGatewayInfo("Payment Gateway")
        setRequiresKyc(true)
        setRequiresTwoFA(true)
      })
  }, [])

  useEffect(() => {
    if (checkStatusCooldownSeconds <= 0) return
    const timer = window.setTimeout(() => {
      setCheckStatusCooldownSeconds((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [checkStatusCooldownSeconds])

  useEffect(() => {
    if (!address) {
      setLoading(false)
      return
    }

    setLoading(true)
    void initializeCheckoutSession(address)
  }, [address, initializeCheckoutSession])

  async function handleVerify() {
    if (!isConnected) {
      toast.error("Connect your wallet before checkout.")
      return
    }
    if (isWrongChain) {
      try {
        await switchToConfiguredChain()
      } catch {
        toast.error("Please switch your wallet to Ethereum and retry.")
        return
      }
    }
    if (requiresKyc && kycStatus !== "Verified") {
      toast.error("KYC verification is required before payment.")
      return
    }
    if (requiresTwoFA && !twoFAEnabled) {
      toast.error("Enable 2FA in account settings before payment.")
      return
    }
    setProcessing(true)
    setStep(2)
    setProcessing(false)
  }

  async function waitForPaymentConfirmation() {
    for (let i = 0; i < 30; i += 1) {
      const status = await confirmPayment(sessionId)
      if (status.status === "confirmed") return true
      if (status.status === "failed") return false
      await new Promise((resolve) => setTimeout(resolve, 2500))
    }
    return false
  }

  async function handlePayment() {
    setProcessing(true)
    setError(null)
    try {
      if (checkoutUrl) {
        window.open(checkoutUrl, "_blank", "noopener,noreferrer")
      } else {
        setError("Checkout URL is unavailable. Verify payment gateway configuration.")
        setProcessing(false)
        return
      }
      const confirmed = await waitForPaymentConfirmation()
      if (confirmed) {
        setStep(3)
        // Start transfer polling
        await handleTransfer()
      } else {
        setError("Payment is still pending or failed. Please complete payment and retry.")
      }
    } catch (error: unknown) {
      setError(toFriendlyCheckoutError(error))
    }
    setProcessing(false)
  }

  async function handleCheckStatusNow() {
    if (!sessionId || processing || checkStatusCooldownSeconds > 0) return
    try {
      setProcessing(true)
      setCheckStatusCooldownSeconds(5)
      setError(null)
      const status = await confirmPayment(sessionId)
      if (status.status === "confirmed") {
        setStep(3)
        await handleTransfer()
        return
      }
      if (status.status === "failed") {
        setError("Payment failed. Please try again.")
        return
      }
      toast.info("Payment is still pending. Complete payment in the gateway and retry.")
    } catch (error: unknown) {
      setError(toFriendlyCheckoutError(error))
    } finally {
      setProcessing(false)
    }
  }

  async function handleTransfer() {
    setProcessing(true)
    try {
      const settled = await settleCheckoutSession(sessionId)
      if (settled.txHash) {
        setTxHash(settled.txHash)
      }
      if (settled.receiptId) {
        setReceiptId(settled.receiptId)
      }
    } catch {
      // Session might already be settled; continue polling idempotently.
    }

    for (let i = 0; i < 24; i += 1) {
      const res = await pollTransferStatus(sessionId)
      if (res.status === "complete") {
        if (res.txHash) {
          setTxHash(res.txHash)
        }
        if (res.receiptId) {
          setReceiptId(res.receiptId)
        }
        setStep(4)
        toast.success("Purchase complete!")
        setProcessing(false)
        return
      }
      if (res.status === "failed") {
        setError("On-chain settlement failed. Please contact support.")
        setProcessing(false)
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 2500))
    }

    setError("Settlement is taking longer than expected. Refresh to resume.")
    setProcessing(false)
  }

  async function handleRetryCheckoutSession() {
    if (!address || retryingSession) return
    setRetryingSession(true)
    const ok = await initializeCheckoutSession(address, true)
    if (ok) {
      toast.success("Created a new checkout session. Try payment again.")
    }
    setRetryingSession(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!address) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">Connect your wallet to continue checkout.</p>
        <Button onClick={() => router.push("/marketplace")}>Back to Marketplace</Button>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
      <div className="mb-8">
        <CheckoutStepper currentStep={step} />
      </div>

      <AnimatePresence mode="wait">
        {/* Step 0: Details */}
        {step === 0 && (
          <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Order Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-4">
                  <div>
                    <p className="font-medium text-foreground">NFT Purchase</p>
                    <p className="text-sm text-muted-foreground">Listing #{listing?.id}</p>
                  </div>
                  {listing && <PriceTag eth={listing.priceEth} fiat={listing.priceFiat} />}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="text-foreground">${listing?.priceFiat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Gas fee (est.)</span>
                    <span className="text-foreground">$2.50</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-semibold text-foreground">
                    <span>Total</span>
                    <span>${((listing?.priceFiat || 0) + 2.5).toFixed(2)}</span>
                  </div>
                </div>
                <Button className="w-full gap-2" onClick={() => setStep(1)}>
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 1: KYC/2FA Gate */}
        {step === 1 && (
          <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5 p-4">
                  <div className="flex items-center gap-2">
                    {!requiresKyc || kycStatus === "Verified" ? (
                      <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {requiresKyc ? `KYC ${kycStatus}` : "KYC Not Required"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {requiresKyc ? (kycStatus === "Verified" ? "Completed" : "Required") : "Optional"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-[hsl(var(--success))]/30 bg-[hsl(var(--success))]/5 p-4">
                  <div className="flex items-center gap-2">
                    {!requiresTwoFA || twoFAEnabled ? (
                      <CheckCircle2 className="h-5 w-5 text-[hsl(var(--success))]" />
                    ) : (
                      <XCircle className="h-5 w-5 text-destructive" />
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {requiresTwoFA ? "2FA Enabled" : "2FA Not Required"}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {requiresTwoFA ? (twoFAEnabled ? "Active" : "Required") : "Optional"}
                  </span>
                </div>
                <Button className="w-full gap-2" onClick={handleVerify} disabled={processing}>
                  {(processing || isSwitchingChain) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Proceed to Payment <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Payment */}
        {step === 2 && (
          <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border-2 border-dashed border-border bg-muted/50 p-8 text-center">
                  <CreditCard className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Payment Gateway</p>
                  <p className="mt-1 text-xs text-muted-foreground">{gatewayInfo}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {checkoutUrl ? "Checkout session created. Complete payment in the opened gateway tab." : "Preparing payment session..."}
                  </p>
                  {checkoutUrl && (
                    <div className="mt-4 flex justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 bg-transparent"
                        onClick={() => window.open(checkoutUrl, "_blank", "noopener,noreferrer")}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Re-open Gateway
                      </Button>
                    </div>
                  )}
                </div>
                {error && (
                  <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm text-destructive">{error}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-md border border-destructive/20 bg-background/70 p-2">
                      <p className="text-xs text-muted-foreground">Troubleshooting: recreate checkout session after gateway/config updates.</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="ml-2 bg-transparent"
                        onClick={handleRetryCheckoutSession}
                        disabled={retryingSession || processing || !address}
                      >
                        {retryingSession && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                        Retry Session
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => { router.push("/checkout/cancel") }}>
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={handleCheckStatusNow}
                    disabled={processing || checkStatusCooldownSeconds > 0 || !sessionId}
                  >
                    {checkStatusCooldownSeconds > 0 ? `Check Again (${checkStatusCooldownSeconds}s)` : "Check Status Now"}
                  </Button>
                  <Button className="flex-1 gap-2" onClick={handlePayment} disabled={processing}>
                    {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Pay ${((listing?.priceFiat || 0) + 2.5).toFixed(2)}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Transfer */}
        {step === 3 && (
          <motion.div key="transfer" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-foreground">On-Chain Transfer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-center py-8">
                <MintingStatus />
                <div className="space-y-2">
                  <p className="font-medium text-foreground">Transferring to your wallet...</p>
                  <p className="text-sm text-muted-foreground">Payment confirmed. Initiating on-chain transfer.</p>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Payment: <span className="text-[hsl(var(--success))] font-medium">Confirmed</span></p>
                  <p>On-chain: <span className="text-primary font-medium">Transferring...</span></p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Receipt */}
        {step === 4 && (
          <motion.div key="receipt" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <Card className="border-border">
              <CardHeader className="text-center">
                <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-[hsl(var(--success))]" />
                <CardTitle className="text-foreground">Purchase Complete!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Order ID</span>
                    <span className="font-mono text-foreground text-xs">{sessionId}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Amount</span>
                    <span className="text-foreground">${((listing?.priceFiat || 0) + 2.5).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Status</span>
                    <span className="text-[hsl(var(--success))] font-medium">Complete</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tx Hash</span>
                    <span className="font-mono text-foreground text-xs">{txHash ?? "-"}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Receipt ID</span>
                    <span className="font-mono text-foreground text-xs">{receiptId ?? "-"}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => router.push("/app/receipts")}>
                    View Receipt
                  </Button>
                  <Button className="flex-1" onClick={() => router.push("/app/nfts")}>
                    View My NFTs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
