"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Search, MoreHorizontal, ShieldCheck, Shield, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { StatusPill } from "@/components/status-pill"
import { PageTransition } from "@/components/page-transition"
import { createAdminUser, getAdminUsers, updateAdminUser, updateUserKyc } from "@/lib/api"
import type { User } from "@/lib/types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [formDisplayName, setFormDisplayName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formKycStatus, setFormKycStatus] = useState<User["kycStatus"]>("Verified")
  const [formTwoFAEnabled, setFormTwoFAEnabled] = useState(false)
  const [formIsActive, setFormIsActive] = useState(true)
  const [formPassword, setFormPassword] = useState("")
  const [creatingUser, setCreatingUser] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newDisplayName, setNewDisplayName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newKycStatus, setNewKycStatus] = useState<User["kycStatus"]>("NotStarted")
  const [newTwoFAEnabled, setNewTwoFAEnabled] = useState(false)
  const [newIsActive, setNewIsActive] = useState(true)

  useEffect(() => {
    getAdminUsers().then((data) => { setUsers(data); setLoading(false) })
  }, [])

  const filtered = users.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  async function copyWallet(user: User) {
    const wallet = user.walletAddresses[0]
    if (!wallet) {
      toast.error("No wallet address found")
      return
    }
    await navigator.clipboard.writeText(wallet)
    toast.success("Wallet copied")
  }

  async function setKycStatus(user: User, status: User["kycStatus"]) {
    const updated = await updateUserKyc(user.id, status)
    setUsers((prev) => prev.map((item) => item.id === user.id ? { ...item, kycStatus: updated.kycStatus } : item))
    toast.success(`KYC status updated to ${status}`)
  }

  function openEditUser(user: User) {
    setEditingUser(user)
    setFormDisplayName(user.displayName)
    setFormEmail(user.email)
    setFormKycStatus(user.kycStatus)
    setFormTwoFAEnabled(Boolean(user.twoFAEnabled))
    setFormIsActive(user.isActive !== false)
    setFormPassword("")
  }

  async function saveUserEdits() {
    if (!editingUser) return
    setSaving(true)
    try {
      const updated = await updateAdminUser(editingUser.id, {
        displayName: formDisplayName.trim(),
        email: formEmail.trim(),
        kycStatus: formKycStatus,
        twoFAEnabled: formTwoFAEnabled,
        isActive: formIsActive,
        password: formPassword.trim().length > 0 ? formPassword : undefined,
      })
      setUsers((prev) => prev.map((item) => (item.id === editingUser.id ? updated : item)))
      toast.success("User updated")
      setEditingUser(null)
      setFormPassword("")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update user"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateUser() {
    setCreatingUser(true)
    try {
      const created = await createAdminUser({
        displayName: newDisplayName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        kycStatus: newKycStatus,
        twoFAEnabled: newTwoFAEnabled,
        isActive: newIsActive,
      })
      setUsers((prev) => [created, ...prev])
      toast.success("User created")
      setCreateOpen(false)
      setNewDisplayName("")
      setNewEmail("")
      setNewPassword("")
      setNewKycStatus("NotStarted")
      setNewTwoFAEnabled(false)
      setNewIsActive(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create user"
      toast.error(message)
    } finally {
      setCreatingUser(false)
    }
  }

  return (
    <PageTransition>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground">{users.length} registered users</p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="gap-2" onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Create User
          </Button>
          <div className="relative sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="hidden md:grid grid-cols-[1fr_80px_100px_80px_auto] gap-4 border-b border-border bg-muted/50 px-4 py-2.5 text-xs font-medium text-muted-foreground">
            <span>User</span><span>Role</span><span>KYC</span><span>2FA</span><span>Actions</span>
          </div>
          {filtered.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-1 md:grid-cols-[1fr_80px_100px_80px_auto] gap-2 md:gap-4 items-center border-b border-border px-4 py-3 hover:bg-muted/30 transition-colors last:border-b-0"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{user.displayName}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Badge variant={user.role === "Admin" ? "destructive" : user.role === "Partner" ? "secondary" : "outline"} className={cn(user.role === "User" && "bg-transparent")}>
                {user.role}
              </Badge>
              <StatusPill status={user.kycStatus} />
              <span className="text-sm">
                {user.twoFAEnabled ? <ShieldCheck className="h-4 w-4 text-[hsl(var(--success))]" /> : <Shield className="h-4 w-4 text-muted-foreground" />}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">User actions</span></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => void copyWallet(user)}>Copy Wallet Address</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEditUser(user)}>Edit User</DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      const updated = await updateAdminUser(user.id, { isActive: !(user.isActive !== false) })
                      setUsers((prev) => prev.map((item) => (item.id === user.id ? updated : item)))
                      toast.success(`User ${updated.isActive ? "activated" : "deactivated"}`)
                    }}
                  >
                    {user.isActive === false ? "Activate User" : "Deactivate User"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void setKycStatus(user, "Pending")}>Set KYC Pending</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void setKycStatus(user, "Verified")}>Set KYC Verified</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void setKycStatus(user, "Rejected")}>Set KYC Rejected</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={Boolean(editingUser)} onOpenChange={(open) => { if (!open) setEditingUser(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update profile, KYC, security, and account status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-user-display-name">Display name</Label>
              <Input
                id="edit-user-display-name"
                value={formDisplayName}
                onChange={(event) => setFormDisplayName(event.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-email">Email</Label>
              <Input
                id="edit-user-email"
                value={formEmail}
                onChange={(event) => setFormEmail(event.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-kyc">KYC status</Label>
              <Select value={formKycStatus} onValueChange={(value) => setFormKycStatus(value as User["kycStatus"])}>
                <SelectTrigger id="edit-user-kyc">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NotStarted">NotStarted</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Verified">Verified</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <Label htmlFor="edit-user-2fa">2FA enabled</Label>
              <Switch
                id="edit-user-2fa"
                checked={formTwoFAEnabled}
                onCheckedChange={setFormTwoFAEnabled}
                disabled={saving}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <Label htmlFor="edit-user-active">Account active</Label>
              <Switch
                id="edit-user-active"
                checked={formIsActive}
                onCheckedChange={setFormIsActive}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-password">Reset password (optional)</Label>
              <Input
                id="edit-user-password"
                type="password"
                value={formPassword}
                onChange={(event) => setFormPassword(event.target.value)}
                placeholder="Leave blank to keep unchanged"
                disabled={saving}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setEditingUser(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void saveUserEdits()} disabled={saving}>
              Save User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Create a new public user account from admin panel.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-user-display-name">Display name</Label>
              <Input id="new-user-display-name" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} disabled={creatingUser} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-email">Email</Label>
              <Input id="new-user-email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} disabled={creatingUser} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-password">Password</Label>
              <Input id="new-user-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={creatingUser} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-kyc">KYC status</Label>
              <Select value={newKycStatus} onValueChange={(value) => setNewKycStatus(value as User["kycStatus"])}>
                <SelectTrigger id="new-user-kyc">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NotStarted">NotStarted</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Verified">Verified</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <Label htmlFor="new-user-2fa">2FA enabled</Label>
              <Switch id="new-user-2fa" checked={newTwoFAEnabled} onCheckedChange={setNewTwoFAEnabled} disabled={creatingUser} />
            </div>
            <div className="flex items-center justify-between rounded-md border border-border p-3">
              <Label htmlFor="new-user-active">Account active</Label>
              <Switch id="new-user-active" checked={newIsActive} onCheckedChange={setNewIsActive} disabled={creatingUser} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setCreateOpen(false)} disabled={creatingUser}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreateUser()} disabled={creatingUser}>
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
