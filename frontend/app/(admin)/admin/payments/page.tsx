"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Download, Search, ExternalLink, RefreshCw, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusPill } from "@/components/status-pill"
import { PageTransition } from "@/components/page-transition"
import { getAdminPayments, settleAdminPayment } from "@/lib/api"
import type { AdminPaymentDto } from "@/lib/api"
import { toast } from "sonner"

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPaymentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [settlingPaymentId, setSettlingPaymentId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [paymentFilter, setPaymentFilter] = useState<"all" | "pending" | "confirmed" | "failed">("all")
  const [onchainFilter, setOnchainFilter] = useState<"all" | "pending" | "processing" | "completed" | "failed">("all")

  const txExplorerBaseUrl = useMemo(() => {
    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111)
    if (chainId === 11155111) return "https://sepolia.etherscan.io/tx/"
    if (chainId === 1) return "https://etherscan.io/tx/"
    return "https://sepolia.etherscan.io/tx/"
  }, [])

  const loadPayments = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const rows = await getAdminPayments()
      setPayments(rows)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load payments"
      toast.error(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadPayments(false)
  }, [loadPayments])

  const filtered = payments.filter((row) => {
    const searchValue = search.trim().toLowerCase()
    const matchesSearch =
      !searchValue ||
      row.paymentId.toLowerCase().includes(searchValue) ||
      row.externalRef.toLowerCase().includes(searchValue) ||
      (row.buyerAddress ?? "").toLowerCase().includes(searchValue) ||
      (row.sellerAddress ?? "").toLowerCase().includes(searchValue) ||
      (row.receiptId ?? "").toLowerCase().includes(searchValue)
    const matchesPaymentFilter =
      paymentFilter === "all" ||
      (paymentFilter === "pending" && (row.paymentStatus === "created" || row.paymentStatus === "pending")) ||
      (paymentFilter === "confirmed" && row.paymentStatus === "confirmed") ||
      (paymentFilter === "failed" && (row.paymentStatus === "failed" || row.paymentStatus === "refunded"))
    const matchesOnchainFilter = onchainFilter === "all" || row.settlementStatus === onchainFilter
    return matchesSearch && matchesPaymentFilter && matchesOnchainFilter
  })

  function toGatewayStatus(status: AdminPaymentDto["paymentStatus"]): "Pending" | "Confirmed" | "Failed" {
    if (status === "confirmed") return "Confirmed"
    if (status === "failed" || status === "refunded") return "Failed"
    return "Pending"
  }

  function toOnchainStatus(status: AdminPaymentDto["settlementStatus"]): "Pending" | "Transferring" | "Complete" | "Failed" {
    if (status === "completed") return "Complete"
    if (status === "processing") return "Transferring"
    if (status === "failed") return "Failed"
    return "Pending"
  }

  async function handleSettleNow(paymentId: string) {
    setSettlingPaymentId(paymentId)
    try {
      await settleAdminPayment(paymentId)
      toast.success("Settlement submitted")
      await loadPayments(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to settle payment"
      toast.error(message)
    } finally {
      setSettlingPaymentId(null)
    }
  }

  function handleExportCsv() {
    const header = [
      "payment_id",
      "receipt_id",
      "external_ref",
      "listing_id",
      "token_id",
      "buyer_address",
      "seller_address",
      "amount_usd",
      "currency",
      "gateway_provider",
      "payment_status",
      "settlement_status",
      "tx_hash",
      "checkout_url",
      "created_at"
    ]
    const rows = filtered.map((row) => [
      row.paymentId,
      row.receiptId ?? "",
      row.externalRef,
      row.listingId ?? "",
      row.tokenId ?? "",
      row.buyerAddress ?? "",
      row.sellerAddress ?? "",
      row.amountUsd.toString(),
      row.currency,
      row.gatewayProvider,
      row.paymentStatus,
      row.settlementStatus,
      row.txHash ?? "",
      row.checkoutUrl ?? "",
      row.createdAt
    ])
    const csv = [header, ...rows]
      .map((line) => line.map((value) => `"${String(value).replaceAll("\"", "\"\"")}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `admin-payments-${Date.now()}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <PageTransition>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payments & Receipts</h1>
          <p className="text-muted-foreground">{payments.length} total transactions</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search payment, wallet, receipt..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as "all" | "pending" | "confirmed" | "failed")}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All payment status</option>
            <option value="pending">Pending payment</option>
            <option value="confirmed">Confirmed payment</option>
            <option value="failed">Failed/refunded payment</option>
          </select>
          <select
            value={onchainFilter}
            onChange={(e) =>
              setOnchainFilter(e.target.value as "all" | "pending" | "processing" | "completed" | "failed")
            }
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All on-chain status</option>
            <option value="pending">Pending</option>
            <option value="processing">Transferring</option>
            <option value="completed">Complete</option>
            <option value="failed">Failed</option>
          </select>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => void loadPayments(true)} disabled={loading || refreshing}>
            {refreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={handleExportCsv}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.5fr_90px_100px_110px_110px_180px_120px] gap-4 border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <span>Payment / Receipt</span><span>Amount</span><span>Gateway</span><span>Payment</span><span>On-chain</span><span>References</span><span>Actions</span>
          </div>
          {filtered.map((row, i) => (
            <motion.div
              key={row.paymentId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-1 md:grid-cols-[1.5fr_90px_100px_110px_110px_180px_120px] gap-2 md:gap-4 items-center border-b border-border px-4 py-3 hover:bg-muted/30 transition-colors last:border-b-0"
            >
              <div>
                <p className="text-sm font-medium text-foreground font-mono">{row.paymentId}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  Receipt: {row.receiptId ?? "-"} | {new Date(row.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="text-sm font-semibold text-foreground">${row.amountUsd}</span>
              <span className="text-sm text-muted-foreground">{row.gatewayProvider}</span>
              <StatusPill status={toGatewayStatus(row.paymentStatus)} />
              <StatusPill status={toOnchainStatus(row.settlementStatus)} />
              <div className="text-xs space-y-1">
                <p className="text-muted-foreground font-mono">Ref: {row.externalRef}</p>
                {row.txHash ? (
                  <a
                    href={`${txExplorerBaseUrl}${row.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline font-mono"
                  >
                    {row.txHash.slice(0, 10)}...
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <p className="text-muted-foreground">Tx: -</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {row.checkoutUrl && (
                  <a href={row.checkoutUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">
                    Checkout
                  </a>
                )}
                {row.paymentStatus === "confirmed" && row.settlementStatus !== "completed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={settlingPaymentId === row.paymentId}
                    onClick={() => void handleSettleNow(row.paymentId)}
                    className="h-7 px-2 text-xs bg-transparent"
                  >
                    {settlingPaymentId === row.paymentId ? <Loader2 className="h-3 w-3 animate-spin" /> : "Settle now"}
                  </Button>
                )}
              </div>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">No payments match your filters.</div>
          )}
        </div>
      )}
    </PageTransition>
  )
}
