"use client"

import React from "react"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Wallet, ShieldCheck, Smartphone, ImageIcon, Receipt, ArrowRight, CheckCircle2, Clock, AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageTransition } from "@/components/page-transition"
import { getMe, getReceipts, getUserActivity, getUserNFTs } from "@/lib/api"
import type { User, ActivityEvent } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useWallet } from "@/hooks/use-wallet"
import { toast } from "sonner"

export default function AppOverviewPage() {
  const [user, setUser] = useState<User | null>(null)
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [ownedCount, setOwnedCount] = useState(0)
  const [receiptCount, setReceiptCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { address, isConnected } = useWallet()

  const loadOverview = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    }
    try {
      const [u, a, owned, receipts] = await Promise.all([
        getMe(),
        getUserActivity(address),
        getUserNFTs(address),
        getReceipts(address)
      ])
      setUser(u)
      setActivity(a.slice(0, 5))
      setOwnedCount(owned.length)
      setReceiptCount(receipts.length)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load overview"
      toast.error(message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [address])

  useEffect(() => {
    void loadOverview(false)
  }, [loadOverview])

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />)}
      </div>
    )
  }

  return (
    <PageTransition>
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Welcome back, {user?.displayName ?? "Collector"}</h1>
            <p className="text-muted-foreground">Here is your account overview.</p>
          </div>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => void loadOverview(true)} disabled={loading || refreshing}>
            {refreshing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <StatusCard
          icon={Wallet}
          title="Wallet"
          status={isConnected && address ? "Connected" : "Not Connected"}
          statusType={isConnected && address ? "success" : "warning"}
          detail={isConnected && address ? `${address.slice(0, 10)}...${address.slice(-4)}` : "No wallet linked"}
        />
        <StatusCard
          icon={ShieldCheck}
          title="KYC Status"
          status={user?.kycStatus || "Unknown"}
          statusType={user?.kycStatus === "Verified" ? "success" : user?.kycStatus === "Pending" ? "warning" : "error"}
          detail={user?.kycStatus === "Verified" ? "Identity verified" : "Complete verification to purchase"}
        />
        <StatusCard
          icon={Smartphone}
          title="Two-Factor Auth"
          status={user?.twoFAEnabled ? "Enabled" : "Disabled"}
          statusType={user?.twoFAEnabled ? "success" : "warning"}
          detail={user?.twoFAEnabled ? "Authenticator app active" : "Enable for extra security"}
        />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8">
        <Link href="/app/nfts">
          <Card className="border-border hover:border-primary/30 transition-colors cursor-pointer group">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <ImageIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">My NFTs</p>
                  <p className="text-sm text-muted-foreground">{ownedCount} item(s) in your collection</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/app/receipts">
          <Card className="border-border hover:border-primary/30 transition-colors cursor-pointer group">
            <CardContent className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--accent))]/10">
                  <Receipt className="h-5 w-5 text-[hsl(var(--accent))]" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Receipts</p>
                  <p className="text-sm text-muted-foreground">{receiptCount} purchase record(s)</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent activity */}
      <Card className="border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground">Recent Activity</CardTitle>
          <Link href="/app/activity">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activity.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <Image
                  src={event.nftImageUrl || "/placeholder.svg"}
                  alt={event.nftTitle}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{event.nftTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.type} {event.amount ? `- ${event.amount} ETH` : ""}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(event.timestamp).toLocaleDateString()}
                </span>
              </motion.div>
            ))}
            {activity.length === 0 && (
              <p className="text-sm text-muted-foreground py-2 text-center">
                {address ? "No activity yet. Start from the marketplace." : "Connect your wallet to load activity."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </PageTransition>
  )
}

function StatusCard({ icon: Icon, title, status, statusType, detail }: {
  icon: React.ElementType; title: string; status: string; statusType: "success" | "warning" | "error"; detail: string
}) {
  return (
    <Card className="border-border">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <span className={cn(
            "flex items-center gap-1 text-xs font-medium",
            statusType === "success" && "text-[hsl(var(--success))]",
            statusType === "warning" && "text-[hsl(var(--warning))]",
            statusType === "error" && "text-destructive"
          )}>
            {statusType === "success" && <CheckCircle2 className="h-3 w-3" />}
            {statusType === "warning" && <Clock className="h-3 w-3" />}
            {statusType === "error" && <AlertCircle className="h-3 w-3" />}
            {status}
          </span>
        </div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}
