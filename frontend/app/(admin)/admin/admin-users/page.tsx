"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageTransition } from "@/components/page-transition"
import { createAdminAccount, getAdminAccounts, type AdminAccountDto, updateAdminAccount } from "@/lib/api"
import { getAdminEmail } from "@/lib/auth/admin"
import { toast } from "sonner"

export default function AdminUsersManagementPage() {
  const [accounts, setAccounts] = useState<AdminAccountDto[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
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
    } catch {
      toast.error("Failed to create admin account")
    } finally {
      setCreating(false)
    }
  }

  async function handleToggleActive(account: AdminAccountDto, isActive: boolean) {
    try {
      const updated = await updateAdminAccount(account.id, { isActive })
      setAccounts((prev) => prev.map((item) => (item.id === account.id ? updated : item)))
      toast.success(`Account ${isActive ? "activated" : "deactivated"}`)
    } catch {
      toast.error("Failed to update account status")
    }
  }

  async function handleResetPassword(account: AdminAccountDto) {
    const nextPassword = window.prompt(`Set a new password for ${account.email}`, "")
    if (!nextPassword) return
    if (nextPassword.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    try {
      await updateAdminAccount(account.id, { password: nextPassword })
      toast.success("Password updated")
    } catch {
      toast.error("Failed to update password")
    }
  }

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
                        onClick={() => void handleResetPassword(account)}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Reset Password
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PageTransition>
  )
}

