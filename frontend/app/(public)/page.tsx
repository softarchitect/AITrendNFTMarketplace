"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Zap, Cpu, Coins, TrendingUp, Clock, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NFTGrid } from "@/components/nft-grid"
import { TrendChips, FloatingTrendChips } from "@/components/trend-chips"
import { PageTransition } from "@/components/page-transition"
import { getFeaturedNFTs } from "@/lib/api"
import type { NFT } from "@/lib/types"

export default function HomePage() {
  const [featured, setFeatured] = useState<NFT[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFeaturedNFTs().then((data) => { setFeatured(data); setLoading(false) })
  }, [])

  return (
    <PageTransition>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-[hsl(var(--accent))]/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_50%)]" />
        <FloatingTrendChips className="absolute inset-0 hidden lg:block" />

        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:py-32 lg:py-40">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-6">
                <Zap className="h-3 w-3" />
                AI-Powered NFT Generation
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              Trends become art.{" "}
              <span className="text-primary">Art becomes yours.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-pretty text-lg text-muted-foreground leading-relaxed"
            >
              TrendMint monitors the pulse of the internet, transforms trending moments into unique
              AI-generated artwork, and mints them as limited-edition NFTs on Ethereum.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Link href="/marketplace">
                <Button size="lg" className="gap-2 rounded-xl px-6">
                  Explore Marketplace
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/drops">
                <Button variant="outline" size="lg" className="gap-2 rounded-xl px-6 bg-transparent">
                  View Latest Drop
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Trending Chips */}
      <section className="border-y border-border bg-card/50 py-6">
        <div className="mx-auto max-w-7xl px-4">
          <TrendChips />
        </div>
      </section>

      {/* Freshly Minted */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Freshly Minted</h2>
            <p className="mt-1 text-muted-foreground">The latest AI-generated pieces from trending topics.</p>
          </div>
          <Link href="/marketplace" className="hidden sm:block">
            <Button variant="ghost" className="gap-1 text-muted-foreground">
              View all <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <NFTGrid nfts={featured} loading={loading} className="lg:grid-cols-3" />
      </section>

      {/* How it Works */}
      <section className="border-t border-border bg-card/50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">How It Works</h2>
            <p className="mt-2 text-muted-foreground">From trending topic to collectible NFT in minutes.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { icon: TrendingUp, title: "Trend Detection", desc: "Our AI monitors Twitter/X, Reddit, Instagram, and news aggregators to identify trending topics and cultural moments in real-time.", step: "01" },
              { icon: Cpu, title: "AI Generation", desc: "Advanced AI models transform each trend into unique, high-quality digital artwork with custom prompts and style parameters.", step: "02" },
              { icon: Coins, title: "Mint & List", desc: "Artwork is minted as ERC-721 NFTs on Ethereum, pinned to IPFS, and listed with limited editions on our marketplace.", step: "03" },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="relative rounded-2xl border border-border bg-card p-6 text-center"
              >
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
                  {item.step}
                </span>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <item.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "NFTs Minted Today", value: "12", icon: Layers },
            { label: "Avg Time to List", value: "4.2 min", icon: Clock },
            { label: "Total Volume", value: "45.8 ETH", icon: Coins },
            { label: "Active Collectors", value: "342", icon: TrendingUp },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl border border-border bg-card p-5 text-center"
            >
              <stat.icon className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </PageTransition>
  )
}
