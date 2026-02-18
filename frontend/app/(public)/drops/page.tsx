"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Bell, Clock, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PriceTag } from "@/components/price-tag"
import { PageTransition } from "@/components/page-transition"
import { getDrops } from "@/lib/api"
import type { Drop } from "@/lib/types"
import { toast } from "sonner"

export default function DropsPage() {
  const [drops, setDrops] = useState<Drop[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDrops().then((d) => { setDrops(d); setLoading(false) })
  }, [])

  return (
    <PageTransition>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Latest Drops</h1>
            <p className="mt-1 text-muted-foreground">Recently minted and listed AI-generated NFTs.</p>
          </div>
          <Button variant="outline" className="gap-2 bg-transparent" onClick={() => toast.info("Notifications enabled (placeholder)")}>
            <Bell className="h-4 w-4" /> Notify Me
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {drops.map((drop, i) => (
              <motion.div
                key={drop.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Link href={`/nft/${drop.nftId}`}>
                  <div className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all sm:gap-6">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                      <Image
                        src={drop.imageUrl || "/placeholder.svg"}
                        alt={drop.title}
                        width={80}
                        height={80}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">{drop.title}</h3>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {drop.themes.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(drop.mintedAt).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{drop.editionSize} editions</span>
                      </div>
                    </div>
                    <div className="hidden sm:block text-right">
                      <PriceTag eth={drop.priceEth} size="sm" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
