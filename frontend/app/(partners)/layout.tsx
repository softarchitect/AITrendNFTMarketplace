"use client"

import React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sparkles, BookOpen, Terminal, ShoppingCart, Webhook, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/partners", label: "Overview", icon: BookOpen },
  { href: "/partners/docs", label: "API Docs", icon: BookOpen },
  { href: "/partners/try", label: "Try API", icon: Terminal },
  { href: "/partners/webhooks", label: "Webhooks", icon: Webhook },
]

function PartnerNav({ pathname, onItemClick }: { pathname: string; onItemClick?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Partner navigation">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Partner Portal</p>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onItemClick}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === item.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden lg:flex lg:w-56 lg:flex-col lg:border-r lg:border-border bg-card/50">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">TrendMint</span>
          <span className="ml-auto rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary uppercase">API</span>
        </div>
        <div className="flex-1 p-3">
          <PartnerNav pathname={pathname} />
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" /><span className="sr-only">Open partner menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-56 p-3 pt-8">
                <PartnerNav pathname={pathname} onItemClick={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <h2 className="text-sm font-semibold text-foreground lg:hidden">Partner Portal</h2>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
