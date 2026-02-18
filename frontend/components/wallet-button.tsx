"use client"

import { useEffect, useState } from "react"
import { Wallet, ChevronDown, LogOut, Copy, ExternalLink, Loader2, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useWallet } from "@/hooks/use-wallet"
import { toast } from "sonner"

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function getExplorerBaseUrl(chainId: number): string {
  if (chainId === 11155111) {
    return "https://sepolia.etherscan.io/address"
  }
  return "https://etherscan.io/address"
}

export function WalletButton() {
  const [mounted, setMounted] = useState(false)
  const {
    address,
    chainId,
    isConnected,
    isConnecting,
    isWrongChain,
    isSwitchingChain,
    connectMetaMask,
    connectWalletConnect,
    switchToConfiguredChain,
    disconnect,
    hasMetaMask,
    hasWalletConnect,
  } = useWallet()

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleConnectMetaMask() {
    try {
      await connectMetaMask()
      toast.success("MetaMask connected")
    } catch (error) {
      const message = error instanceof Error ? error.message : "MetaMask connection failed."
      toast.error(message)
    }
  }

  async function handleConnectWalletConnect() {
    try {
      await connectWalletConnect()
      toast.success("WalletConnect connected")
    } catch (error) {
      const message = error instanceof Error ? error.message : "WalletConnect connection failed."
      toast.error(message)
    }
  }

  async function handleSwitchNetwork() {
    try {
      await switchToConfiguredChain()
      toast.success("Network switched to Ethereum")
    } catch {
      toast.error("Could not switch network automatically. Please switch in your wallet.")
    }
  }

  function handleCopyAddress() {
    if (!address) return
    void navigator.clipboard.writeText(address)
    toast.success("Address copied")
  }

  function handleOpenExplorer() {
    if (!address || !chainId) return
    window.open(`${getExplorerBaseUrl(chainId)}/${address}`, "_blank", "noopener,noreferrer")
  }

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="gap-2 bg-transparent" disabled>
        <Wallet className="h-4 w-4" />
        <span className="hidden sm:inline">Connect Wallet</span>
      </Button>
    )
  }

  if (!isConnected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent" disabled={isConnecting}>
            {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
            <span className="hidden sm:inline">Connect Wallet</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => void handleConnectMetaMask()} disabled={!hasMetaMask || isConnecting}>
            <Wallet className="mr-2 h-4 w-4" />
            Connect MetaMask
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => void handleConnectWalletConnect()}
            disabled={!hasWalletConnect || isConnecting}
          >
            <Link2 className="mr-2 h-4 w-4" />
            Connect WalletConnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <span className={`h-2 w-2 rounded-full ${isWrongChain ? "bg-[hsl(var(--warning))]" : "bg-[hsl(var(--success))]"}`} />
          <span className="font-mono text-xs">{address ? shortenAddress(address) : "Connected"}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {isWrongChain && (
          <>
            <DropdownMenuItem onClick={() => void handleSwitchNetwork()} disabled={isSwitchingChain}>
              {isSwitchingChain ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
              Switch to Ethereum
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={handleCopyAddress}>
          <Copy className="mr-2 h-4 w-4" />
          Copy Address
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenExplorer}>
          <ExternalLink className="mr-2 h-4 w-4" />
          View on Etherscan
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            disconnect()
            toast.info("Wallet disconnected")
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
