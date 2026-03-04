"use client"

import React from "react"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Sparkles, LayoutDashboard, ListOrdered, ImageIcon, TrendingUp, Palette,
  Layers, CreditCard, Users, Shield, Key, Settings, Activity, Menu, LogOut, LockKeyhole, FileText,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { changeAdminPassword, getAdminSession } from "@/lib/api"
import { clearAdminSession, getAdminDisplayName, hasAdminSession } from "@/lib/auth/admin"
import { toast } from "sonner"

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/minting-queue", label: "Minting Queue", icon: ListOrdered },
  { href: "/admin/nfts", label: "NFTs & Listings", icon: ImageIcon },
  { href: "/admin/trend-sources", label: "Trend Sources", icon: TrendingUp },
  { href: "/admin/themes", label: "Themes", icon: Palette },
  { href: "/admin/editions", label: "Editions", icon: Layers },
  { href: "/admin/payments", label: "Payments", icon: CreditCard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/admin-users", label: "Admin Users", icon: Shield },
  { href: "/admin/partner-api-keys", label: "API Keys", icon: Key },
  { href: "/admin/content", label: "Content CMS", icon: FileText },
  { href: "/admin/docs", label: "Documentation", icon: FileText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/system-status", label: "System Status", icon: Activity },
]

function AdminNav({ pathname, onItemClick }: { pathname: string; onItemClick?: () => void }) {
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Admin navigation">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Administration</p>
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={onItemClick}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === item.href
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
      <div className="my-2 border-t border-border" />
      <Link
        href="/"
        onClick={() => clearAdminSession()}
        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <LogOut className="h-4 w-4" />
        Exit Admin
      </Link>
    </nav>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [authorized, setAuthorized] = useState(false)
  const [adminName, setAdminName] = useState("Admin")
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  useEffect(() => {
    if (!hasAdminSession()) {
      router.replace("/auth/sign-in")
      return
    }
    const cachedName = getAdminDisplayName()
    if (cachedName) {
      setAdminName(cachedName)
    }
    getAdminSession()
      .then((session) => {
        setAdminName(session.user.displayName || session.user.email)
        setAuthorized(true)
      })
      .catch(() => {
        clearAdminSession()
        router.replace("/auth/sign-in")
      })
  }, [router])

  if (!authorized) {
    return null
  }

  const initials = adminName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "AD"

  const passwordChecks = {
    minLength: newPassword.length >= 10,
    hasUppercase: /[A-Z]/.test(newPassword),
    hasLowercase: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecial: /[^A-Za-z0-9]/.test(newPassword),
  }
  const hasStrongPassword =
    passwordChecks.minLength &&
    passwordChecks.hasUppercase &&
    passwordChecks.hasLowercase &&
    passwordChecks.hasNumber &&
    passwordChecks.hasSpecial
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword

  function resetPasswordForm() {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setIsUpdatingPassword(false)
  }

  function handlePasswordDialogOpenChange(nextOpen: boolean) {
    setPasswordDialogOpen(nextOpen)
    if (!nextOpen) {
      resetPasswordForm()
    }
  }

  async function handleChangePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!hasStrongPassword) {
      toast.error("New password does not meet complexity requirements.")
      return
    }
    if (!passwordsMatch) {
      toast.error("New password and confirmation do not match.")
      return
    }
    try {
      setIsUpdatingPassword(true)
      await changeAdminPassword(currentPassword, newPassword)
      toast.success("Password changed successfully")
      handlePasswordDialogOpenChange(false)
    } catch {
      toast.error("Password change failed. Check your current password and complexity requirements.")
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:border-r lg:border-border bg-card/50">
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">Affordable NFT</span>
          <span className="ml-auto rounded-md bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive uppercase">Admin</span>
        </div>
        <ScrollArea className="flex-1 p-3">
          <AdminNav pathname={pathname} />
        </ScrollArea>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open admin menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-60 p-3 pt-8">
                <AdminNav pathname={pathname} onItemClick={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <h2 className="text-sm font-semibold text-foreground lg:hidden">Admin Panel</h2>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={passwordDialogOpen} onOpenChange={handlePasswordDialogOpenChange}>
              <DialogTrigger asChild>
                <div className="flex items-center">
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="bg-transparent md:hidden"
                          aria-label="Change password"
                        >
                          <LockKeyhole className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Change password</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden bg-transparent md:inline-flex"
                  >
                    Change Password
                  </Button>
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                  <DialogDescription>
                    Update your admin password. Use a strong password to protect the dashboard.
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleChangePasswordSubmit}>
                  <div className="space-y-1.5">
                    <Label htmlFor="current-password">Current password</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password">New password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password">Confirm new password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      required
                    />
                  </div>
                  <div className="rounded-md border border-border p-3 text-xs text-muted-foreground">
                    <p className="mb-2 font-medium text-foreground">Password requirements</p>
                    <ul className="space-y-1">
                      <li className={passwordChecks.minLength ? "text-emerald-600" : undefined}>- At least 10 characters</li>
                      <li className={passwordChecks.hasUppercase ? "text-emerald-600" : undefined}>- At least one uppercase letter</li>
                      <li className={passwordChecks.hasLowercase ? "text-emerald-600" : undefined}>- At least one lowercase letter</li>
                      <li className={passwordChecks.hasNumber ? "text-emerald-600" : undefined}>- At least one number</li>
                      <li className={passwordChecks.hasSpecial ? "text-emerald-600" : undefined}>- At least one special character</li>
                      <li className={passwordsMatch ? "text-emerald-600" : undefined}>- New password and confirmation must match</li>
                    </ul>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handlePasswordDialogOpenChange(false)}
                      disabled={isUpdatingPassword}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!currentPassword || !hasStrongPassword || !passwordsMatch || isUpdatingPassword}
                    >
                      {isUpdatingPassword ? "Saving..." : "Save Password"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="text-xs font-medium text-foreground">{adminName}</p>
              <p className="text-[10px] text-muted-foreground">Administrator</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-xs font-semibold text-destructive">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
