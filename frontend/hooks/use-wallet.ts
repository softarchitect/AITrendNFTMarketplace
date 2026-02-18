"use client"

import { useMemo } from "react"
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi"
import { configuredChain } from "@/lib/web3/config"

function connectorMissingError(message: string): Error {
  return new Error(message)
}

export function useWallet() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { connectAsync, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain()

  const metaMaskConnector = useMemo(
    () =>
      connectors.find(
        (connector) =>
          connector.id === "metaMaskSDK" ||
          connector.id === "metaMask" ||
          connector.name.toLowerCase().includes("metamask")
      ),
    [connectors]
  )

  const walletConnectConnector = useMemo(
    () =>
      connectors.find(
        (connector) =>
          connector.id === "walletConnect" ||
          connector.name.toLowerCase().includes("walletconnect")
      ),
    [connectors]
  )

  const isWrongChain = isConnected && chainId !== configuredChain.id

  async function connectMetaMask() {
    if (!metaMaskConnector) {
      throw connectorMissingError("MetaMask connector is unavailable.")
    }
    await connectAsync({ connector: metaMaskConnector })
  }

  async function connectWalletConnect() {
    if (!walletConnectConnector) {
      throw connectorMissingError(
        "WalletConnect is not configured. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID."
      )
    }
    await connectAsync({ connector: walletConnectConnector })
  }

  async function switchToConfiguredChain() {
    await switchChainAsync({ chainId: configuredChain.id })
  }

  return {
    address,
    isConnected,
    isConnecting: isPending,
    isSwitchingChain,
    isWrongChain,
    chainId,
    expectedChainId: configuredChain.id,
    connectMetaMask,
    connectWalletConnect,
    switchToConfiguredChain,
    disconnect,
    hasMetaMask: Boolean(metaMaskConnector),
    hasWalletConnect: Boolean(walletConnectConnector)
  }
}
