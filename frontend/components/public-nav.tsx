"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { WalletButton } from "@/components/wallet-button"
import { ThemeToggle } from "@/components/theme-toggle"
import { useWallet } from "@/hooks/use-wallet"
import { getAdminDisplayName, hasAdminSession } from "@/lib/auth/admin"
import { getUserDisplayName, hasUserSession } from "@/lib/auth/user"
import { cn } from "@/lib/utils"

const links = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/collections", label: "Collections" },
  { href: "/how-it-works", label: "How it Works" },
  { href: "/drops", label: "Drops", badge: true },
]

export function PublicNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { isConnected } = useWallet()
  const [signedIn, setSignedIn] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [dashboardHref, setDashboardHref] = useState("/app")

  useEffect(() => {
    const syncIdentity = () => {
      const hasUser = hasUserSession()
      const hasAdmin = hasAdminSession()
      const hasIdentity = hasUser || hasAdmin || isConnected
      setSignedIn(hasIdentity)
      setDisplayName(getUserDisplayName() ?? getAdminDisplayName() ?? "")
      if (hasAdmin) {
        setDashboardHref("/admin")
      } else if (hasUser) {
        setDashboardHref("/app")
      } else {
        setDashboardHref("/auth/sign-in")
      }
    }
    syncIdentity()
    window.addEventListener("trendmint:user-identity-updated", syncIdentity)
    window.addEventListener("trendmint:admin-identity-updated", syncIdentity)
    return () => {
      window.removeEventListener("trendmint:user-identity-updated", syncIdentity)
      window.removeEventListener("trendmint:admin-identity-updated", syncIdentity)
    }
  }, [isConnected])

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold text-foreground">TrendMint</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative px-3 py-2 text-sm font-medium transition-colors rounded-lg",
                pathname === link.href
                  ? "text-foreground bg-secondary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              {link.label}
              {link.badge && (
                <span className="ml-1.5 inline-flex items-center rounded-full bg-[hsl(var(--success))] px-1.5 py-0.5 text-[9px] font-bold text-[hsl(var(--success-foreground))] uppercase">
                  New
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <WalletButton />
          {signedIn ? (
            <Link href={dashboardHref}>
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-muted-foreground">
                {displayName ? `Hi, ${displayName}` : "Dashboard"}
              </Button>
            </Link>
          ) : (
            <Link href="/auth/sign-in">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-muted-foreground">
                Sign In
              </Button>
            </Link>
          )}

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile navigation">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      pathname === link.href ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="my-3 border-t border-border" />
                {signedIn ? (
                  <Link href={dashboardHref} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                    {displayName ? `Hi, ${displayName}` : "Dashboard"}
                  </Link>
                ) : (
                  <>
                    <Link href="/auth/sign-in" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                      Sign In
                    </Link>
                    <Link href="/auth/sign-up" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">
                      Sign Up
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
