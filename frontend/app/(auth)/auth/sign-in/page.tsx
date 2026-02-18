"use client"

import React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Mail, Lock, Wallet, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { adminLogin, userLogin } from "@/lib/api"
import { isAdminEmail, setAdminSession } from "@/lib/auth/admin"
import { setUserSession } from "@/lib/auth/user"
import { useWallet } from "@/hooks/use-wallet"
import { toast } from "sonner"

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    if (isAdminEmail(email)) {
      try {
        const session = await adminLogin(email, password)
        if (!session.token) {
          throw new Error("Admin token not returned by backend")
        }
        setAdminSession(session.token, session.user.email, session.user.displayName, session.user.role)
        toast.success("Admin signed in successfully")
        router.push("/admin")
        setLoading(false)
        return
      } catch {
        toast.error("Admin sign-in failed. Check credentials or backend configuration.")
        setLoading(false)
        return
      }
    }
    try {
      const session = await userLogin(email, password)
      if (!session.token) {
        throw new Error("User token not returned by backend")
      }
      setUserSession(session.token, session.user.email, session.user.displayName, session.user.role)
      toast.success("Signed in successfully")
      router.push("/app")
    } catch {
      toast.error("Sign-in failed. Check your credentials.")
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
          <CardTitle className="text-2xl font-bold text-foreground">Welcome back</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in to your TrendMint account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-foreground">Password</Label>
                  <Link href="/auth/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>

              <div className="relative my-4">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  or
                </span>
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
            {"Don't have an account? "}
            <Link href="/auth/sign-up" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
