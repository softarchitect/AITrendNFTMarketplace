"use client"

import { useEffect, useState } from "react"
import { use } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import {
  ArrowLeft, ExternalLink, ShieldCheck, CreditCard, Wallet,
  Minus, Plus, Hash, Link2, Box, FileText, Sparkles, TrendingUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { StatusPill } from "@/components/status-pill"
import { PriceTag } from "@/components/price-tag"
import { NFTGrid } from "@/components/nft-grid"
import { PageTransition } from "@/components/page-transition"
import { DetailSkeleton } from "@/components/skeletons"
import { getNFTById, getFeaturedNFTs } from "@/lib/api"
import type { NFT } from "@/lib/types"

const timelineSteps = ["Generated", "Minted", "Listed", "Sold"]

function getTimelineIndex(status: string) {
  switch (status) {
    case "Generating": return 0
    case "Minting": return 1
    case "Listed": return 2
    case "SoldOut": return 3
    default: return -1
  }
}

export default function NFTDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [nft, setNft] = useState<NFT | null>(null)
  const [related, setRelated] = useState<NFT[]>([])
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    setLoading(true)
    Promise.all([getNFTById(id), getFeaturedNFTs()]).then(([n, r]) => {
      setNft(n || null)
      setRelated(r.filter((x) => x.id !== id).slice(0, 4))
      setLoading(false)
    })
  }, [id])

  if (loading) return <DetailSkeleton />
  if (!nft) return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <h2 className="text-2xl font-bold text-foreground">NFT Not Found</h2>
      <p className="mt-2 text-muted-foreground">This NFT does not exist or has been removed.</p>
      <Link href="/marketplace"><Button className="mt-4">Back to Marketplace</Button></Link>
    </div>
  )

  const tIdx = getTimelineIndex(nft.status)
  const maxQty = Math.min(nft.editionAvailable, 10)

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        {/* Back */}
        <Link href="/marketplace" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Marketplace
        </Link>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Artwork */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative overflow-hidden rounded-2xl border border-border bg-card"
          >
            <div className="relative aspect-square w-full">
              <Image
                src={nft.imageUrl || "/placeholder.svg"}
                alt={nft.title}
                fill
                sizes="(max-width: 1024px) 100vw, 48vw"
                className="object-cover"
              />
            </div>
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <StatusPill status={nft.status} />
                <span className="text-xs text-muted-foreground font-mono">#{nft.tokenId}</span>
              </div>
              <h1 className="text-3xl font-bold text-foreground">{nft.title}</h1>
              <p className="mt-2 text-muted-foreground leading-relaxed">{nft.description}</p>
            </div>

            {/* Themes */}
            <div className="flex flex-wrap gap-2">
              {nft.themes.map((t) => (
                <Badge key={t} variant="secondary">{t}</Badge>
              ))}
              {nft.trendSources.map((s) => (
                <Badge key={s} variant="outline" className="gap-1">
                  <TrendingUp className="h-3 w-3" /> {s}
                </Badge>
              ))}
            </div>

            {/* Edition Module */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <PriceTag eth={nft.priceEth} fiat={nft.priceFiat} size="lg" />

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Editions available</span>
                <span className="font-semibold text-foreground">{nft.editionAvailable} / {nft.editionSize}</span>
              </div>

              {nft.editionAvailable > 0 && (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Qty</span>
                    <div className="flex items-center rounded-lg border border-border">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-medium">{qty}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQty(Math.min(maxQty, qty + 1))} disabled={qty >= maxQty}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="text-xs text-muted-foreground ml-auto">
                      Total: {(nft.priceEth * qty).toFixed(3)} ETH
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <Link href={`/checkout/${nft.id}`} className="flex-1">
                      <Button className="w-full gap-2 rounded-xl">
                        <CreditCard className="h-4 w-4" /> Buy with Fiat
                      </Button>
                    </Link>
                    <Link href={`/checkout/${nft.id}`} className="flex-1">
                      <Button variant="outline" className="w-full gap-2 rounded-xl bg-transparent">
                        <Wallet className="h-4 w-4" /> Buy with Crypto
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Status Timeline */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Status Timeline</h3>
              <div className="flex items-center">
                {timelineSteps.map((step, i) => (
                  <div key={step} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${i <= tIdx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {i + 1}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{step}</span>
                    </div>
                    {i < timelineSteps.length - 1 && (
                      <div className={`mx-1 h-0.5 flex-1 rounded ${i < tIdx ? "bg-primary" : "bg-border"}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Token Meta */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Token ID", value: `#${nft.tokenId}`, icon: Hash },
                { label: "Contract", value: `${nft.contractAddress.slice(0, 8)}...`, icon: FileText },
                { label: "Chain", value: "Ethereum", icon: Link2 },
                { label: "IPFS", value: nft.ipfsCid ? `${nft.ipfsCid.slice(0, 10)}...` : "Pending", icon: Box },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border bg-secondary/50 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <item.icon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.label}</span>
                  </div>
                  <p className="text-xs font-mono font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Traits */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Traits</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {nft.traits.map((trait) => (
                  <div key={trait.trait_type} className="rounded-xl border border-border bg-primary/5 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-primary">{trait.trait_type}</p>
                    <p className="text-xs font-semibold text-foreground mt-0.5">{trait.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Prompt Summary */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">AI Prompt Summary</h3>
              </div>
              <p className="text-sm text-muted-foreground italic leading-relaxed">&ldquo;{nft.promptSummary}&rdquo;</p>
            </div>
          </motion.div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold text-foreground mb-6">Related NFTs</h2>
            <NFTGrid nfts={related} className="lg:grid-cols-4" />
          </section>
        )}
      </div>
    </PageTransition>
  )
}
