"use client"

import { useEffect, useState } from "react"
import { CreditCard, Webhook, AlertTriangle, Save, Loader2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageTransition } from "@/components/page-transition"
import { getGatewayConfig, getGatewayHealth, getMintControls, getWebhookLogs, updateGatewayConfig, updateMintControls } from "@/lib/api"
import { toast } from "sonner"

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refreshingGateway, setRefreshingGateway] = useState(false)
  const [refreshingWebhooks, setRefreshingWebhooks] = useState(false)
  const [gatewayProvider, setGatewayProvider] = useState<"mock" | "generic" | "vellis" | "wert" | "nowpayments">("mock")
  const [gatewayMode, setGatewayMode] = useState<"sandbox" | "live">("sandbox")
  const [runtimeAdapterProvider, setRuntimeAdapterProvider] = useState("mock")
  const [gatewayStatus, setGatewayStatus] = useState<"healthy" | "degraded">("healthy")
  const [gatewayDetail, setGatewayDetail] = useState("OK")
  const [webhookHeader, setWebhookHeader] = useState("x-payment-signature")
  const [webhookVerification, setWebhookVerification] = useState(false)
  const [dailyCap, setDailyCap] = useState("50")
  const [hourlyCap, setHourlyCap] = useState("10")
  const [pipelineEnabled, setPipelineEnabled] = useState(true)
  const [scheduleEnabled, setScheduleEnabled] = useState(true)
  const [webhookLogs, setWebhookLogs] = useState<Array<{ id: string; status: string; createdAt: string; externalRef?: string; reason?: string }>>([])

  async function refreshRuntimeStatus(options?: { gatewayOnly?: boolean; webhooksOnly?: boolean }) {
    const gatewayOnly = options?.gatewayOnly === true
    const webhooksOnly = options?.webhooksOnly === true
    if (!webhooksOnly) {
      setRefreshingGateway(true)
    }
    if (!gatewayOnly) {
      setRefreshingWebhooks(true)
    }
    try {
      const tasks: Array<Promise<void>> = []
      if (!webhooksOnly) {
        tasks.push(
          Promise.all([getGatewayConfig(), getGatewayHealth()]).then(([gateway, health]) => {
            setGatewayProvider(gateway.provider)
            setGatewayMode(gateway.mode)
            setRuntimeAdapterProvider(health.provider)
            setGatewayStatus(health.ok ? "healthy" : "degraded")
            setGatewayDetail(health.detail)
            setWebhookHeader(gateway.webhookSignatureHeader)
            setWebhookVerification(gateway.webhookVerificationEnabled)
          })
        )
      }
      if (!gatewayOnly) {
        tasks.push(
          getWebhookLogs().then((logs) => {
            setWebhookLogs(logs)
          })
        )
      }
      await Promise.all(tasks)
    } catch {
      toast.error("Failed to refresh runtime status")
    } finally {
      setRefreshingGateway(false)
      setRefreshingWebhooks(false)
    }
  }

  useEffect(() => {
    Promise.all([getMintControls(), refreshRuntimeStatus()])
      .then(([controls]) => {
        setDailyCap(String(controls.dailyCap))
        setHourlyCap(String(controls.hourlyCap))
        setPipelineEnabled(controls.pipelineEnabled)
        setScheduleEnabled(controls.scheduleEnabled)
      })
      .catch(() => {
        toast.error("Failed to load admin settings")
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    const parsedDailyCap = Number(dailyCap)
    const parsedHourlyCap = Number(hourlyCap)
    if (!Number.isFinite(parsedDailyCap) || parsedDailyCap < 1) {
      toast.error("Daily cap must be a positive number.")
      return
    }
    if (!Number.isFinite(parsedHourlyCap) || parsedHourlyCap < 1) {
      toast.error("Hourly cap must be a positive number.")
      return
    }
    if (parsedHourlyCap > parsedDailyCap) {
      toast.error("Hourly cap cannot exceed daily cap.")
      return
    }
    const normalizedWebhookHeader = webhookHeader.trim().toLowerCase()
    if (!/^[a-z0-9-]+$/i.test(normalizedWebhookHeader)) {
      toast.error("Webhook signature header must contain only letters, numbers, and dashes.")
      return
    }
    setSaving(true)
    try {
      await Promise.all([
        updateMintControls({
          dailyCap: parsedDailyCap,
          hourlyCap: parsedHourlyCap,
          pipelineEnabled,
          scheduleEnabled
        }),
        updateGatewayConfig({
          provider: gatewayProvider,
          mode: gatewayMode,
          webhookVerificationEnabled: webhookVerification,
          webhookSignatureHeader: normalizedWebhookHeader
        })
      ])
      setWebhookHeader(normalizedWebhookHeader)
      await refreshRuntimeStatus({ gatewayOnly: true })
      toast.success("Settings saved")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save settings"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  function runtimeAdapterNote(): string {
    if (gatewayMode === "sandbox" && runtimeAdapterProvider === "mock" && gatewayProvider !== "mock") {
      return "Sandbox mode is active, so checkout uses mock adapter until you switch mode to live."
    }
    if (runtimeAdapterProvider !== gatewayProvider) {
      return `Using ${runtimeAdapterProvider} adapter at runtime. Configured provider is ${gatewayProvider}.`
    }
    return "Configured provider and runtime adapter are aligned."
  }

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Admin Settings</h1>
        <p className="text-muted-foreground">Configure gateway, mint controls, and webhook monitoring</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (
      <div className="space-y-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground"><CreditCard className="h-5 w-5 text-primary" /> Payment Gateway Adapter</CardTitle>
            <CardDescription className="text-muted-foreground">Persisted gateway settings used by checkout and health checks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                className="gap-2 bg-transparent"
                onClick={() => void refreshRuntimeStatus({ gatewayOnly: true })}
                disabled={refreshingGateway}
              >
                {refreshingGateway ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Check Gateway Now
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-foreground">Provider</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={gatewayProvider}
                  onChange={(e) =>
                    setGatewayProvider(e.target.value as "mock" | "generic" | "vellis" | "wert" | "nowpayments")
                  }
                >
                  <option value="mock">mock</option>
                  <option value="generic">generic</option>
                  <option value="vellis">vellis</option>
                  <option value="wert">wert</option>
                  <option value="nowpayments">nowpayments</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Mode</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={gatewayMode}
                  onChange={(e) => setGatewayMode(e.target.value as "sandbox" | "live")}
                >
                  <option value="sandbox">sandbox</option>
                  <option value="live">live</option>
                </select>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Health</p>
                <p className={`text-sm font-medium ${gatewayStatus === "healthy" ? "text-[hsl(var(--success))]" : "text-destructive"}`}>
                  {gatewayStatus}
                </p>
                <p className="text-xs text-muted-foreground">{gatewayDetail}</p>
              </div>
              <div className="rounded-lg border border-border p-3 sm:col-span-2">
                <p className="text-xs text-muted-foreground">Effective Runtime Adapter</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                    {runtimeAdapterProvider}
                  </span>
                  <span className="text-xs text-muted-foreground">mode: {gatewayMode}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{runtimeAdapterNote()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground"><Webhook className="h-5 w-5 text-primary" /> Webhooks</CardTitle>
            <CardDescription className="text-muted-foreground">Webhook verification and latest delivery logs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                className="gap-2 bg-transparent"
                onClick={() => void refreshRuntimeStatus({ webhooksOnly: true })}
                disabled={refreshingWebhooks}
              >
                {refreshingWebhooks ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh Logs
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-foreground">Signature Header</Label>
                <Input
                  value={webhookHeader}
                  onChange={(e) => setWebhookHeader(e.target.value)}
                  placeholder="x-payment-signature"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-sm text-foreground">Verification enabled</span>
                <Switch checked={webhookVerification} onCheckedChange={setWebhookVerification} />
              </div>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-border bg-muted/50 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>External Ref</span>
                <span>Status</span>
                <span>Time</span>
              </div>
              {webhookLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-border px-3 py-2 text-xs last:border-b-0">
                  <span className="text-foreground font-mono">{log.externalRef ?? "-"}</span>
                  <span className={log.status === "accepted" ? "text-[hsl(var(--success))]" : "text-destructive"}>
                    {log.status}
                  </span>
                  <div className="text-right">
                    <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleTimeString()}</span>
                    {log.reason && <p className="text-[10px] text-destructive">{log.reason}</p>}
                  </div>
                </div>
              ))}
              {webhookLogs.length === 0 && (
                <p className="p-3 text-xs text-muted-foreground">No webhook events yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground"><AlertTriangle className="h-5 w-5 text-[hsl(var(--warning))]" /> Mint Controls</CardTitle>
            <CardDescription className="text-muted-foreground">Generation caps and automation toggles</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-foreground">Daily cap</Label>
                <Input type="number" value={dailyCap} onChange={(e) => setDailyCap(e.target.value)} min={1} />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Hourly cap</Label>
                <Input type="number" value={hourlyCap} onChange={(e) => setHourlyCap(e.target.value)} min={1} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm text-foreground">Pipeline enabled</span>
              <Switch checked={pipelineEnabled} onCheckedChange={setPipelineEnabled} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm text-foreground">Schedule enabled</span>
              <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save All Settings
        </Button>
      </div>
      )}
    </PageTransition>
  )
}
