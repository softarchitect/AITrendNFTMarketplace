"use client"

import { createConfig, http } from "wagmi"
import { mainnet, sepolia, type Chain } from "wagmi/chains"
import { metaMask, walletConnect } from "wagmi/connectors"

const SUPPORTED_CHAINS = [sepolia, mainnet] as const
const DEFAULT_CHAIN_ID = 11155111

function getConfiguredChainId(): number {
  const raw = process.env.NEXT_PUBLIC_CHAIN_ID
  const parsed = raw ? Number(raw) : DEFAULT_CHAIN_ID
  return Number.isFinite(parsed) ? parsed : DEFAULT_CHAIN_ID
}

function resolvePreferredChain(chainId: number): Chain {
  return SUPPORTED_CHAINS.find((chain) => chain.id === chainId) ?? sepolia
}

const preferredChain = resolvePreferredChain(getConfiguredChainId())
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID

const connectors = [
  metaMask({
    dappMetadata: {
      name: "TrendMint",
      url: "https://trendmint.local"
    }
  }),
  ...(walletConnectProjectId
    ? [
        walletConnect({
          projectId: walletConnectProjectId,
          metadata: {
            name: "TrendMint",
            description: "AI Trend NFT Marketplace",
            url: "https://trendmint.local",
            icons: []
          },
          showQrModal: true
        })
      ]
    : [])
]

export const web3Config = createConfig({
  chains: [preferredChain],
  connectors,
  transports: {
    [preferredChain.id]: http()
  }
})

export const configuredChain = preferredChain
export const isWalletConnectConfigured = Boolean(walletConnectProjectId)
