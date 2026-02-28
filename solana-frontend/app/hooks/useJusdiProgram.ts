'use client';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    getAccount,
    createAssociatedTokenAccountInstruction,
    TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { PROGRAM_ID, MINTS, USDC_DECIMALS } from '../../config';

// Vault PDA seed
const VAULT_SEED = Buffer.from('vault');

interface VaultState {
    totalShares: number;
    managedAssets: number;
    isPaused: boolean;
    assetCount: number;
    totalValueUsd: number;
}

export function useJusdiProgram() {
    const { connection } = useConnection();
    const { publicKey, sendTransaction, connected } = useWallet();
    const [vaultState, setVaultState] = useState<VaultState | null>(null);
    const [userUsdcBalance, setUserUsdcBalance] = useState<number>(0);
    const [userShareBalance, setUserShareBalance] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(false);

    // Derive vault PDA
    const [vaultPda] = useMemo(() => {
        return PublicKey.findProgramAddressSync([VAULT_SEED], PROGRAM_ID);
    }, []);

    // Fetch balances
    const fetchBalances = useCallback(async () => {
        if (!publicKey || !connected) return;
        try {
            // Fetch USDC balance
            const usdcAta = await getAssociatedTokenAddress(MINTS.USDC, publicKey);
            try {
                const usdcAccount = await getAccount(connection, usdcAta);
                setUserUsdcBalance(Number(usdcAccount.amount) / Math.pow(10, USDC_DECIMALS));
            } catch {
                setUserUsdcBalance(0);
            }

            // Fetch vault state from PDA
            const vaultAccount = await connection.getAccountInfo(vaultPda);
            if (vaultAccount) {
                // Parse vault state (simplified - in production use Anchor IDL deserialization)
                // For now we'll show basic info
                setVaultState({
                    totalShares: 0,
                    managedAssets: 0,
                    isPaused: false,
                    assetCount: 0,
                    totalValueUsd: 0,
                });
            }
        } catch (err) {
            console.error('Error fetching balances:', err);
        }
    }, [publicKey, connected, connection, vaultPda]);

    useEffect(() => {
        fetchBalances();
        const interval = setInterval(fetchBalances, 15000);
        return () => clearInterval(interval);
    }, [fetchBalances]);

    // Share price ratio (1:1 for new vault)
    const sharePrice = vaultState && vaultState.totalShares > 0
        ? vaultState.managedAssets / vaultState.totalShares
        : 1;

    return {
        connection,
        publicKey,
        connected,
        vaultPda,
        vaultState,
        userUsdcBalance,
        userShareBalance,
        sharePrice,
        isLoading,
        fetchBalances,
        sendTransaction,
    };
}
