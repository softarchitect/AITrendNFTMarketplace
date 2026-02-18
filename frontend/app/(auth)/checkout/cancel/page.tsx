"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { XCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function CheckoutCancelPage() {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
      <Card className="border-border text-center">
        <CardContent className="pt-8 pb-8 space-y-4">
          <XCircle className="mx-auto h-16 w-16 text-destructive" />
          <h1 className="text-2xl font-bold text-foreground">Payment Cancelled</h1>
          <p className="text-muted-foreground">Your payment was cancelled. No charges have been made. The NFT is still available for purchase.</p>
          <div className="flex flex-col gap-2 pt-2">
            <Link href="/marketplace">
              <Button className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Marketplace
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
