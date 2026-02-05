'use client'

import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import {
    rainbowWallet,
    walletConnectWallet,
    coinbaseWallet,
    metaMaskWallet,
} from '@rainbow-me/rainbowkit/wallets'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'

// Re-export constants for client components
export { CONTRACTS, YIELD_STREAM_ABI, ERC20_ABI } from './constants'

// WalletConnect Project ID
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID || 'demo-project'

// Create connectors with Farcaster mini app support
const connectors = connectorsForWallets(
    [
        {
            groupName: 'Recommended',
            wallets: [coinbaseWallet, metaMaskWallet, rainbowWallet, walletConnectWallet],
        },
    ],
    {
        appName: 'Jubilee Yield Stream',
        projectId,
    }
)

// Create config with Farcaster + RainbowKit wallets
export const wagmiConfig = createConfig({
    chains: [baseSepolia, base],
    connectors: [
        farcasterMiniApp(), // Farcaster mini app connector (auto-connects in Base App/Warpcast)
        ...connectors,
    ],
    transports: {
        [base.id]: http('https://mainnet.base.org'),
        [baseSepolia.id]: http('https://sepolia.base.org'),
    },
    ssr: true,
})
