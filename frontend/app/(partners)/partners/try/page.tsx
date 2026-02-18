"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Play, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PageTransition } from "@/components/page-transition"
import { testApiCall } from "@/lib/api"

export default function TryAPIPage() {
  const [endpoint, setEndpoint] = useState("/api/v1/inventory")
  const [apiKey, setApiKey] = useState("")
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<{ status: number; body: object } | null>(null)

  async function handleTest() {
    setLoading(true)
    const result = await testApiCall(endpoint, apiKey)
    setResponse(result)
    setLoading(false)
  }

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Try the API</h1>
        <p className="text-muted-foreground">Test API endpoints in our sandbox environment</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Request */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Endpoint</Label>
              <Select value={endpoint} onValueChange={setEndpoint}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="/api/v1/inventory">GET /api/v1/inventory</SelectItem>
                  <SelectItem value="/api/v1/bulk-purchase">POST /api/v1/bulk-purchase</SelectItem>
                  <SelectItem value="/api/v1/transfer">POST /api/v1/transfer</SelectItem>
                  <SelectItem value="/api/v1/relist">POST /api/v1/relist</SelectItem>
                  <SelectItem value="/api/v1/receipts">GET /api/v1/receipts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">API Key</Label>
              <Input type="password" placeholder="pk_test_xxxxxxxx" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            </div>
            <div className="rounded-lg border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))] shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">Sandbox mode: All requests return mock data. Rate limit: 100 req/min.</p>
            </div>
            <Button onClick={handleTest} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Send Request
            </Button>
          </CardContent>
        </Card>

        {/* Response */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Response</CardTitle>
          </CardHeader>
          <CardContent>
            {response ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-md bg-[hsl(var(--success))]/10 px-2 py-0.5 text-xs font-mono font-semibold text-[hsl(var(--success))]">
                    {response.status} OK
                  </span>
                  <span className="text-xs text-muted-foreground">application/json</span>
                </div>
                <pre className="rounded-lg bg-muted p-4 text-sm font-mono text-foreground overflow-auto max-h-64">
                  {JSON.stringify(response.body, null, 2)}
                </pre>
              </motion.div>
            ) : (
              <div className="flex items-center justify-center py-16 text-center">
                <div>
                  <Play className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Send a request to see the response</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  )
}
