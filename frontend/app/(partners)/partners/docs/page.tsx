"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Lock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PageTransition } from "@/components/page-transition"
import { getPartnerDocs } from "@/lib/api"
import { cn } from "@/lib/utils"

const methodColors: Record<string, string> = {
  GET: "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/30",
  POST: "bg-primary/10 text-primary border-primary/30",
  PUT: "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30",
  DELETE: "bg-destructive/10 text-destructive border-destructive/30",
}

export default function PartnerDocsPage() {
  const [docs, setDocs] = useState<{ endpoints: { method: string; path: string; description: string; auth: string }[] } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPartnerDocs().then((data) => { setDocs(data); setLoading(false) })
  }, [])

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">API Documentation</h1>
        <p className="text-muted-foreground">Complete reference for the TrendMint Partner API</p>
      </div>

      {/* Auth section */}
      <Card className="border-border mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Lock className="h-4 w-4 text-primary" />
            Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">All API requests require a valid API key passed via the Authorization header.</p>
          <div className="rounded-lg bg-muted p-4 font-mono text-sm text-foreground">
            <span className="text-muted-foreground">Authorization:</span> Bearer pk_live_your_api_key_here
          </div>
          <p className="text-xs text-muted-foreground">API keys can be managed from the Admin dashboard under Partner API Keys.</p>
        </CardContent>
      </Card>

      {/* Endpoints */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : docs && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Endpoints</h2>
          {docs.endpoints.map((ep, i) => (
            <motion.div key={ep.path} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border">
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <Badge variant="outline" className={cn("font-mono text-xs border", methodColors[ep.method])}>
                      {ep.method}
                    </Badge>
                    <code className="text-sm font-mono text-foreground">{ep.path}</code>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{ep.description}</p>
                  <p className="text-xs text-muted-foreground">Auth: {ep.auth}</p>

                  {/* Sample curl */}
                  <div className="mt-3 rounded-lg bg-muted p-3 font-mono text-xs text-muted-foreground overflow-x-auto">
                    <pre>
{`curl -X ${ep.method} https://api.trendmint.io${ep.path} \\
  -H "Authorization: Bearer pk_live_xxxxx" \\
  -H "Content-Type: application/json"${ep.method === "POST" ? ` \\
  -d '{"items": ["nft-001"], "quantity": 1}'` : ""}`}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </PageTransition>
  )
}
