"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { User, Shield, Wallet, Bell, Loader2, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageTransition } from "@/components/page-transition"
import { changeUserPassword, getMe, updateProfile, updateUserNotifications, updateUserSecurity, updateUserWallet } from "@/lib/api"
import { setUserIdentity } from "@/lib/auth/user"
import { useWallet } from "@/hooks/use-wallet"
import type { User as UserType } from "@/lib/types"
import { toast } from "sonner"

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function SettingsPage() {
  const [user, setUser] = useState<UserType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [savingSecurity, setSavingSecurity] = useState(false)
  const [savingNotifications, setSavingNotifications] = useState(false)
  const [walletMutationLoading, setWalletMutationLoading] = useState<string | null>(null)
  const [pendingWalletLink, setPendingWalletLink] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [walletLoading, setWalletLoading] = useState(false)
  const [notificationPreferences, setNotificationPreferences] = useState({
    newDrops: true,
    purchaseConfirmations: true,
    transferUpdates: true,
    platformAnnouncements: true
  })
  const {
    address,
    isConnected,
    isWrongChain,
    connectMetaMask,
    connectWalletConnect,
    switchToConfiguredChain,
    hasMetaMask,
    hasWalletConnect,
  } = useWallet()

  useEffect(() => {
    getMe()
      .then((u) => {
        setUser(u)
        setDisplayName(u.displayName)
        setEmail(u.email)
        setNotificationPreferences({
          newDrops: u.notificationPreferences?.newDrops ?? true,
          purchaseConfirmations: u.notificationPreferences?.purchaseConfirmations ?? true,
          transferUpdates: u.notificationPreferences?.transferUpdates ?? true,
          platformAnnouncements: u.notificationPreferences?.platformAnnouncements ?? true
        })
        setLoading(false)
      })
      .catch(() => {
        toast.error("Failed to load profile")
        setLoading(false)
      })
  }, [])

  async function handleSaveProfile() {
    if (!user) return
    try {
      setSaving(true)
      const updated = await updateProfile({
        displayName: displayName.trim(),
        email: email.trim(),
      })
      setUser(updated)
      setDisplayName(updated.displayName)
      setEmail(updated.email)
      setUserIdentity(updated.email, updated.displayName, updated.role)
      toast.success("Profile updated")
    } catch {
      toast.error("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const passwordChecks = {
    minLength: newPassword.length >= 10,
    hasUppercase: /[A-Z]/.test(newPassword),
    hasLowercase: /[a-z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
    hasSpecial: /[^A-Za-z0-9]/.test(newPassword),
    matches: newPassword.length > 0 && newPassword === confirmPassword,
  }
  const strongPassword =
    passwordChecks.minLength &&
    passwordChecks.hasUppercase &&
    passwordChecks.hasLowercase &&
    passwordChecks.hasNumber &&
    passwordChecks.hasSpecial

  async function handlePasswordUpdate() {
    if (!strongPassword) {
      toast.error("New password does not meet complexity requirements.")
      return
    }
    if (!passwordChecks.matches) {
      toast.error("New password and confirmation do not match.")
      return
    }
    try {
      setSavingPassword(true)
      await changeUserPassword(currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      toast.success("Password updated successfully")
    } catch {
      toast.error("Failed to update password. Check your current password and try again.")
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleTwoFactorToggle(checked: boolean) {
    if (!user) return
    try {
      setSavingSecurity(true)
      const updated = await updateUserSecurity({ twoFAEnabled: checked })
      setUser(updated)
      toast.success(checked ? "Two-factor authentication enabled" : "Two-factor authentication disabled")
    } catch {
      toast.error("Failed to update two-factor authentication setting")
    } finally {
      setSavingSecurity(false)
    }
  }

  async function handleLinkWallet() {
    if (walletLoading) return
    try {
      setWalletLoading(true)
      if (!isConnected) {
        if (hasMetaMask) {
          await connectMetaMask()
        } else if (hasWalletConnect) {
          await connectWalletConnect()
        } else {
          throw new Error("No wallet connector available. Install MetaMask or configure WalletConnect.")
        }
      }
      if (isWrongChain) {
        await switchToConfiguredChain()
      }
      if (address) {
        const updated = await updateUserWallet("add", address)
        setUser(updated)
        toast.success("Wallet linked")
      } else {
        setPendingWalletLink(true)
        toast.info("Wallet connected. Finalizing wallet link...")
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wallet connection failed."
      toast.error(message)
    } finally {
      setWalletLoading(false)
    }
  }

  useEffect(() => {
    if (!pendingWalletLink || !address) return
    updateUserWallet("add", address)
      .then((updated) => {
        setUser(updated)
        toast.success("Wallet linked")
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Failed to link wallet"
        toast.error(message)
      })
      .finally(() => setPendingWalletLink(false))
  }, [pendingWalletLink, address])

  async function handleRemoveWallet(walletAddress: string) {
    try {
      setWalletMutationLoading(walletAddress)
      const updated = await updateUserWallet("remove", walletAddress)
      setUser(updated)
      toast.success("Wallet removed")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove wallet"
      toast.error(message)
    } finally {
      setWalletMutationLoading(null)
    }
  }

  async function handleSaveNotifications() {
    try {
      setSavingNotifications(true)
      const updated = await updateUserNotifications(notificationPreferences)
      setUser(updated)
      setNotificationPreferences({
        newDrops: updated.notificationPreferences?.newDrops ?? true,
        purchaseConfirmations: updated.notificationPreferences?.purchaseConfirmations ?? true,
        transferUpdates: updated.notificationPreferences?.transferUpdates ?? true,
        platformAnnouncements: updated.notificationPreferences?.platformAnnouncements ?? true
      })
      toast.success("Notification preferences saved")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save notification preferences"
      toast.error(message)
    } finally {
      setSavingNotifications(false)
    }
  }

  if (loading || !user) {
    return <div className="space-y-4">{[1, 2].map((i) => <div key={i} className="h-48 rounded-2xl bg-muted animate-pulse" />)}</div>
  }

  const linkedWallets = Array.from(new Set(user.walletAddresses ?? []))

  return (
    <PageTransition>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="profile" className="gap-1.5"><User className="h-3.5 w-3.5" /> Profile</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> Security</TabsTrigger>
          <TabsTrigger value="wallets" className="gap-1.5"><Wallet className="h-3.5 w-3.5" /> Wallets</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Profile</CardTitle>
              <CardDescription className="text-muted-foreground">Update your display name and email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-foreground">Display Name</Label>
                <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Email</Label>
                <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
              </div>
              <Button onClick={handleSaveProfile} disabled={saving || !displayName.trim() || !email.trim()}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Security</CardTitle>
              <CardDescription className="text-muted-foreground">Two-factor authentication and password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">{user.twoFAEnabled ? "Currently enabled" : "Add extra security"}</p>
                </div>
                <Switch checked={user.twoFAEnabled} disabled={savingSecurity} onCheckedChange={handleTwoFactorToggle} />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Change Password</Label>
                <Input type="password" placeholder="Current password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
                <Input type="password" placeholder="New password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
                <Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                <div className="rounded-md border border-border p-3 text-xs text-muted-foreground">
                  <p className="mb-2 font-medium text-foreground">Password requirements</p>
                  <ul className="space-y-1">
                    <li className={passwordChecks.minLength ? "text-emerald-600" : undefined}>- At least 10 characters</li>
                    <li className={passwordChecks.hasUppercase ? "text-emerald-600" : undefined}>- At least one uppercase letter</li>
                    <li className={passwordChecks.hasLowercase ? "text-emerald-600" : undefined}>- At least one lowercase letter</li>
                    <li className={passwordChecks.hasNumber ? "text-emerald-600" : undefined}>- At least one number</li>
                    <li className={passwordChecks.hasSpecial ? "text-emerald-600" : undefined}>- At least one special character</li>
                    <li className={passwordChecks.matches ? "text-emerald-600" : undefined}>- New password and confirmation must match</li>
                  </ul>
                </div>
                <Button
                  variant="outline"
                  className="bg-transparent"
                  onClick={handlePasswordUpdate}
                  disabled={!currentPassword || !strongPassword || !passwordChecks.matches || savingPassword}
                >
                  {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wallets">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Linked Wallets</CardTitle>
              <CardDescription className="text-muted-foreground">Manage your connected wallets</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {linkedWallets.length > 0 ? linkedWallets.map((addr) => (
                <div key={addr} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="font-mono text-sm text-foreground">{shortenAddress(addr)}</p>
                    <p className="text-xs text-muted-foreground">Ethereum</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => void handleRemoveWallet(addr)}
                    disabled={walletMutationLoading === addr}
                  >
                    {walletMutationLoading === addr ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Trash2 className="h-4 w-4 text-muted-foreground" />}
                    <span className="sr-only">Remove wallet</span>
                  </Button>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground">No wallets connected</p>
              )}
              <Button variant="outline" className="gap-2 bg-transparent" onClick={() => void handleLinkWallet()} disabled={walletLoading}>
                {walletLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Link Wallet
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Notification Preferences</CardTitle>
              <CardDescription className="text-muted-foreground">Choose what you want to be notified about</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  key: "newDrops" as const,
                  label: "New drops from followed themes",
                  desc: "Get notified when new NFTs are minted from your favorite themes"
                },
                {
                  key: "purchaseConfirmations" as const,
                  label: "Purchase confirmations",
                  desc: "Receive email receipts for completed purchases"
                },
                {
                  key: "transferUpdates" as const,
                  label: "Transfer updates",
                  desc: "Get notified about on-chain transfer status changes"
                },
                {
                  key: "platformAnnouncements" as const,
                  label: "Platform announcements",
                  desc: "Stay updated on new features and maintenance windows"
                },
              ].map((pref) => (
                <div key={pref.key} className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">{pref.label}</p>
                    <p className="text-xs text-muted-foreground">{pref.desc}</p>
                  </div>
                  <Switch
                    checked={notificationPreferences[pref.key]}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences((current) => ({
                        ...current,
                        [pref.key]: checked
                      }))
                    }
                  />
                </div>
              ))}
              <Button onClick={() => void handleSaveNotifications()} disabled={savingNotifications}>
                {savingNotifications && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageTransition>
  )
}
