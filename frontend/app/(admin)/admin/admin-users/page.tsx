"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, Circle, Eye, EyeOff, Loader2, Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageTransition } from "@/components/page-transition"
import { createAdminAccount, getAdminAccounts, type AdminAccountDto, updateAdminAccount } from "@/lib/api"
import { ApiError } from "@/lib/api/client"
import { getAdminEmail } from "@/lib/auth/admin"
import { toast } from "sonner"

function validateStrongPassword(password: string): string[] {
  const errors: string[] = []
  if (password.length < 10) errors.push("at least 10 characters")
  if (!/[A-Z]/.test(password)) errors.push("an uppercase letter")
  if (!/[a-z]/.test(password)) errors.push("a lowercase letter")
  if (!/[0-9]/.test(password)) errors.push("a number")
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("a special character")
  return errors
}

function getPasswordChecklist(password: string): Array<{ label: string; pass: boolean }> {
  return [
    { label: "At least 10 characters", pass: password.length >= 10 },
    { label: "At least one uppercase letter", pass: /[A-Z]/.test(password) },
    { label: "At least one lowercase letter", pass: /[a-z]/.test(password) },
    { label: "At least one number", pass: /[0-9]/.test(password) },
    { label: "At least one special character", pass: /[^A-Za-z0-9]/.test(password) },
  ]
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (Array.isArray(error.data)) {
      return error.data.map((item) => String(item)).join(", ")
    }
    if (error.data && typeof error.data === "object" && "error" in error.data) {
      const value = (error.data as { error: unknown }).error
      if (Array.isArray(value)) return value.map((item) => String(item)).join(", ")
      if (typeof value === "string") return value
    }
    return error.message || fallback
  }
  if (error instanceof Error) return error.message
  return fallback
}

export default function AdminUsersManagementPage() {
  const [accounts, setAccounts] = useState<AdminAccountDto[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetTarget, setResetTarget] = useState<AdminAccountDto | null>(null)
  const [resetPassword, setResetPassword] = useState("")
  const [resetPasswordVisible, setResetPasswordVisible] = useState(false)
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [password, setPassword] = useState("")

  const currentEmail = getAdminEmail()?.toLowerCase()

  useEffect(() => {
    getAdminAccounts()
      .then((items) => setAccounts(items))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate() {
    if (!email || !displayName || !password) {
      toast.error("Email, display name, and password are required")
      return
    }
    setCreating(true)
    try {
      const created = await createAdminAccount({
        email,
        displayName,
        password,
        isActive: true,
      })
      setAccounts((prev) => [created, ...prev])
      setEmail("")
      setDisplayName("")
      setPassword("")
      toast.success("Admin account created")
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to create admin account"))
    } finally {
      setCreating(false)
    }
  }

  async function handleToggleActive(account: AdminAccountDto, isActive: boolean) {
    try {
      const updated = await updateAdminAccount(account.id, { isActive })
      setAccounts((prev) => prev.map((item) => (item.id === account.id ? updated : item)))
      toast.success(`Account ${isActive ? "activated" : "deactivated"}`)
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update account status"))
    }
  }

  function openResetPasswordDialog(account: AdminAccountDto) {
    setResetTarget(account)
    setResetPassword("")
    setResetPasswordVisible(false)
    setResetDialogOpen(true)
  }

  async function handleResetPasswordConfirm() {
    if (!resetTarget) return
    const nextPassword = resetPassword
    const issues = validateStrongPassword(nextPassword)
    if (issues.length > 0) {
      toast.error(`Password must include ${issues.join(", ")}`)
      return
    }
    try {
      setResettingId(resetTarget.id)
      await updateAdminAccount(resetTarget.id, { password: nextPassword })
      toast.success(`Password updated for ${resetTarget.email}. Sign in with this same email.`)
      setResetDialogOpen(false)
      setResetTarget(null)
      setResetPassword("")
      setResetPasswordVisible(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update password"))
    } finally {
      setResettingId(null)
    }
  }

  const resetPasswordIssues = validateStrongPassword(resetPassword)
  const resetPasswordValid = resetPassword.length > 0 && resetPasswordIssues.length === 0
  const resetChecklist = getPasswordChecklist(resetPassword)

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Admin Users</h1>
        <p className="text-muted-foreground">Manage administrator identities and credentials</p>
      </div>

      <Card className="border-border mb-6">
        <CardHeader>
          <CardTitle className="text-foreground">Create Admin User</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="admin@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Display Name</Label>
            <Input
              placeholder="Operations Admin"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Initial Password</Label>
            <Input
              type="password"
              placeholder="10+ chars, upper/lower/number/symbol"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={() => void handleCreate()} disabled={creating} className="gap-2 w-full md:w-auto">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Existing Admin Users</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No admin users found.</p>
          ) : (
            <div className="space-y-2">
              {accounts.map((account) => {
                const isSelf = currentEmail === account.email.toLowerCase()
                return (
                  <div key={account.id} className="flex flex-col gap-3 rounded-lg border border-border p-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {account.displayName} {isSelf ? "(You)" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">{account.email}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Last login: {account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString() : "Never"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Active</span>
                        <Switch
                          checked={account.isActive}
                          onCheckedChange={(value) => void handleToggleActive(account, value)}
                          disabled={isSelf}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 bg-transparent"
                        onClick={() => openResetPasswordDialog(account)}
                        disabled={resettingId === account.id}
                      >
                        {resettingId === account.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                        {resettingId === account.id ? "Resetting..." : "Reset Password"}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={resetDialogOpen}
        onOpenChange={(open) => {
          setResetDialogOpen(open)
          if (!open) {
            setResetTarget(null)
            setResetPassword("")
            setResetPasswordVisible(false)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Admin Password</DialogTitle>
            <DialogDescription>
              {resetTarget
                ? `Set a new password for ${resetTarget.email}.`
                : "Set a new password for this admin account."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="reset-password-input">New Password</Label>
              <div className="relative">
                <Input
                  id="reset-password-input"
                  type={resetPasswordVisible ? "text" : "password"}
                  placeholder="10+ chars, upper/lower/number/symbol"
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  aria-label={resetPasswordVisible ? "Hide password" : "Show password"}
                  onClick={() => setResetPasswordVisible((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {resetPasswordVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="rounded-md border border-border p-3 text-xs text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Password requirements</p>
              <div className="space-y-1.5">
                {resetChecklist.map((item) => (
                  <p
                    key={item.label}
                    className={`flex items-center gap-2 ${item.pass ? "text-green-500" : "text-muted-foreground"}`}
                  >
                    {item.pass ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                    <span>{item.label}</span>
                  </p>
                ))}
              </div>
              {resetPassword.length > 0 && (
                <p className={`mt-2 font-medium ${resetPasswordValid ? "text-green-500" : "text-red-500"}`}>
                  {resetPasswordValid ? "All checks passed." : "Password does not meet all requirements."}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={() => {
                setResetDialogOpen(false)
                setResetTarget(null)
                setResetPassword("")
                setResetPasswordVisible(false)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleResetPasswordConfirm()}
              disabled={!resetPasswordValid || !resetTarget || resettingId === resetTarget?.id}
              className="gap-2"
            >
              {resetTarget && resettingId === resetTarget.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}

