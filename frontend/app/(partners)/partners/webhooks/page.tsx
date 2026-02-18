"use client"

import { motion } from "framer-motion"
import { Webhook, Plus, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { PageTransition } from "@/components/page-transition"
import { toast } from "sonner"

const events = [
  { id: "nft.minted", label: "NFT Minted", desc: "Triggered when a new NFT is minted" },
  { id: "nft.listed", label: "NFT Listed", desc: "Triggered when an NFT is listed on the marketplace" },
  { id: "payment.confirmed", label: "Payment Confirmed", desc: "Triggered when a payment is confirmed by the gateway" },
  { id: "transfer.complete", label: "Transfer Complete", desc: "Triggered when an on-chain transfer is complete" },
  { id: "transfer.failed", label: "Transfer Failed", desc: "Triggered if an on-chain transfer fails" },
]

export default function WebhooksPage() {
  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Webhooks</h1>
        <p className="text-muted-foreground">Configure webhook endpoints to receive real-time event notifications</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Webhook className="h-5 w-5 text-primary" />
              Webhook Configuration
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              This is a placeholder. Webhook functionality is coming soon.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Endpoint URL</Label>
              <Input placeholder="https://your-server.com/webhooks/trendmint" />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Signing Secret</Label>
              <Input type="password" placeholder="whsec_xxxxxxxxxxxxxxxx" />
            </div>
            <Button className="w-full gap-2" onClick={() => toast.info("Webhook configuration is a placeholder")}>
              <Plus className="h-4 w-4" /> Save Endpoint
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Events</CardTitle>
            <CardDescription className="text-muted-foreground">Select which events to subscribe to</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {events.map((event, i) => (
              <motion.div key={event.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <Checkbox id={event.id} defaultChecked={i < 3} />
                  <div>
                    <Label htmlFor={event.id} className="text-sm font-medium text-foreground">{event.label}</Label>
                    <p className="text-xs text-muted-foreground">{event.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Payload example */}
      <Card className="border-border mt-6">
        <CardHeader>
          <CardTitle className="text-foreground">Example Payload</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="rounded-lg bg-muted p-4 font-mono text-sm text-foreground overflow-auto">
{`{
  "event": "payment.confirmed",
  "timestamp": "2026-02-09T12:00:00Z",
  "data": {
    "receiptId": "rct-001",
    "listingId": "lst-003",
    "amountFiat": 130.00,
    "currency": "USD",
    "gateway": "Wert",
    "txHash": "0xabc123..."
  }
}`}
          </pre>
        </CardContent>
      </Card>
    </PageTransition>
  )
}
