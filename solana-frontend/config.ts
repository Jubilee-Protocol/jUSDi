import { clusterApiUrl, PublicKey } from '@solana/web3.js';

// Solana cluster configuration
export const CLUSTER = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as 'devnet' | 'mainnet-beta';
export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC || clusterApiUrl(CLUSTER);

// Program ID - deployed on Solana Devnet
export const PROGRAM_ID = new PublicKey(
    process.env.NEXT_PUBLIC_PROGRAM_ID || '9fU2PX2z4We6N3A6xpFmzqvsXqyyWZZ7o9EBRCkz2FLR'
);

// Token mints on Solana
export const TOKEN_MINTS = {
    devnet: {
        USDC: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'), // Devnet USDC
        USDT: new PublicKey('EJwZgeZrdC8TXTQbQBoL6bfuAnFUQY38qkNmUCvM3a52'), // Devnet USDT placeholder
    },
    'mainnet-beta': {
        USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // Mainnet USDC
        USDT: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'), // Mainnet USDT
    },
};

// Get current mints
export const MINTS = TOKEN_MINTS[CLUSTER];

// Explorer URL helper
export const getExplorerUrl = (address: string, type: 'address' | 'tx' = 'address') => {
    const base = 'https://explorer.solana.com';
    const cluster = CLUSTER === 'devnet' ? '?cluster=devnet' : '';
    return `${base}/${type}/${address}${cluster}`;
};

// USDC has 6 decimals on Solana too
export const USDC_DECIMALS = 6;
// jUSDi shares use 6 decimals (matching SPL token standard for stablecoins)
export const JUSDI_DECIMALS = 6;
