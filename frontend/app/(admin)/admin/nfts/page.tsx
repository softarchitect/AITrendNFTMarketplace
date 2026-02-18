"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Search, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MintNowDialog } from "@/components/mint-now-dialog"
import { StatusPill } from "@/components/status-pill"
import { PageTransition } from "@/components/page-transition"
import { getAdminNFTs, getThemes, updateAdminListingThemes } from "@/lib/api"
import type { NFT } from "@/lib/types"
import { toast } from "sonner"

export default function AdminNFTsPage() {
  const router = useRouter()
  const [nfts, setNfts] = useState<NFT[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [themeFilter, setThemeFilter] = useState<string | null>(null)
  const [themeEditorOpen, setThemeEditorOpen] = useState(false)
  const [themeEditorNft, setThemeEditorNft] = useState<NFT | null>(null)
  const [themeSelections, setThemeSelections] = useState<string[]>([])
  const [customThemeInput, setCustomThemeInput] = useState("")
  const [availableThemes, setAvailableThemes] = useState<string[]>([])
  const [savingThemes, setSavingThemes] = useState(false)

  async function refreshNfts() {
    const data = await getAdminNFTs()
    setNfts(data)
  }

  useEffect(() => {
    Promise.all([refreshNfts(), getThemes()])
      .then(([, themes]) => {
        const options = Array.from(
          new Set(themes.map((theme) => theme.name.trim()).filter((name) => name.length > 0))
        )
        setAvailableThemes(options)
      })
      .catch(() => {
        toast.error("Failed to load NFTs/themes")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const filtered = nfts.filter((n) => {
    const query = search.toLowerCase()
    const matchesSearch =
      n.title.toLowerCase().includes(query) ||
      n.id.toLowerCase().includes(query) ||
      String(n.tokenId).includes(search)
    const matchesTheme =
      !themeFilter ||
      n.themes.some((theme) => theme.toLowerCase() === themeFilter.toLowerCase())
    return matchesSearch && matchesTheme
  })

  async function copyListingId(id: string) {
    await navigator.clipboard.writeText(id)
    toast.success("Listing ID copied")
  }

  function openThemeEditor(nft: NFT) {
    setThemeEditorNft(nft)
    setThemeSelections(nft.themes)
    setAvailableThemes((current) =>
      Array.from(new Set([...current, ...nft.themes.map((theme) => theme.trim()).filter((theme) => theme.length > 0)]))
    )
    setCustomThemeInput("")
    setThemeEditorOpen(true)
  }

  function toggleThemeSelection(theme: string) {
    setThemeSelections((current) =>
      current.includes(theme) ? current.filter((item) => item !== theme) : [...current, theme]
    )
  }

  function addCustomTheme() {
    const normalized = customThemeInput.trim().replace(/\s+/g, " ")
    if (!normalized) return
    setThemeSelections((current) => (current.includes(normalized) ? current : [...current, normalized]))
    setAvailableThemes((current) => (current.includes(normalized) ? current : [...current, normalized]))
    setCustomThemeInput("")
  }

  function removeSelectedTheme(themeToRemove: string) {
    setThemeSelections((current) => current.filter((theme) => theme !== themeToRemove))
  }

  async function handleSaveThemes() {
    if (!themeEditorNft) return
    const parsedThemes = Array.from(new Set(themeSelections.map((item) => item.trim()).filter((item) => item.length > 0)))
    setSavingThemes(true)
    try {
      const updated = await updateAdminListingThemes(themeEditorNft.id, parsedThemes)
      setNfts((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      toast.success("Listing themes updated")
      setThemeEditorOpen(false)
      setThemeEditorNft(null)
      setThemeSelections([])
      setCustomThemeInput("")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update themes"
      toast.error(message)
    } finally {
      setSavingThemes(false)
    }
  }

  return (
    <PageTransition>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">NFTs & Listings</h1>
          <p className="text-muted-foreground">{nfts.length} total NFTs</p>
        </div>
        <div className="flex items-center gap-2">
          <MintNowDialog onMintStarted={refreshNfts} />
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by title, ID, token..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {themeFilter && (
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent"
              onClick={() => setThemeFilter(null)}
            >
              Theme: {themeFilter} (Clear)
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_80px_80px_120px_100px_auto_auto] gap-4 border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <span>NFT</span><span>Token ID</span><span>Editions</span><span>Themes</span><span>Price</span><span>Status</span><span>Actions</span>
          </div>
          {filtered.map((nft, i) => (
            <motion.div
              key={nft.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              className="grid grid-cols-1 md:grid-cols-[1fr_80px_80px_120px_100px_auto_auto] gap-2 md:gap-4 items-center border-b border-border px-4 py-3 hover:bg-muted/30 transition-colors last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <Image
                  src={nft.imageUrl || "/placeholder.svg"}
                  alt={nft.title}
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-lg object-cover"
                />
                <div>
                  <p className="text-sm font-medium text-foreground truncate">{nft.title}</p>
                  <p className="text-xs text-muted-foreground font-mono">{nft.id}</p>
                </div>
              </div>
              <span className="text-sm text-foreground font-mono">{nft.tokenId || "-"}</span>
              <span className="text-sm text-muted-foreground">{nft.editionAvailable}/{nft.editionSize}</span>
              <div className="flex flex-wrap gap-1">
                {(nft.themes.length > 0 ? nft.themes : ["-"]).slice(0, 2).map((theme) => (
                  <button
                    key={`${nft.id}-${theme}`}
                    type="button"
                    onClick={() => {
                      if (theme === "-") return
                      setThemeFilter(theme)
                    }}
                    className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground hover:bg-secondary/80"
                  >
                    {theme}
                  </button>
                ))}
              </div>
              <span className="text-sm font-medium text-foreground">{nft.priceEth} ETH</span>
              <StatusPill status={nft.status} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" /><span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => router.push(`/nft/${nft.id}`)}>View Details</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void copyListingId(nft.id)}>Copy Listing ID</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openThemeEditor(nft)}>Edit Themes</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={themeEditorOpen} onOpenChange={setThemeEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit NFT Themes</DialogTitle>
            <DialogDescription>
              Select existing themes, or add custom ones manually.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Existing themes</p>
              <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-md border border-border p-2">
                {availableThemes.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No saved themes yet.</span>
                ) : (
                  availableThemes.map((theme) => {
                    const selected = themeSelections.includes(theme)
                    return (
                      <button
                        key={theme}
                        type="button"
                        onClick={() => toggleThemeSelection(theme)}
                        className={`rounded-md px-2 py-1 text-xs transition-colors ${
                          selected
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {theme}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Add custom theme</p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Desert Neon"
                  value={customThemeInput}
                  onChange={(event) => setCustomThemeInput(event.target.value)}
                  disabled={savingThemes}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      addCustomTheme()
                    }
                  }}
                />
                <Button type="button" variant="outline" className="bg-transparent" onClick={addCustomTheme} disabled={savingThemes}>
                  Add
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Selected themes</p>
              <div className="flex min-h-10 flex-wrap gap-2 rounded-md border border-border p-2">
                {themeSelections.length === 0 ? (
                  <span className="text-xs text-muted-foreground">No themes selected</span>
                ) : (
                  themeSelections.map((theme) => (
                    <button
                      key={`selected-${theme}`}
                      type="button"
                      onClick={() => removeSelectedTheme(theme)}
                      className="rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/85"
                      title="Remove theme"
                    >
                      {theme} ×
                    </button>
                  ))
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Listing: {themeEditorNft?.id ?? "-"}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => setThemeEditorOpen(false)}
              disabled={savingThemes}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleSaveThemes()} disabled={savingThemes}>
              Save Themes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
