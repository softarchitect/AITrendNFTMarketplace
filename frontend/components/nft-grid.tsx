"use client"

import { motion } from "framer-motion"
import { NFTCard, NFTCardSkeleton } from "@/components/nft-card"
import type { NFT } from "@/lib/types"
import { cn } from "@/lib/utils"

export function NFTGrid({
  nfts,
  loading = false,
  className,
}: {
  nfts: NFT[]
  loading?: boolean
  className?: string
}) {
  if (loading) {
    return (
      <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}>
        {Array.from({ length: 8 }).map((_, i) => (
          <NFTCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (nfts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 rounded-2xl bg-muted p-6">
          <svg className="h-10 w-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v13.5A1.5 1.5 0 003.75 21z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-foreground">No NFTs found</h3>
        <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or check back later for new drops.</p>
      </div>
    )
  }

  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}>
      {nfts.map((nft, i) => (
        <motion.div
          key={nft.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.4 }}
        >
          <NFTCard nft={nft} />
        </motion.div>
      ))}
    </div>
  )
}
