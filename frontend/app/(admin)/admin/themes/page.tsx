"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Pin, TrendingUp, GripVertical, Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { PageTransition } from "@/components/page-transition"
import { createTheme, getThemes, pinTheme, renameTheme, unpinTheme, updateTheme } from "@/lib/api"
import type { Theme } from "@/lib/types"
import { toast } from "sonner"

export default function ThemesPage() {
  const [themes, setThemes] = useState<Theme[]>([])
  const [loading, setLoading] = useState(true)
  const [newThemeName, setNewThemeName] = useState("")
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null)
  const [editingThemeName, setEditingThemeName] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getThemes().then((data) => { setThemes(data); setLoading(false) })
  }, [])

  const trending = themes.filter((t) => t.type === "Trending").sort((a, b) => a.priority - b.priority)
  const pinned = themes.filter((t) => t.type === "Pinned").sort((a, b) => a.priority - b.priority)

  function handleToggle(id: string) {
    const current = themes.find((theme) => theme.id === id)
    if (!current) return
    const nextActive = !current.active
    setThemes((prev) => prev.map((t) => t.id === id ? { ...t, active: nextActive } : t))
    void updateTheme(id, { active: nextActive })
      .then(() => {
        toast.success("Theme status updated")
      })
      .catch((error) => {
        setThemes((prev) => prev.map((t) => t.id === id ? { ...t, active: current.active } : t))
        const message = error instanceof Error ? error.message : "Failed to update status"
        toast.error(message)
      })
  }

  function normalizedName(value: string): string {
    return value.trim().replace(/\s+/g, " ")
  }

  async function handleCreateTheme() {
    const name = normalizedName(newThemeName)
    if (!name) {
      toast.error("Enter a theme name")
      return
    }
    if (themes.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Theme already exists")
      return
    }
    setSaving(true)
    try {
      const created = await createTheme({ name, type: "Pinned", active: true, description: "Pinned by admin" })
      setThemes((prev) => [...prev, created])
      setNewThemeName("")
      toast.success("Theme created")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create theme"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  function beginEdit(theme: Theme) {
    setEditingThemeId(theme.id)
    setEditingThemeName(theme.name)
  }

  async function handleSaveEdit(theme: Theme) {
    const nextName = normalizedName(editingThemeName)
    if (!nextName) {
      toast.error("Theme name is required")
      return
    }
    if (nextName.toLowerCase() === theme.name.toLowerCase()) {
      setEditingThemeId(null)
      setEditingThemeName("")
      return
    }
    setSaving(true)
    try {
      const updated = await renameTheme(theme.id, nextName)
      setThemes((prev) => prev.map((item) => (item.id === theme.id ? updated : item)))
      setEditingThemeId(null)
      setEditingThemeName("")
      toast.success("Theme updated")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update theme"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteTheme(theme: Theme) {
    setSaving(true)
    try {
      await unpinTheme(theme.id)
      setThemes((prev) => prev.filter((item) => item.id !== theme.id))
      if (editingThemeId === theme.id) {
        setEditingThemeId(null)
        setEditingThemeName("")
      }
      toast.success("Theme deleted")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete theme"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handlePin(id: string) {
    try {
      const updated = await pinTheme(id)
      setThemes((prev) => prev.map((item) => (item.id === id ? updated : item)))
      toast.success("Theme pinned as commissioned series")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to pin theme"
      toast.error(message)
    }
  }

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Themes</h1>
        <p className="text-muted-foreground">Manage trending and pinned (commissioned) themes</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : (
        <Tabs defaultValue="trending">
          <TabsList className="bg-secondary mb-6">
            <TabsTrigger value="trending" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Trending ({trending.length})</TabsTrigger>
            <TabsTrigger value="pinned" className="gap-1.5"><Pin className="h-3.5 w-3.5" /> Pinned ({pinned.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="trending">
            <div className="space-y-2">
              {trending.map((theme, i) => (
                <motion.div key={theme.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="border-border">
                    <CardContent className="flex items-center gap-4 p-4">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <span className="text-xs font-bold text-primary">{theme.priority}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingThemeId === theme.id ? (
                          <Input
                            value={editingThemeName}
                            onChange={(event) => setEditingThemeName(event.target.value)}
                            disabled={saving}
                          />
                        ) : (
                          <p className="font-medium text-foreground">{theme.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">{theme.description}</p>
                      </div>
                      <Switch checked={theme.active} onCheckedChange={() => handleToggle(theme.id)} />
                      {editingThemeId === theme.id ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-transparent"
                            onClick={() => void handleSaveEdit(theme)}
                            disabled={saving}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingThemeId(null)
                              setEditingThemeName("")
                            }}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="sm" className="bg-transparent gap-1" onClick={() => void handlePin(theme.id)}>
                            <Pin className="h-3 w-3" /> Pin
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => beginEdit(theme)} disabled={saving}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => void handleDeleteTheme(theme)} disabled={saving}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pinned">
            <Card className="mb-3 border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Create Theme</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 sm:flex-row">
                <Input
                  placeholder="e.g. Cyberpunk Streets"
                  value={newThemeName}
                  onChange={(event) => setNewThemeName(event.target.value)}
                  disabled={saving}
                />
                <Button className="gap-1.5" onClick={() => void handleCreateTheme()} disabled={saving}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Pinned
                </Button>
                <Button
                  variant="outline"
                  className="gap-1.5 bg-transparent"
                  onClick={() => {
                    const name = normalizedName(newThemeName)
                    if (!name) {
                      toast.error("Enter a theme name")
                      return
                    }
                    if (themes.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
                      toast.error("Theme already exists")
                      return
                    }
                    setSaving(true)
                    void createTheme({ name, type: "Trending", active: true, description: "Trending theme" })
                      .then((created) => {
                        setThemes((prev) => [...prev, created])
                        setNewThemeName("")
                        toast.success("Trending theme created")
                      })
                      .catch((error) => {
                        const message = error instanceof Error ? error.message : "Failed to create theme"
                        toast.error(message)
                      })
                      .finally(() => {
                        setSaving(false)
                      })
                  }}
                  disabled={saving}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Trending
                </Button>
              </CardContent>
            </Card>
            <div className="space-y-2">
              {pinned.map((theme, i) => (
                <motion.div key={theme.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="border-border">
                    <CardContent className="flex items-center gap-4 p-4">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--accent))]/10 shrink-0">
                        <Pin className="h-4 w-4 text-[hsl(var(--accent))]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {editingThemeId === theme.id ? (
                          <Input
                            value={editingThemeName}
                            onChange={(event) => setEditingThemeName(event.target.value)}
                            disabled={saving}
                          />
                        ) : (
                          <p className="font-medium text-foreground">{theme.name}</p>
                        )}
                        <p className="text-xs text-muted-foreground truncate">{theme.description}</p>
                      </div>
                      <Switch checked={theme.active} onCheckedChange={() => handleToggle(theme.id)} />
                      {editingThemeId === theme.id ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-transparent"
                            onClick={() => void handleSaveEdit(theme)}
                            disabled={saving}
                          >
                            Save
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingThemeId(null)
                              setEditingThemeName("")
                            }}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => beginEdit(theme)} disabled={saving}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => void handleDeleteTheme(theme)} disabled={saving}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
              {pinned.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No pinned themes. Pin a trending theme to create a commissioned series.</p>}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </PageTransition>
  )
}
