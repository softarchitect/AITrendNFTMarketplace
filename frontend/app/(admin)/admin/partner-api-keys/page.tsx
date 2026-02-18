"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Plus, Key, Copy, Check, Trash2, Loader2, X, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageTransition } from "@/components/page-transition"
import { getApiKeys, createApiKey, getApiKeyUsage, revokeApiKey, updateApiKey } from "@/lib/api"
import type { PartnerKey } from "@/lib/types"
import { toast } from "sonner"

export default function PartnerAPIKeysPage() {
  const [keys, setKeys] = useState<PartnerKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [showRawKey, setShowRawKey] = useState(false)
  const [creating, setCreating] = useState(false)
  const [label, setLabel] = useState("")
  const [perms, setPerms] = useState({ BulkPurchase: true, Transfer: true, Relist: false })
  const [usageByKeyId, setUsageByKeyId] = useState<Record<string, { requests: number; errors: number; lastCallAt: string }>>({})
  const [editingKey, setEditingKey] = useState<PartnerKey | null>(null)
  const [editLabel, setEditLabel] = useState("")
  const [editPerms, setEditPerms] = useState({ BulkPurchase: true, Transfer: true, Relist: false })
  const [updating, setUpdating] = useState(false)
  const [usageSort, setUsageSort] = useState<"latest" | "requests" | "errors">("latest")
  const [usageFilter, setUsageFilter] = useState<"all" | "active" | "errors">("all")
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Promise.all([getApiKeys(), getApiKeyUsage()])
      .then(([keyData, usage]) => {
        setKeys(keyData)
        const usageMap: Record<string, { requests: number; errors: number; lastCallAt: string }> = {}
        usage.forEach((item) => {
          usageMap[item.keyId] = {
            requests: item.requests,
            errors: item.errors,
            lastCallAt: item.lastCallAt
          }
        })
        setUsageByKeyId(usageMap)
      })
      .catch(() => {
        toast.error("Failed to load API keys")
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate() {
    if (!label.trim()) {
      toast.error("Label is required")
      return
    }
    setCreating(true)
    try {
      const selectedPerms = Object.entries(perms).filter(([, v]) => v).map(([k]) => k)
      if (selectedPerms.length === 0) {
        toast.error("Select at least one permission")
        setCreating(false)
        return
      }
      const result = await createApiKey(label.trim(), selectedPerms)
      setNewKey(result.key)
      setShowRawKey(false)
      setKeys((prev) => [...prev, result.partnerKey])
      setShowCreate(false)
      setLabel("")
      setPerms({ BulkPurchase: true, Transfer: true, Relist: false })
      toast.success("API key created!")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create API key"
      toast.error(message)
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(id: string) {
    try {
      await revokeApiKey(id)
      setKeys((prev) => prev.filter((k) => k.id !== id))
      setUsageByKeyId((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      toast.success("API key revoked")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to revoke API key"
      toast.error(message)
    }
  }

  function copyKey() {
    if (newKey) navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openEdit(key: PartnerKey) {
    setEditingKey(key)
    setEditLabel(key.label)
    setEditPerms({
      BulkPurchase: key.permissions.includes("BulkPurchase"),
      Transfer: key.permissions.includes("Transfer"),
      Relist: key.permissions.includes("Relist")
    })
  }

  async function handleUpdateKey() {
    if (!editingKey) return
    setUpdating(true)
    try {
      const selectedPerms = Object.entries(editPerms)
        .filter(([, v]) => v)
        .map(([k]) => k) as Array<"BulkPurchase" | "Transfer" | "Relist">
      if (selectedPerms.length === 0) {
        toast.error("Select at least one permission")
        setUpdating(false)
        return
      }
      const updated = await updateApiKey(editingKey.id, {
        label: editLabel.trim(),
        permissions: selectedPerms
      })
      setKeys((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      toast.success("API key updated")
      setEditingKey(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update API key"
      toast.error(message)
    } finally {
      setUpdating(false)
    }
  }

  const usageRows = keys
    .map((key) => ({
      key,
      requests: usageByKeyId[key.id]?.requests ?? 0,
      errors: usageByKeyId[key.id]?.errors ?? 0,
      lastCallAt: usageByKeyId[key.id]?.lastCallAt ?? ""
    }))
    .filter((row) => {
      if (usageFilter === "active") return row.requests > 0
      if (usageFilter === "errors") return row.errors > 0
      return true
    })
    .sort((a, b) => {
      if (usageSort === "requests") return b.requests - a.requests
      if (usageSort === "errors") return b.errors - a.errors
      return b.lastCallAt.localeCompare(a.lastCallAt)
    })

  return (
    <PageTransition>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Partner API Keys</h1>
          <p className="text-muted-foreground">Manage API keys for partner integrations</p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4" /> Create Key
        </Button>
      </div>

      {/* New key reveal modal */}
      <AnimatePresence>
        {newKey && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4" onClick={() => setNewKey(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" />
                    API Key Created
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5 p-3">
                    <p className="text-xs text-[hsl(var(--warning))] font-medium mb-1">This key will only be shown once</p>
                    <p className="text-xs text-muted-foreground">Copy it now and store it securely.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={newKey}
                      readOnly
                      type={showRawKey ? "text" : "password"}
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 bg-transparent"
                      onClick={() => setShowRawKey((current) => !current)}
                    >
                      {showRawKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      <span className="sr-only">{showRawKey ? "Hide key" : "Show key"}</span>
                    </Button>
                    <Button variant="outline" size="icon" className="shrink-0 bg-transparent" onClick={copyKey}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      <span className="sr-only">Copy key</span>
                    </Button>
                  </div>
                  <Button className="w-full" onClick={() => setNewKey(null)}>Done</Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create key form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 overflow-hidden">
            <Card className="border-border">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-foreground">Create New Key</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><X className="h-4 w-4" /><span className="sr-only">Close</span></Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Label</Label>
                  <Input placeholder="e.g. Production Key" value={label} onChange={(e) => setLabel(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Permissions</Label>
                  <div className="space-y-2">
                    {(["BulkPurchase", "Transfer", "Relist"] as const).map((perm) => (
                      <div key={perm} className="flex items-center gap-2">
                        <Checkbox checked={perms[perm]} onCheckedChange={(v) => setPerms({ ...perms, [perm]: !!v })} id={perm} />
                        <Label htmlFor={perm} className="text-sm text-foreground">{perm}</Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={creating || !label} className="gap-2">
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Key
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing keys */}
      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="space-y-3">
          {keys.map((key, i) => (
            <motion.div key={key.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Key className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{key.label}</p>
                      <p className="text-xs text-muted-foreground font-mono">{key.keyPrefix}...</p>
                      <div className="flex gap-1 mt-1">
                        {key.permissions.map((p) => (
                          <span key={p} className="rounded-md bg-secondary px-1.5 py-0.5 text-[9px] font-medium text-secondary-foreground">{p}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">Created: {new Date(key.createdAt).toLocaleDateString()}</p>
                      <p className="text-xs text-muted-foreground">Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString() : "Never"}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(key)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRevoke(key.id)}>
                      <Trash2 className="h-4 w-4" /><span className="sr-only">Revoke key</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* API usage mini table */}
      <div className="mt-8">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-foreground">API Usage (Last 7 days)</h3>
          <div className="flex gap-2">
            <Select value={usageSort} onValueChange={(value) => setUsageSort(value as "latest" | "requests" | "errors")}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest Call</SelectItem>
                <SelectItem value="requests">Most Requests</SelectItem>
                <SelectItem value="errors">Highest Errors</SelectItem>
              </SelectContent>
            </Select>
            <Select value={usageFilter} onValueChange={(value) => setUsageFilter(value as "all" | "active" | "errors")}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Keys</SelectItem>
                <SelectItem value="active">Active Keys</SelectItem>
                <SelectItem value="errors">Erroring Keys</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="grid grid-cols-4 gap-4 border-b border-border bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
            <span>Key</span><span>Requests</span><span>Errors</span><span>Last Call</span>
          </div>
          {usageRows.map((row) => (
            <div key={row.key.id} className="grid grid-cols-4 gap-4 border-b border-border px-4 py-2.5 text-sm last:border-b-0">
              <span className="text-foreground font-mono text-xs">{row.key.keyPrefix}...</span>
              <span className="text-foreground">{row.requests}</span>
              <span className="text-muted-foreground">{row.errors}</span>
              <span className="text-muted-foreground text-xs">
                {row.lastCallAt ? new Date(row.lastCallAt).toLocaleString() : "-"}
              </span>
            </div>
          ))}
          {usageRows.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No keys match the current usage filter.
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {editingKey && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={() => setEditingKey(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="w-full max-w-md"
              onClick={(event) => event.stopPropagation()}
            >
              <Card className="border-border">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-foreground">Edit API Key</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => setEditingKey(null)}>
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-foreground">Label</Label>
                    <Input value={editLabel} onChange={(event) => setEditLabel(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Permissions</Label>
                    <div className="space-y-2">
                      {(["BulkPurchase", "Transfer", "Relist"] as const).map((perm) => (
                        <div key={perm} className="flex items-center gap-2">
                          <Checkbox
                            checked={editPerms[perm]}
                            onCheckedChange={(value) => setEditPerms({ ...editPerms, [perm]: !!value })}
                            id={`edit-${perm}`}
                          />
                          <Label htmlFor={`edit-${perm}`} className="text-sm text-foreground">{perm}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" className="bg-transparent" onClick={() => setEditingKey(null)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateKey} disabled={updating}>
                      {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
