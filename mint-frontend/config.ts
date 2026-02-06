import { http, createConfig } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { connectorsForWallets } from '@rainbow-me/rainbowkit'
import { safe } from 'wagmi/connectors'
import {
    rainbowWallet,
    walletConnectWallet,
    coinbaseWallet,
    metaMaskWallet,
    safeWallet
} from '@rainbow-me/rainbowkit/wallets'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'

// Create connectors with Farcaster mini app support + Safe wallet
const connectors = connectorsForWallets(
    [
        {
            groupName: 'Recommended',
            wallets: [coinbaseWallet, metaMaskWallet, rainbowWallet, walletConnectWallet, safeWallet],
        },
    ],
    {
        appName: 'jUSDi - Jubilee USD Index',
        projectId: '6f385306b6aa92e6c664d8e5759748c2',
    }
)

// Create config with Safe connector + Farcaster + RainbowKit wallets
export const config = createConfig({
    chains: [base, baseSepolia],
    connectors: [
        safe({
            allowedDomains: [/app\.safe\.global$/],
            debug: false,
        }),
        farcasterMiniApp(), // Farcaster mini app connector (auto-connects in Base App)
        ...connectors,
    ],
    transports: {
        [base.id]: http('https://mainnet.base.org'),
        [baseSepolia.id]: http('https://sepolia.base.org'),
    },
})

// Contract addresses
export const CONTRACTS = {
    // Base Mainnet - jUSDi (USDC + USDT Index) - DEPLOYED Feb 6 2026
    mainnet: {
        vault: '0x0B03463259d5041004290822444c4183aE936050',    // JUSDiVault (ERC4626)
        adapter: '0x15f0Eb7f49E3d35B37F9B606b966a684Ce7ebc03', // LendingRouterAdapter
        lendingRouter: '0x6533715ccd0fdDe359baB156080DD38D5C85FfF9', // LendingRouter
        jusdiToken: '0x04cC650F6dB0B91Ef910a4a54F22232771988432', // jUSDi OFT Token
        USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',     // Native USDC on Base
        USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',     // Bridged USDT on Base
        // Aave V3 Yield Pools
        aavePool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5', // Aave V3 Lending Pool
        aUSDC: '0x98c23e9d8f34fefb1b7bd6a91b7ff122f4e16f5c',    // Aave V3 aUSDC
    },
    // Base Sepolia (testnet) - DEPLOYED Feb 6 2026
    testnet: {
        strategy: '0x878189d149CcF6277B7cd267A752c925103d260F', // LendingRouterAdapter
        vault: '0xc698e233fbb9810ae0f22e154ee0912fa188c69c',    // Existing Vault
        lendingRouter: '0x939d3D40b03a8F8f907E36eD4Cf31C7831DF29FD', // LendingRouter
        USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',     // Mock USDC for testnet
        USDT: '0x5ed96C75f5F04A94308623A8828B819E7Ef60B1c',     // Mock USDT for testnet
    }
}
