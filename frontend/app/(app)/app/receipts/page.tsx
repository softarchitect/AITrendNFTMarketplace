"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Download, X, ExternalLink, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusPill } from "@/components/status-pill"
import { PageTransition } from "@/components/page-transition"
import { getReceipts } from "@/lib/api"
import { useWallet } from "@/hooks/use-wallet"
import type { Receipt } from "@/lib/types"
import { toast } from "sonner"

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [gatewayFilter, setGatewayFilter] = useState<"all" | "Pending" | "Confirmed" | "Failed">("all")
  const [onchainFilter, setOnchainFilter] = useState<"all" | "Pending" | "Transferring" | "Complete" | "Failed">("all")
  const [selected, setSelected] = useState<Receipt | null>(null)
  const { address } = useWallet()
  const txExplorerBaseUrl = useMemo(() => {
    const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111)
    if (chainId === 11155111) return "https://sepolia.etherscan.io/tx/"
    if (chainId === 1) return "https://etherscan.io/tx/"
    return "https://sepolia.etherscan.io/tx/"
  }, [])

  const loadReceipts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      const data = await getReceipts(address)
      setReceipts(data)
      setError(null)
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to load receipts"
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [address])

  useEffect(() => {
    void loadReceipts(false)
  }, [loadReceipts])

  const filtered = receipts.filter((r) =>
    (r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.gateway.toLowerCase().includes(search.toLowerCase()) ||
      r.listingId.toLowerCase().includes(search.toLowerCase())) &&
    (gatewayFilter === "all" || r.gatewayStatus === gatewayFilter) &&
    (onchainFilter === "all" || r.onchainStatus === onchainFilter)
  )

  function handleExportCsv() {
    const header = [
      "receipt_id",
      "listing_id",
      "user_id",
      "amount_fiat",
      "currency",
      "gateway",
      "payment_status",
      "onchain_status",
      "tx_hash",
      "created_at"
    ]
    const rows = filtered.map((receipt) => [
      receipt.id,
      receipt.listingId,
      receipt.userId,
      receipt.amountFiat.toString(),
      receipt.currency,
      receipt.gateway,
      receipt.gatewayStatus,
      receipt.onchainStatus,
      receipt.txHash ?? "",
      receipt.createdAt
    ])
    const csv = [header, ...rows]
      .map((line) => line.map((value) => `"${String(value).replaceAll("\"", "\"\"")}"`).join(","))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `receipts-${Date.now()}.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  function handleDownloadInvoice(receipt: Receipt) {
    const invoiceText = [
      "Affordable NFT Receipt Invoice",
      "------------------------",
      `Receipt ID: ${receipt.id}`,
      `Listing ID: ${receipt.listingId}`,
      `Wallet: ${receipt.userId}`,
      `Amount: $${receipt.amountFiat.toFixed(2)} ${receipt.currency}`,
      `Gateway: ${receipt.gateway}`,
      `Payment Status: ${receipt.gatewayStatus}`,
      `On-chain Status: ${receipt.onchainStatus}`,
      `Tx Hash: ${receipt.txHash ?? "-"}`,
      `Issued At: ${new Date(receipt.createdAt).toISOString()}`
    ].join("\n")
    const blob = new Blob([invoiceText], { type: "text/plain;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `affordable-nft-invoice-${receipt.id}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <PageTransition>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchases & Receipts</h1>
          <p className="text-muted-foreground">Your payment history and transaction records</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search receipts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <select
            value={gatewayFilter}
            onChange={(e) => setGatewayFilter(e.target.value as "all" | "Pending" | "Confirmed" | "Failed")}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All payment status</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Failed">Failed</option>
          </select>
          <select
            value={onchainFilter}
            onChange={(e) => setOnchainFilter(e.target.value as "all" | "Pending" | "Transferring" | "Complete" | "Failed")}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All on-chain status</option>
            <option value="Pending">Pending</option>
            <option value="Transferring">Transferring</option>
            <option value="Complete">Complete</option>
            <option value="Failed">Failed</option>
          </select>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => void loadReceipts(true)} disabled={loading || refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={handleExportCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-lg font-semibold text-foreground">Could not load receipts</h3>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" className="mt-4 bg-transparent" onClick={() => void loadReceipts(true)}>
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-lg font-semibold text-foreground">No receipts found</h3>
          <p className="mt-1 text-sm text-muted-foreground">{address ? "Your purchase receipts will appear here" : "Connect your wallet to see receipts"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((receipt, i) => (
            <motion.div
              key={receipt.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card
                className="border-border cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => setSelected(receipt)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-foreground font-mono text-sm">{receipt.id}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(receipt.createdAt).toLocaleDateString()} via {receipt.gateway}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-foreground">${receipt.amountFiat.toFixed(2)}</p>
                      <div className="flex items-center gap-1.5 justify-end">
                        <StatusPill status={receipt.gatewayStatus} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Receipt detail modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-foreground">Receipt Details</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setSelected(null)}>
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    {[
                      { label: "Receipt ID", value: selected.id },
                      { label: "Listing ID", value: selected.listingId },
                      { label: "Amount", value: `$${selected.amountFiat.toFixed(2)} ${selected.currency}` },
                      { label: "Gateway", value: selected.gateway },
                      { label: "Payment Status", value: selected.gatewayStatus },
                      { label: "On-chain Status", value: selected.onchainStatus },
                      { label: "Date", value: new Date(selected.createdAt).toLocaleString() },
                    ].map((row) => (
                      <div key={row.label} className="flex justify-between">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-medium text-foreground">{row.value}</span>
                      </div>
                    ))}
                    {selected.txHash && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tx Hash</span>
                        <a
                          href={`${txExplorerBaseUrl}${selected.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs text-primary flex items-center gap-1 hover:underline"
                        >
                          {selected.txHash.slice(0, 10)}...
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" className="w-full gap-2 bg-transparent" onClick={() => handleDownloadInvoice(selected)}>
                    <Download className="h-4 w-4" />
                    Download Invoice
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
