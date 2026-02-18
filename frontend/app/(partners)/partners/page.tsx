"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, ShoppingCart, ArrowRightLeft, RefreshCw, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageTransition } from "@/components/page-transition"

export default function PartnersLandingPage() {
  const capabilities = [
    { icon: ShoppingCart, title: "Bulk Purchase", desc: "Purchase multiple NFTs in a single API call with volume discounts and batch processing." },
    { icon: ArrowRightLeft, title: "Transfer", desc: "Transfer NFTs between wallets programmatically with automatic gas estimation." },
    { icon: RefreshCw, title: "Relist", desc: "Relist NFTs with updated pricing, editions, and metadata through the API." },
    { icon: Zap, title: "Real-time Events", desc: "Subscribe to webhooks for purchase confirmations, transfer completions, and mint events." },
  ]

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl">
        <div className="mb-10 text-center">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-4">
            Partner API
          </span>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Build with TrendMint</h1>
          <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
            Integrate our NFT marketplace into your platform. Automate purchases, transfers, and relisting through our RESTful API.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8">
          {capabilities.map((cap, i) => (
            <motion.div key={cap.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="border-border h-full">
                <CardContent className="p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 mb-3">
                    <cap.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{cap.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{cap.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/partners/docs">
            <Button size="lg" className="gap-2">
              View API Docs <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/partners/try">
            <Button size="lg" variant="outline" className="gap-2 bg-transparent">
              Try the Sandbox
            </Button>
          </Link>
        </div>
      </div>
    </PageTransition>
  )
}
