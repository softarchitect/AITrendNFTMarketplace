"use client"

import { useState } from "react"
import { Search, SlidersHorizontal, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export interface FilterState {
  search: string
  theme: string
  source: string
  status: string
  sort: string
}

export const defaultFilters: FilterState = {
  search: "",
  theme: "",
  source: "",
  status: "",
  sort: "newest",
}

export function FilterBar({
  filters,
  onFiltersChange,
  options,
  className,
}: {
  filters: FilterState
  onFiltersChange: (f: FilterState) => void
  options?: {
    themes?: string[]
    sources?: string[]
    statuses?: string[]
  }
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const activeCount = [filters.theme, filters.source, filters.status].filter(Boolean).length
  const themeOptions = options?.themes && options.themes.length > 0
    ? options.themes
    : ["AI Art", "Cyberpunk", "Nature", "Space", "Street Art", "Retro", "Science"]
  const sourceOptions = options?.sources && options.sources.length > 0
    ? options.sources
    : ["Twitter/X", "Reddit", "Instagram", "Aggregator"]
  const statusOptions = options?.statuses && options.statuses.length > 0
    ? options.statuses
    : ["Listed", "SoldOut", "Minting", "Generating"]

  const update = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value })
  }

  const clearAll = () => onFiltersChange(defaultFilters)

  const filterSelects = (
    <>
      <Select value={filters.theme} onValueChange={(v) => update("theme", v)}>
        <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Theme" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Themes</SelectItem>
          {themeOptions.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.source} onValueChange={(v) => update("source", v)}>
        <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Source" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          {sourceOptions.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.status} onValueChange={(v) => update("status", v)}>
        <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {statusOptions.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  )

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search NFTs..."
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Desktop filters */}
        <div className="hidden md:flex items-center gap-2">
          {filterSelects}
        </div>

        <Select value={filters.sort} onValueChange={(v) => update("sort", v)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price-asc">Price: Low</SelectItem>
            <SelectItem value="price-desc">Price: High</SelectItem>
            <SelectItem value="trending">Trending</SelectItem>
          </SelectContent>
        </Select>

        {/* Mobile filter drawer */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden relative bg-transparent">
              <SlidersHorizontal className="h-4 w-4" />
              {activeCount > 0 && (
                <Badge className="absolute -right-1.5 -top-1.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                  {activeCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
            <div className="mt-4 space-y-3">
              {filterSelects}
              <Button variant="outline" onClick={() => { clearAll(); setOpen(false) }} className="w-full">
                Clear All
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {activeCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="hidden md:flex gap-1 text-muted-foreground">
            <X className="h-3 w-3" /> Clear
          </Button>
        )}
      </div>
    </div>
  )
}


