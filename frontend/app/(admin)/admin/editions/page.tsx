"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Layers, Save, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageTransition } from "@/components/page-transition"
import { getEditionSettings, updateDefaultEditionSize, upsertEditionOverride } from "@/lib/api"
import { toast } from "sonner"

export default function EditionsPage() {
  const [defaultSize, setDefaultSize] = useState("50")
  const [loading, setLoading] = useState(true)
  const [overrides, setOverrides] = useState<Array<{ theme: string; size: number; collection: string }>>([])
  const [saving, setSaving] = useState(false)
  const [newTheme, setNewTheme] = useState("")
  const [newSize, setNewSize] = useState("25")

  useEffect(() => {
    getEditionSettings()
      .then((settings) => {
        setDefaultSize(String(settings.defaultSize))
        setOverrides(
          settings.overrides.map((item) => ({
            theme: item.seriesKey,
            size: item.size,
            collection: "-",
          }))
        )
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    await updateDefaultEditionSize(Number(defaultSize))
    setSaving(false)
    toast.success("Edition settings saved")
  }

  async function handleAddOverride() {
    const theme = newTheme.trim()
    const size = Number(newSize)
    if (!theme || !size || size <= 0) {
      toast.error("Enter a valid theme and size")
      return
    }
    await upsertEditionOverride(theme, size)
    setOverrides((prev) => {
      const exists = prev.some((item) => item.theme.toLowerCase() === theme.toLowerCase())
      if (exists) {
        return prev.map((item) => item.theme.toLowerCase() === theme.toLowerCase() ? { ...item, size } : item)
      }
      return [...prev, { theme, size, collection: "-" }]
    })
    setNewTheme("")
    setNewSize("25")
    toast.success("Override added")
  }

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Edition Defaults</h1>
        <p className="text-muted-foreground">Configure default edition sizes and per-theme overrides</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Layers className="h-5 w-5 text-primary" />
              Default Edition Size
            </CardTitle>
            <CardDescription className="text-muted-foreground">Applied to all new mints unless overridden</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Editions per NFT</Label>
              <Input type="number" value={defaultSize} onChange={(e) => setDefaultSize(e.target.value)} min="1" max="10000" />
            </div>
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                Preview: Each new NFT will be minted with <span className="font-semibold text-foreground">{defaultSize}</span> editions by default.
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Default
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Theme/Collection Overrides</CardTitle>
            <CardDescription className="text-muted-foreground">Custom edition sizes per theme or collection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overrides.map((ov, i) => (
              <motion.div key={ov.theme} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{ov.theme}</p>
                  <p className="text-xs text-muted-foreground">Collection: {ov.collection}</p>
                </div>
                <Input
                  type="number"
                  value={String(ov.size)}
                  className="w-20 text-center"
                  onChange={(e) => {
                    const nextSize = Number(e.target.value || 0)
                    setOverrides((prev) => prev.map((item) => item.theme === ov.theme ? { ...item, size: nextSize } : item))
                    void upsertEditionOverride(ov.theme, nextSize)
                  }}
                />
              </motion.div>
            ))}
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-xs text-muted-foreground">Add override</p>
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <Input placeholder="Theme or series key" value={newTheme} onChange={(e) => setNewTheme(e.target.value)} />
                <Input type="number" min="1" value={newSize} onChange={(e) => setNewSize(e.target.value)} />
              </div>
              <Button variant="outline" className="w-full bg-transparent" onClick={() => void handleAddOverride()}>
                Add Override
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      )}
    </PageTransition>
  )
}
