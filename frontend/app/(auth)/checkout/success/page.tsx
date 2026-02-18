"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function CheckoutSuccessPage() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
      <Card className="border-border text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
            <CheckCircle2 className="mx-auto h-16 w-16 text-[hsl(var(--success))]" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">Purchase Successful!</h1>
          <p className="text-muted-foreground">Your NFT has been transferred to your wallet. Check your collection to view it.</p>
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/app/nfts">
              <Button className="w-full gap-2">
                View My NFTs <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="outline" className="w-full bg-transparent">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
