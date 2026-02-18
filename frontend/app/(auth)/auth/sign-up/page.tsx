"use client"

import React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Mail, Lock, User, Wallet, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { userRegister } from "@/lib/api"
import { setUserSession } from "@/lib/auth/user"
import { useWallet } from "@/hooks/use-wallet"
import { toast } from "sonner"

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function SignUpPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" })
  const [agreed, setAgreed] = useState(false)
  const [linkWallet, setLinkWallet] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [walletLoading, setWalletLoading] = useState(false)
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

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }
    try {
      setLoading(true)
      const session = await userRegister({
        email: form.email,
        password: form.password,
        displayName: form.name,
      })
      if (!session.token) {
        throw new Error("User token not returned by backend")
      }
      setUserSession(session.token, session.user.email, session.user.displayName, session.user.role)
      toast.success("Account created successfully")
      router.push("/app")
    } catch {
      toast.error("Sign-up failed. Check details and password requirements.")
    } finally {
      setLoading(false)
    }
  }

  async function handleWalletContinue() {
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
      toast.success("Wallet connected successfully")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wallet connection failed."
      toast.error(message)
    } finally {
      setWalletLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <Card className="border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">Create account</CardTitle>
          <CardDescription className="text-muted-foreground">
            Start collecting AI-generated NFTs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">Display Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-signup" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email-signup" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-signup" className="text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password-signup" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pl-10 pr-10" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Hide password" : "Show password"}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-foreground">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="confirm-password" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className="pl-10" required />
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="wallet" checked={linkWallet} onCheckedChange={(v) => setLinkWallet(!!v)} />
              <Label htmlFor="wallet" className="text-sm text-muted-foreground leading-relaxed">
                <Wallet className="mr-1 inline h-3.5 w-3.5" />
                Link wallet during sign-up (optional)
              </Label>
            </div>

            <div className="flex items-start gap-2">
              <Checkbox id="terms" checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} required />
              <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed">
                I agree to the{" "}
                <Link href="/legal/terms" className="text-primary hover:underline">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/legal/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !agreed}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Account
            </Button>

            <div className="relative my-4">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">or</span>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 bg-transparent"
              onClick={() => void handleWalletContinue()}
              disabled={walletLoading}
            >
              {walletLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              <Wallet className="h-4 w-4" />
              Continue with Wallet
            </Button>
            {isConnected && address && (
              <p className="text-center text-xs text-muted-foreground">
                Connected wallet: <span className="font-mono text-foreground">{shortenAddress(address)}</span>
              </p>
            )}
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/sign-in" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
