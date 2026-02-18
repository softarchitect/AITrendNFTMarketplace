"use client"

import React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Sparkles, LayoutDashboard, ImageIcon, Receipt, Activity, Settings, LogOut, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import { getUserSession, userLogout } from "@/lib/api"
import { clearUserSession, getUserDisplayName, hasUserSession } from "@/lib/auth/user"

const navItems = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/nfts", label: "My NFTs", icon: ImageIcon },
  { href: "/app/receipts", label: "Receipts", icon: Receipt },
  { href: "/app/activity", label: "Activity", icon: Activity },
  { href: "/app/settings", label: "Settings", icon: Settings },
]

function NavContent({
  pathname,
  onItemClick,
  onSignOut,
}: {
  pathname: string
  onItemClick?: () => void
  onSignOut?: () => void
}) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Account navigation">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onItemClick}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            pathname === item.href
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
      <div className="my-2 border-t border-border" />
      <Link
        href="/"
        onClick={onSignOut}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </Link>
    </nav>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [userName, setUserName] = useState("User")

  useEffect(() => {
    if (!hasUserSession()) {
      router.replace("/auth/sign-in")
      return
    }
    const cachedName = getUserDisplayName()
    if (cachedName) {
      setUserName(cachedName)
    }
    getUserSession()
      .then((session) => {
        setUserName(session.user.displayName || session.user.email)
        setAuthorized(true)
      })
      .catch(() => {
        clearUserSession()
        router.replace("/auth/sign-in")
      })
  }, [router])

  useEffect(() => {
    function handleIdentityUpdated() {
      const cachedName = getUserDisplayName()
      if (cachedName) {
        setUserName(cachedName)
      }
    }
    window.addEventListener("trendmint:user-identity-updated", handleIdentityUpdated)
    return () => window.removeEventListener("trendmint:user-identity-updated", handleIdentityUpdated)
  }, [])

  async function handleSignOut() {
    try {
      await userLogout()
    } catch {
      // Always clear local session even if backend logout fails.
    } finally {
      clearUserSession()
    }
  }

  if (!authorized) {
    return null
  }

  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "US"

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-4 pt-8">
                <NavContent pathname={pathname} onItemClick={() => setOpen(false)} onSignOut={() => void handleSignOut()} />
              </SheetContent>
            </Sheet>
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground">TrendMint</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-foreground">{userName}</p>
              <p className="text-[10px] text-muted-foreground">Collector</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-60 shrink-0 border-r border-border bg-card/50 p-4 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          <NavContent pathname={pathname} onSignOut={() => void handleSignOut()} />
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
