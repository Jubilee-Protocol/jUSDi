'use client'

import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { safe } from 'wagmi/connectors'
import {
    rainbowWallet,
    walletConnectWallet,
    coinbaseWallet,
    metaMaskWallet,
    safeWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'

// Re-export constants for client components
export { CONTRACTS, YIELD_STREAM_ABI, ERC20_ABI } from './constants'

// WalletConnect Project ID
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || '6f385306b6aa92e6c664d8e5759748c2'

// Create connectors with Farcaster mini app support + Safe wallet
const connectors = connectorsForWallets(
    [
        {
            groupName: 'Recommended',
            wallets: [coinbaseWallet, metaMaskWallet, rainbowWallet, walletConnectWallet, safeWallet],
        },
    ],
    {
        appName: 'Jubilee Yield Stream',
        projectId,
    }
)

// Create config with Safe connector + Farcaster + RainbowKit wallets
// Base Sepolia is first = default network for testnet
export const wagmiConfig = createConfig({
    chains: [baseSepolia, base],
    connectors: [
        safe({
            allowedDomains: [/app\.safe\.global$/],
            debug: false,
        }),
        farcasterMiniApp(), // Farcaster mini app connector (auto-connects in Base App/Warpcast)
        ...connectors,
    ],
    transports: {
        [base.id]: http('https://mainnet.base.org'),
        [baseSepolia.id]: http('https://sepolia.base.org'),
    },
    ssr: true,
})
