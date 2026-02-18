"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Home, Search, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-md text-center"
      >
        <div className="mb-6 inline-flex items-center justify-center rounded-2xl bg-primary/10 p-6">
          <span className="text-6xl font-bold text-primary font-mono">404</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
        <p className="mt-2 text-muted-foreground leading-relaxed">
          The page you are looking for does not exist or may have been moved. Check the URL or head back to the marketplace.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/">
            <Button className="gap-2 rounded-xl">
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </Link>
          <Link href="/marketplace">
            <Button variant="outline" className="gap-2 rounded-xl bg-transparent">
              <Search className="h-4 w-4" />
              Browse Marketplace
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
