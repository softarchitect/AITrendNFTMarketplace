"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { Layers } from "lucide-react"
import { StatusPill } from "@/components/status-pill"
import { PriceTag } from "@/components/price-tag"
import type { NFT } from "@/lib/types"
import { cn } from "@/lib/utils"

export function NFTCard({ nft, className }: { nft: NFT; className?: string }) {
  return (
    <Link href={`/nft/${nft.id}`}>
      <motion.div
        whileHover={{ y: -4, rotateY: 1, rotateX: -1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        className={cn(
          "group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300",
          className
        )}
      >
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <Image
            src={nft.imageUrl || "/placeholder.svg"}
            alt={nft.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute top-3 right-3">
            <StatusPill status={nft.status} />
          </div>
          {nft.status === "Minting" && (
            <div className="absolute bottom-3 left-3">
              <MintingIndicator />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="mb-1 flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {nft.title}
            </h3>
          </div>

          <div className="mb-3 flex flex-wrap gap-1">
            {nft.themes.slice(0, 2).map((theme) => (
              <span key={theme} className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                {theme}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <PriceTag eth={nft.priceEth} fiat={nft.priceFiat} size="sm" />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Layers className="h-3 w-3" />
              {nft.editionAvailable}/{nft.editionSize}
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}

function MintingIndicator() {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-primary/90 px-2.5 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-foreground opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-foreground" />
      </span>
      Minting
    </div>
  )
}

export function NFTCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="aspect-square animate-pulse bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="flex gap-1">
          <div className="h-4 w-14 animate-pulse rounded bg-muted" />
          <div className="h-4 w-14 animate-pulse rounded bg-muted" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-12 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  )
}
