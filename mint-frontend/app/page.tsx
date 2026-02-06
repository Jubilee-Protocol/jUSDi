'use client';

import Image from 'next/image';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useChainId, useWaitForTransactionReceipt, useConnect } from 'wagmi';
import { useCapabilities } from 'wagmi/experimental';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { base } from 'wagmi/chains';
import { CONTRACTS } from '../config';
import { useIsMiniApp, useMiniAppReady } from './hooks/useMiniApp';
import { TutorialModal, useTutorial } from './components/TutorialModal';
import { FASBDashboard } from './components/FASBDashboard';
import { TreasuryMode } from './components/TreasuryMode';
import { OnrampModal } from './components/OnrampModal';

// Min deposit constant
const MIN_DEPOSIT_USD = 0.01;

// MAINTENANCE MODE - Applies to MAINNET only
// Testnet (Base Sepolia) works during maintenance for testing
const MAINNET_MAINTENANCE = false; // 🚀 jUSDi is LIVE on mainnet! Jan 16 2026
const MAINTENANCE_MESSAGE = "jUSDi is undergoing scheduled maintenance. Deposits and withdrawals are temporarily disabled on mainnet. Testnet is available for testing.";

// MIGRATION NOTICE - v1.5 upgrade Feb 5 2026
const OLD_CONTRACT = '0x27143095013184e718f92330C32A3D2eE9974053';
const MIGRATION_NOTICE = "🚀 jUSDi has been upgraded to v1.5! If you had funds in the previous version, please withdraw and redeposit to the new contract. The old contract has been deprecated.";

// Strategy ABI - deposit, redeem, convertToAssets, and status
const STRATEGY_ABI = [
    {
        name: 'getStrategyStatus',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{
            type: 'tuple',
            components: [
                { name: 'isPaused', type: 'bool' },
                { name: 'isCBTriggered', type: 'bool' },
                { name: 'isInOracleFailureMode', type: 'bool' },
                { name: 'totalHoldings', type: 'uint256' },
                { name: 'dailySwapUsed', type: 'uint256' },
                { name: 'dailySwapLimit', type: 'uint256' },
                { name: 'lastGasCost', type: 'uint256' },
                { name: 'rebalancesExecuted', type: 'uint256' },
                { name: 'rebalancesFailed', type: 'uint256' },
                { name: 'swapsExecuted', type: 'uint256' },
                { name: 'swapsFailed', type: 'uint256' },
                { name: 'wbtcAlloc', type: 'uint256' },
                { name: 'cbbtcAlloc', type: 'uint256' },
                { name: 'failCount', type: 'uint256' },
                { name: 'timeUntilReset', type: 'uint256' },
            ]
        }]
    },
    {
        name: 'deposit',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'assets', type: 'uint256' },
            { name: 'receiver', type: 'address' }
        ],
        outputs: [{ name: 'shares', type: 'uint256' }]
    },
    {
        name: 'redeem',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'shares', type: 'uint256' },
            { name: 'receiver', type: 'address' },
            { name: 'owner', type: 'address' }
        ],
        outputs: [{ name: 'assets', type: 'uint256' }]
    },
    {
        name: 'convertToAssets',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'shares', type: 'uint256' }],
        outputs: [{ name: 'assets', type: 'uint256' }]
    },
    {
        name: 'depositCap',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint256' }]
    },
] as const;

const ERC20_ABI = [
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }]
    },
    {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' }
        ],
        outputs: [{ type: 'uint256' }]
    },
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ type: 'bool' }]
    },
] as const;

// Theme types
type Theme = 'light' | 'dark';

// USDC uses 6 decimals on Base mainnet
const USDC_DECIMALS = 6;

// Get gradient style based on theme
const getGradientStyle = (theme: Theme) => ({
    background: theme === 'light'
        ? `
            radial-gradient(ellipse at top left, rgba(243, 119, 187, 0.30) 0%, transparent 60%),
            radial-gradient(ellipse at bottom right, rgba(243, 119, 187, 0.22) 0%, transparent 60%),
            radial-gradient(ellipse at center, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.85) 40%, rgba(0, 82, 255, 0.25) 100%)
        `
        : `
            radial-gradient(ellipse at top left, rgba(243, 119, 187, 0.15) 0%, transparent 60%),
            radial-gradient(ellipse at bottom right, rgba(0, 82, 255, 0.15) 0%, transparent 60%),
            #0a0a0f
        `,
    minHeight: '100vh'
});

// Theme colors
const colors = {
    light: {
        bg: '#FFFFFF',
        card: '#FFFFFF',
        cardBorder: 'rgba(0, 82, 255, 0.1)',
        text: '#3B3B3B',
        textMuted: '#6B7280',
        textLight: '#9CA3AF',
        inputBg: '#F9FAFB',
    },
    dark: {
        bg: '#0a0a0f',
        card: '#1a1a2e',
        cardBorder: 'rgba(0, 82, 255, 0.2)',
        text: '#E5E7EB',
        textMuted: '#9CA3AF',
        textLight: '#6B7280',
        inputBg: '#16162a',
    }
};

// Toast component - mobile responsive
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'pending'; onClose: () => void }) {
    useEffect(() => {
        if (type !== 'pending') {
            const timer = setTimeout(onClose, 5000);
            return () => clearTimeout(timer);
        }
    }, [type, onClose]);

    const bgColor = type === 'success' ? '#22C55E' : type === 'error' ? '#EF4444' : '#0052FF';

    return (
        <div style={{
            position: 'fixed',
            bottom: '16px',
            left: '16px',
            right: '16px',
            background: bgColor,
            color: 'white',
            padding: '14px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 9999,
            animation: 'slideIn 0.3s ease'
        }}>
            {type === 'pending' && (
                <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    flexShrink: 0
                }} />
            )}
            {type === 'success' && <span>✓</span>}
            {type === 'error' && <span>✕</span>}
            <span style={{ flex: 1, fontSize: '14px' }}>{message}</span>
            {type !== 'pending' && (
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px', padding: '4px' }}>×</button>
            )}
        </div>
    );
}

// Skeleton loader component for loading states
function Skeleton({ width = '60px', height = '18px' }: { width?: string; height?: string }) {
    return (
        <div style={{
            width,
            height,
            background: 'linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            borderRadius: '4px',
            display: 'inline-block',
        }} />
    );
}

// Transaction history type
interface TxHistoryItem {
    type: 'deposit' | 'withdraw';
    amount: string;
    timestamp: number;
    hash: string;
}

export default function Home() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const { connectors, connect } = useConnect();
    const [depositAmount, setDepositAmount] = useState('');
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
    const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(true);
    const [rememberDevice, setRememberDevice] = useState(false);
    const [usdPrice] = useState(1); // USDC/USDT are stablecoins, always $1
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'pending' } | null>(null);
    const [theme, setTheme] = useState<Theme>('light');
    const [showHistory, setShowHistory] = useState(false);
    const [showFASBDashboard, setShowFASBDashboard] = useState(false);
    const [showTreasuryMode, setShowTreasuryMode] = useState(false);
    const [showOnramp, setShowOnramp] = useState(false);
    const [showTvlInUsd, setShowTvlInUsd] = useState(true); // Toggle between USD and USD display
    const [txHistory, setTxHistory] = useState<TxHistoryItem[]>([]);

    // Mini app detection and frame readiness
    const isMiniApp = useIsMiniApp();
    useMiniAppReady();

    // Maintenance mode only applies to mainnet (Base, chainId 8453)
    // Testnet (Base Sepolia, chainId 84532) works during maintenance
    const isMaintenanceMode = MAINNET_MAINTENANCE && chainId === 8453;

    // Tutorial for first-time visitors
    const { showTutorial, completeTutorial, reopenTutorial } = useTutorial();

    // Migration notice dismissible state
    const [showMigrationNotice, setShowMigrationNotice] = useState(true);

    // Check if wallet supports gas sponsorship (Coinbase Smart Wallet)
    const { data: capabilities } = useCapabilities({ account: address });
    const isGasFree = useMemo(() => {
        if (!capabilities || !chainId) return false;
        const chainCapabilities = capabilities[chainId];
        return chainCapabilities?.paymasterService?.supported === true && chainId === base.id;
    }, [capabilities, chainId]);

    // Auto-connect for Safe Apps - when opened inside Safe iframe
    useEffect(() => {
        if (!isConnected && connectors.length > 0) {
            // Check if we're in Safe iframe by looking for Safe connector
            const safeConnector = connectors.find(c => c.id === 'safe' || c.name.toLowerCase().includes('safe'));

            if (safeConnector) {
                // Try to connect with Safe connector first (will fail if not in Safe iframe)
                const timer = setTimeout(async () => {
                    try {
                        await connect({ connector: safeConnector });
                        console.log('[Safe] Auto-connected via Safe connector');
                    } catch (e) {
                        // Not in Safe iframe, normal flow
                        console.log('[Safe] Not in Safe iframe, skipping auto-connect');
                    }
                }, 300);
                return () => clearTimeout(timer);
            }
        }
    }, [isConnected, connectors, connect]);

    // Auto-connect in Farcaster mini app context (try Coinbase/injected wallet)
    useEffect(() => {
        if (isMiniApp && !isConnected && connectors.length > 0) {
            // Try to find and auto-connect with injected or Coinbase wallet
            const coinbaseConnector = connectors.find(c => c.name.toLowerCase().includes('coinbase'));
            const injectedConnector = connectors.find(c => c.name.toLowerCase().includes('injected'));
            const targetConnector = coinbaseConnector || injectedConnector;

            if (targetConnector) {
                // Delay to allow frame to initialize
                const timer = setTimeout(() => {
                    connect({ connector: targetConnector });
                }, 500);
                return () => clearTimeout(timer);
            }
        }
    }, [isMiniApp, isConnected, connectors, connect]);

    // Get theme colors
    const c = colors[theme];

    // Contract write hooks - include error and reset for proper state management
    const { writeContract: approveToken, data: approveHash, isPending: isApproving, error: approveError, reset: resetApprove } = useWriteContract();
    const { writeContract: depositAssets, data: depositHash, isPending: isDepositing, error: depositError, reset: resetDeposit } = useWriteContract();
    const { writeContract: redeemShares, data: redeemHash, isPending: isRedeeming, error: redeemError, reset: resetRedeem } = useWriteContract();

    // Wait for transaction receipts - include error state
    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess, isError: isApproveFailed } = useWaitForTransactionReceipt({ hash: approveHash });
    const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess, isError: isDepositFailed } = useWaitForTransactionReceipt({ hash: depositHash });
    const { isLoading: isRedeemConfirming, isSuccess: isRedeemSuccess, isError: isRedeemFailed } = useWaitForTransactionReceipt({ hash: redeemHash });

    // Load theme from localStorage
    useEffect(() => {
        const savedTheme = localStorage.getItem('jusdi-theme') as Theme | null;
        if (savedTheme) {
            setTheme(savedTheme);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
        }
    }, []);

    // Toggle theme
    const toggleTheme = useCallback(() => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('jusdi-theme', newTheme);
    }, [theme]);

    // Load transaction history from localStorage
    useEffect(() => {
        if (address) {
            const saved = localStorage.getItem(`jusdi-history-${address}`);
            if (saved) {
                setTxHistory(JSON.parse(saved));
            }
        }
    }, [address]);

    // Save transaction to history
    const saveTxToHistory = useCallback((type: 'deposit' | 'withdraw', amount: string, hash: string) => {
        if (!address) return;
        const newTx: TxHistoryItem = { type, amount, timestamp: Date.now(), hash };
        const updated = [newTx, ...txHistory].slice(0, 20); // Keep last 20
        setTxHistory(updated);
        localStorage.setItem(`jusdi-history-${address}`, JSON.stringify(updated));
    }, [address, txHistory]);

    // No price fetch needed - USDC/USDT are stablecoins ($1)
    const btcPrice = 1; // For component prop compatibility

    // Check localStorage for remembered terms acceptance
    useEffect(() => {
        const remembered = localStorage.getItem('jusdi-terms-remembered');
        if (remembered === 'true') {
            setHasAcceptedTerms(true);
            setShowTermsModal(false);
        }
    }, []);

    // Handle transaction success toasts and history
    useEffect(() => {
        if (isDepositSuccess && depositHash) {
            setToast({ message: 'Deposit successful! You received jUSDi tokens.', type: 'success' });
            saveTxToHistory('deposit', depositAmount, depositHash);
            setDepositAmount('');
        }
    }, [isDepositSuccess]);

    useEffect(() => {
        if (isRedeemSuccess && redeemHash) {
            setToast({ message: 'Withdrawal successful! USDC sent to your wallet.', type: 'success' });
            saveTxToHistory('withdraw', depositAmount, redeemHash);
            setDepositAmount('');
        }
    }, [isRedeemSuccess]);

    useEffect(() => {
        if (isApproveSuccess && depositAmount && address) {
            // IMPORTANT: After approval succeeds, we MUST reset and directly deposit
            // DO NOT call handleDeposit() as it will re-check allowance which may be stale
            setToast({ message: 'Approval confirmed! Now depositing...', type: 'pending' });

            // Reset the approval state to prevent loops
            resetApprove();

            // Refetch allowance for next time, then deposit directly
            refetchAllowance().then(() => {
                const amountWei = parseUnits(depositAmount, USDC_DECIMALS);
                depositAssets({
                    address: strategyAddress,
                    abi: STRATEGY_ABI,
                    functionName: 'deposit',
                    args: [amountWei, address],
                } as any);
            });
        }
    }, [isApproveSuccess]);

    // Handle transaction errors and cancellations
    useEffect(() => {
        if (approveError) {
            const msg = approveError.message.includes('User rejected')
                ? 'Approval cancelled by user'
                : 'Approval failed: ' + approveError.message.slice(0, 50);
            setToast({ message: msg, type: 'error' });
            resetApprove();
        }
    }, [approveError]);

    useEffect(() => {
        if (depositError) {
            const msg = depositError.message.includes('User rejected')
                ? 'Deposit cancelled by user'
                : 'Deposit failed: ' + depositError.message.slice(0, 50);
            setToast({ message: msg, type: 'error' });
            resetDeposit();
        }
    }, [depositError]);

    useEffect(() => {
        if (redeemError) {
            const msg = redeemError.message.includes('User rejected')
                ? 'Withdrawal cancelled by user'
                : 'Withdrawal failed: ' + redeemError.message.slice(0, 50);
            setToast({ message: msg, type: 'error' });
            resetRedeem();
        }
    }, [redeemError]);

    // Handle on-chain transaction failures
    useEffect(() => {
        if (isApproveFailed) {
            setToast({ message: 'Approval transaction failed on-chain', type: 'error' });
        }
    }, [isApproveFailed]);

    useEffect(() => {
        if (isDepositFailed) {
            setToast({ message: 'Deposit transaction failed on-chain', type: 'error' });
        }
    }, [isDepositFailed]);

    useEffect(() => {
        if (isRedeemFailed) {
            setToast({ message: 'Withdrawal transaction failed on-chain', type: 'error' });
        }
    }, [isRedeemFailed]);

    const handleAcceptTerms = () => {
        if (rememberDevice) {
            localStorage.setItem('jusdi-terms-remembered', 'true');
        }
        setHasAcceptedTerms(true);
        setShowTermsModal(false);
    };

    const isMainnet = chainId === 8453;
    const contracts = isMainnet ? CONTRACTS.mainnet : CONTRACTS.testnet;
    const strategyAddress = contracts.strategy as `0x${string}`;
    const USDCAddress = contracts.USDC as `0x${string}`;

    // Read contract data
    const { data: strategyStatus, refetch: refetchStatus, isLoading: isLoadingStatus } = useReadContract({
        address: strategyAddress,
        abi: STRATEGY_ABI,
        functionName: 'getStrategyStatus',
    });

    // Read deposit cap
    const { data: depositCapRaw } = useReadContract({
        address: strategyAddress,
        abi: STRATEGY_ABI,
        functionName: 'depositCap',
    });
    const depositCap = depositCapRaw ? Number(formatUnits(depositCapRaw, USDC_DECIMALS)) : 100;

    const { data: USDCBalance, refetch: refetchCbUSD } = useReadContract({
        address: USDCAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    });

    // jUSDi balance (strategy shares)
    const { data: jUSDiBalance, refetch: refetchJUSDi } = useReadContract({
        address: strategyAddress,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: address ? [address] : undefined,
    });

    // Check USDC allowance for strategy
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: USDCAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address ? [address, strategyAddress] : undefined,
    });

    // Share ratio: 1 jUSDi = X USD
    const { data: shareRatio } = useReadContract({
        address: strategyAddress,
        abi: STRATEGY_ABI,
        functionName: 'convertToAssets',
        args: [BigInt(1e6)], // 1 jUSDi in wei (6 decimals for USDC)
    });

    const shareRatioDisplay = shareRatio ? (Number(formatUnits(shareRatio, USDC_DECIMALS))).toFixed(6) : '1.000000';

    // Allocation percentages - for jUSDi these represent USDC/USDT split
    const usdtPercent = strategyStatus ? Number(strategyStatus.wbtcAlloc) / 100 : 50;
    const usdcPercent = strategyStatus ? Number(strategyStatus.cbbtcAlloc) / 100 : 50;
    const totalHoldings = strategyStatus ? Number(formatUnits(strategyStatus.totalHoldings, USDC_DECIMALS)) : 0;
    const depositUsdValue = parseFloat(depositAmount || '0'); // 1 USDC = $1

    // Handle deposit
    const handleDeposit = async () => {
        if (!address || !depositAmount) return;

        try {
            const amountWei = parseUnits(depositAmount, USDC_DECIMALS);

            if (!allowance || allowance < amountWei) {
                setToast({ message: 'Approving USDC (one-time)...', type: 'pending' });
                // Use max uint256 for infinite approval (one-time)
                const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
                approveToken({
                    address: USDCAddress,
                    abi: ERC20_ABI,
                    functionName: 'approve',
                    args: [strategyAddress, MAX_UINT256],
                } as any);
                return;
            }

            setToast({ message: 'Depositing USDC...', type: 'pending' });
            depositAssets({
                address: strategyAddress,
                abi: STRATEGY_ABI,
                functionName: 'deposit',
                args: [amountWei, address],
            } as any);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
            setToast({ message: errorMessage, type: 'error' });
        }
    };

    // Handle withdraw
    const handleWithdraw = async () => {
        if (!address || !depositAmount) return;

        try {
            const sharesWei = parseUnits(depositAmount, USDC_DECIMALS);
            setToast({ message: 'Withdrawing USDC...', type: 'pending' });
            redeemShares({
                address: strategyAddress,
                abi: STRATEGY_ABI,
                functionName: 'redeem',
                args: [sharesWei, address, address],
            } as any);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Transaction failed';
            setToast({ message: errorMessage, type: 'error' });
        }
    };

    // Refetch balances after successful transactions
    // Refetch balances after successful transactions with retry logic
    // This handles cases where RPC nodes might be slightly out of sync
    const refetchAll = useCallback(() => {
        refetchCbUSD();
        refetchJUSDi();
        refetchStatus();
        refetchAllowance();
    }, [refetchCbUSD, refetchJUSDi, refetchStatus, refetchAllowance]);

    useEffect(() => {
        if (isDepositSuccess || isRedeemSuccess) {
            // Immediate refetch
            refetchAll();

            // Refetch after delays to ensure indexers catch up
            const t1 = setTimeout(refetchAll, 2000);
            const t2 = setTimeout(refetchAll, 5000);

            // Clear input and show success message
            setDepositAmount('');
            setToast({
                message: isDepositSuccess ? 'Deposit successful! Balances updating...' : 'Withdraw successful! Balances updating...',
                type: 'success'
            });

            return () => {
                clearTimeout(t1);
                clearTimeout(t2);
            };
        }
    }, [isDepositSuccess, isRedeemSuccess, refetchAll]);

    const isLoading = isApproving || isDepositing || isRedeeming || isApproveConfirming || isDepositConfirming || isRedeemConfirming;

    // Terms Modal - Must accept BEFORE seeing tutorial or app
    if (showTermsModal && !hasAcceptedTerms) {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
            }}>
                <div style={{
                    background: 'white',
                    borderRadius: '24px',
                    maxWidth: '560px',
                    width: '100%',
                    padding: '40px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(0, 82, 255, 0.1)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
                            <Image src="/jubilee-logo-pink.png" alt="Jubilee" width={40} height={40} />
                            <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#3B3B3B' }}>jUSDi</span>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#0052FF' }}>
                            Terms of Use
                        </h2>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, rgba(243, 119, 187, 0.08) 0%, rgba(0, 82, 255, 0.08) 100%)',
                        borderRadius: '16px',
                        padding: '24px',
                        marginBottom: '28px',
                        maxHeight: '320px',
                        overflowY: 'auto',
                        fontSize: '13px',
                        lineHeight: '1.7',
                        color: '#4B5563',
                        border: '1px solid rgba(0, 82, 255, 0.1)'
                    }}>
                        <p style={{ marginBottom: '16px', fontWeight: '600', color: '#3B3B3B' }}>
                            By using jUSDi, a product of Jubilee Protocol governed by Hundredfold Foundation and developed by Jubilee Labs, you acknowledge and agree:
                        </p>

                        <p style={{ marginBottom: '14px' }}>
                            <strong style={{ color: '#0052FF' }}>(a)</strong> jUSDi is provided on an &quot;AS-IS&quot; and &quot;AS AVAILABLE&quot; basis. Hundredfold Foundation, Jubilee Labs, and their affiliates expressly disclaim all representations, warranties, and conditions of any kind, whether express, implied, or statutory.
                        </p>

                        <p style={{ marginBottom: '14px' }}>
                            <strong style={{ color: '#0052FF' }}>(b)</strong> Neither Hundredfold Foundation nor Jubilee Labs makes any warranty that jUSDi will meet your requirements, be available on an uninterrupted, timely, secure, or error-free basis, or be accurate, reliable, or free of harmful code.
                        </p>

                        <p style={{ marginBottom: '14px' }}>
                            <strong style={{ color: '#0052FF' }}>(c)</strong> You shall have no claim against Hundredfold Foundation, Jubilee Labs, or their affiliates for any loss arising from your use of jUSDi or Jubilee Protocol products.
                        </p>

                        <p style={{ marginBottom: '14px' }}>
                            <strong style={{ color: '#FFA500' }}>(d)</strong> DeFi protocols carry significant risks including: smart contract vulnerabilities, market volatility, oracle failures, and potential total loss of deposited funds.
                        </p>

                        <p>
                            <strong style={{ color: '#FFA500' }}>(e)</strong> This is not financial, legal, or tax advice. You are solely responsible for your own investment decisions and due diligence.
                        </p>
                    </div>

                    {/* Remember Device Checkbox */}
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        marginBottom: '16px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#6B7280'
                    }}>
                        <input
                            type="checkbox"
                            checked={rememberDevice}
                            onChange={(e) => setRememberDevice(e.target.checked)}
                            style={{
                                width: '18px',
                                height: '18px',
                                accentColor: '#0052FF',
                                cursor: 'pointer'
                            }}
                        />
                        Remember this device
                    </label>

                    <button
                        onClick={handleAcceptTerms}
                        style={{
                            width: '100%',
                            padding: '20px 40px',
                            background: 'linear-gradient(135deg, #0052FF 0%, #003DBF 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '16px',
                            fontSize: '20px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(0, 82, 255, 0.4)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        I Understand &amp; Accept
                    </button>

                    <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', color: '#9CA3AF' }}>
                        By clicking Accept, you agree to the Jubilee Protocol Terms of Service
                    </p>
                </div>
            </div>
        );
    }

    // Tutorial Modal - Shows for first-time visitors AFTER accepting terms
    if (showTutorial) {
        return (
            <TutorialModal
                isOpen={showTutorial}
                onClose={completeTutorial}
                theme={theme}
                btcPrice={btcPrice}
            />
        );
    }

    return (
        <>
            {/* CSS for animations */}
            <style jsx global>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>

            {/* Toast notifications */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* FASB Dashboard Modal */}
            <FASBDashboard
                isOpen={showFASBDashboard}
                onClose={() => setShowFASBDashboard(false)}
                theme={theme}
                btcPrice={btcPrice}
            />

            {/* Treasury Mode Modal */}
            <TreasuryMode
                isOpen={showTreasuryMode}
                onClose={() => setShowTreasuryMode(false)}
                theme={theme}
            />

            {/* Onramp Modal - Buy USDC with Apple Pay, Google Pay, etc */}
            <OnrampModal
                isOpen={showOnramp}
                onClose={() => setShowOnramp(false)}
                theme={theme}
                btcPrice={btcPrice}
            />

            <main style={getGradientStyle(theme)} className="flex flex-col">
                {/* Header */}
                <header style={{
                    padding: '20px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Image src="/jubilee-logo-pink.png" alt="Jubilee" width={32} height={32} />
                        <span style={{ fontSize: '22px', fontWeight: 'bold', color: c.text }}>jUSDi</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
                        {/* Reports button - icon only on mobile */}
                        {isConnected && (
                            <button
                                onClick={() => setShowFASBDashboard(true)}
                                style={{
                                    background: theme === 'dark' ? '#1a1a2e' : '#F3F4F6',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '36px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    fontSize: '16px',
                                }}
                                title="FASB Fair Value Reports"
                            >
                                📊
                            </button>
                        )}
                        {/* Dark mode toggle */}
                        <button
                            onClick={toggleTheme}
                            style={{
                                background: theme === 'dark' ? '#1a1a2e' : '#F3F4F6',
                                border: 'none',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '16px'
                            }}
                            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                        >
                            {theme === 'light' ? '🌙' : '☀️'}
                        </button>
                        {/* Treasury Mode button - icon only on mobile */}
                        <button
                            onClick={() => setShowTreasuryMode(true)}
                            style={{
                                background: theme === 'dark' ? '#1a1a2e' : '#F3F4F6',
                                border: 'none',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '16px',
                            }}
                            title="Treasury Mode for Organizations"
                        >
                            🏛️
                        </button>
                        {/* Connect Wallet */}
                        <ConnectButton />
                    </div>
                </header>

                {/* Main Content */}
                <div className="flex-1 flex items-center justify-center px-6 py-8">
                    <div className="w-full max-w-[480px]">
                        {/* Card */}
                        <div style={{
                            background: c.card,
                            borderRadius: '16px',
                            padding: '32px',
                            boxShadow: '0 4px 24px rgba(0, 82, 255, 0.08)',
                            border: `1px solid ${c.cardBorder}`
                        }}>
                            {/* Maintenance Mode Banner */}
                            {isMaintenanceMode && (
                                <div style={{
                                    background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                                    border: '1px solid #F59E0B',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    marginBottom: '24px',
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '12px'
                                }}>
                                    <span style={{ fontSize: '20px' }}>🔧</span>
                                    <div>
                                        <div style={{ fontWeight: '600', color: '#92400E', marginBottom: '4px' }}>
                                            Scheduled Maintenance
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#A16207', lineHeight: '1.4' }}>
                                            {MAINTENANCE_MESSAGE}
                                        </div>
                                    </div>
                                </div>
                            )}


                            {/* Tabs */}
                            <div style={{ display: 'flex', gap: '32px', marginBottom: '32px', borderBottom: `1px solid ${c.cardBorder}`, paddingBottom: '16px' }}>
                                <button
                                    onClick={() => setActiveTab('deposit')}
                                    style={{
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        color: activeTab === 'deposit' ? '#0052FF' : c.textLight,
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Deposit
                                </button>
                                <button
                                    onClick={() => setActiveTab('withdraw')}
                                    style={{
                                        fontSize: '18px',
                                        fontWeight: '600',
                                        color: activeTab === 'withdraw' ? '#0052FF' : c.textLight,
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Withdraw
                                </button>
                                {/* History toggle */}
                                {isConnected && (
                                    <button
                                        onClick={() => setShowHistory(!showHistory)}
                                        style={{
                                            marginLeft: 'auto',
                                            fontSize: '14px',
                                            color: showHistory ? '#0052FF' : c.textLight,
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        History
                                    </button>
                                )}
                            </div>

                            {/* Transaction History Panel */}
                            {showHistory && isConnected && (
                                <div style={{
                                    marginBottom: '24px',
                                    padding: '16px',
                                    background: c.inputBg,
                                    borderRadius: '12px',
                                    maxHeight: '200px',
                                    overflowY: 'auto'
                                }}>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: c.text, marginBottom: '12px' }}>
                                        Recent Transactions
                                    </div>
                                    {txHistory.length === 0 ? (
                                        <div style={{ fontSize: '13px', color: c.textMuted }}>No transactions yet</div>
                                    ) : (
                                        txHistory.map((tx, i) => (
                                            <div key={i} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '10px 0',
                                                borderBottom: i < txHistory.length - 1 ? `1px solid ${c.cardBorder}` : 'none'
                                            }}>
                                                <div>
                                                    <span style={{
                                                        color: tx.type === 'deposit' ? '#22C55E' : '#F59E0B',
                                                        fontWeight: '500',
                                                        fontSize: '13px'
                                                    }}>
                                                        {tx.type === 'deposit' ? '↓ Deposit' : '↑ Withdraw'}
                                                    </span>
                                                    <span style={{ marginLeft: '8px', color: c.text, fontSize: '13px' }}>
                                                        {tx.amount} USD
                                                    </span>
                                                </div>
                                                <a
                                                    href={`https://basescan.org/tx/${tx.hash}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ color: '#0052FF', fontSize: '12px' }}
                                                >
                                                    View ↗
                                                </a>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Input Section */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Input Token */}
                                <div style={{ background: c.inputBg, borderRadius: '16px', padding: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: c.textMuted, marginBottom: '16px' }}>
                                        <span>{activeTab === 'deposit' ? 'You deposit' : 'You withdraw'}</span>
                                        <span>
                                            Balance: <span style={{ color: c.text, fontWeight: '500' }}>
                                                {activeTab === 'deposit'
                                                    ? (USDCBalance ? parseFloat(formatUnits(USDCBalance, USDC_DECIMALS)).toFixed(4) : '0.00')
                                                    : (jUSDiBalance ? parseFloat(formatUnits(jUSDiBalance, USDC_DECIMALS)).toFixed(4) : '0.00')
                                                }
                                            </span>
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="0"
                                            value={depositAmount}
                                            onChange={(e) => setDepositAmount(e.target.value)}
                                            style={{
                                                fontSize: '28px',
                                                fontWeight: '600',
                                                background: 'transparent',
                                                border: 'none',
                                                outline: 'none',
                                                width: '100%',
                                                color: c.text
                                            }}
                                        />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                            <button
                                                onClick={() => {
                                                    const balance = activeTab === 'deposit' ? USDCBalance : jUSDiBalance;
                                                    setDepositAmount(balance ? formatUnits(balance, USDC_DECIMALS) : '0');
                                                }}
                                                style={{ color: '#0052FF', fontSize: '14px', fontWeight: '500', background: 'none', border: 'none', cursor: 'pointer' }}
                                            >
                                                Max
                                            </button>
                                            {activeTab === 'deposit' ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#DBEAFE', borderRadius: '20px', padding: '6px 12px' }}>
                                                    <div style={{ width: '20px', height: '20px', background: '#0052FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <span style={{ color: 'white', fontSize: '9px', fontWeight: 'bold' }}>cb</span>
                                                    </div>
                                                    <span style={{ color: '#3B3B3B', fontSize: '14px', fontWeight: '500' }}>USDC</span>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FEF3C7', borderRadius: '20px', padding: '6px 12px' }}>
                                                    <div style={{ width: '20px', height: '20px', background: '#FFA500', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <span style={{ color: 'white', fontSize: '9px', fontWeight: 'bold' }}>j</span>
                                                    </div>
                                                    <span style={{ color: '#3B3B3B', fontSize: '14px', fontWeight: '500' }}>jUSDi</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '14px', color: c.textLight, marginTop: '12px' }}>≈ ${depositUsdValue.toLocaleString()}</div>
                                </div>

                                {/* Arrow - Click to toggle */}
                                <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0' }}>
                                    <button
                                        onClick={() => setActiveTab(activeTab === 'deposit' ? 'withdraw' : 'deposit')}
                                        style={{
                                            background: c.card,
                                            border: `1px solid ${c.cardBorder}`,
                                            borderRadius: '50%',
                                            padding: '12px',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c.text} strokeWidth="2">
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <polyline points="19 12 12 19 5 12" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Output Token */}
                                <div style={{ background: c.inputBg, borderRadius: '16px', padding: '20px' }}>
                                    <div style={{ fontSize: '14px', color: c.textMuted, marginBottom: '16px' }}>You receive</div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '28px', fontWeight: '600', color: c.text }}>{depositAmount || '0'}</span>
                                        {activeTab === 'deposit' ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF3C7', borderRadius: '20px', padding: '8px 16px' }}>
                                                <div style={{ width: '24px', height: '24px', background: '#FFA500', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>j</span>
                                                </div>
                                                <span style={{ color: '#3B3B3B', fontSize: '14px', fontWeight: '500' }}>jUSDi</span>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#DBEAFE', borderRadius: '20px', padding: '8px 16px' }}>
                                                <div style={{ width: '24px', height: '24px', background: '#0052FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <span style={{ color: 'white', fontSize: '10px', fontWeight: 'bold' }}>cb</span>
                                                </div>
                                                <span style={{ color: '#3B3B3B', fontSize: '14px', fontWeight: '500' }}>USDC</span>
                                            </div>
                                        )}
                                    </div>
                                    {/* Share Ratio Display */}
                                    <div style={{ fontSize: '14px', color: c.textLight, marginTop: '12px' }}>
                                        1 jUSDi = {shareRatioDisplay} USD
                                    </div>
                                </div>

                                {/* Min deposit + Get USDC hint */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: c.textLight, padding: '0 8px' }}>
                                    <span>Min. deposit: ${MIN_DEPOSIT_USD} USDC</span>
                                    <button
                                        onClick={() => setShowOnramp(true)}
                                        style={{
                                            color: '#0052FF',
                                            textDecoration: 'underline',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            padding: 0,
                                        }}
                                    >
                                        Get USDC →
                                    </button>
                                </div>
                                <div style={{ fontSize: '10px', color: c.textLight, opacity: 0.7, textAlign: 'center', marginTop: '4px' }}>
                                    Price by <a href="https://www.coingecko.com/" target="_blank" rel="noopener noreferrer" style={{ color: c.textLight, textDecoration: 'underline' }}>CoinGecko</a>
                                </div>

                                {/* Gas-Free Banner for Coinbase Smart Wallet */}
                                {isGasFree && activeTab === 'deposit' && (
                                    <div style={{
                                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                        color: 'white',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        textAlign: 'center',
                                        marginTop: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                    }}>
                                        ⚡ Gas-Free Deposits with Coinbase Wallet
                                    </div>
                                )}
                                {/* Action Button */}
                                {!isConnected ? (
                                    <div style={{ width: '100%' }}>
                                        <ConnectButton.Custom>
                                            {({ openConnectModal }) => (
                                                <button
                                                    onClick={openConnectModal}
                                                    style={{
                                                        width: '100%',
                                                        padding: '18px',
                                                        marginTop: '8px',
                                                        borderRadius: '50px',
                                                        fontSize: '18px',
                                                        fontWeight: '600',
                                                        background: 'linear-gradient(135deg, #0052FF 0%, #003DBF 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 4px 14px rgba(0, 82, 255, 0.3)'
                                                    }}
                                                >
                                                    Connect Wallet
                                                </button>
                                            )}
                                        </ConnectButton.Custom>
                                    </div>
                                ) : (
                                    <button
                                        onClick={activeTab === 'deposit' ? handleDeposit : handleWithdraw}
                                        disabled={isLoading || !depositAmount || parseFloat(depositAmount) <= 0 || isMaintenanceMode}
                                        style={{
                                            width: '100%',
                                            padding: '18px',
                                            marginTop: '8px',
                                            borderRadius: '50px',
                                            fontSize: '18px',
                                            fontWeight: '600',
                                            background: (depositAmount && parseFloat(depositAmount) > 0 && !isLoading)
                                                ? 'linear-gradient(135deg, #0052FF 0%, #003DBF 100%)'
                                                : theme === 'dark' ? '#2a2a3e' : '#E5E7EB',
                                            color: (depositAmount && parseFloat(depositAmount) > 0 && !isLoading) ? 'white' : c.textLight,
                                            border: 'none',
                                            cursor: (depositAmount && parseFloat(depositAmount) > 0 && !isLoading) ? 'pointer' : 'not-allowed',
                                            boxShadow: (depositAmount && parseFloat(depositAmount) > 0 && !isLoading) ? '0 4px 14px rgba(0, 82, 255, 0.3)' : 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        {isLoading && (
                                            <div style={{
                                                width: '18px',
                                                height: '18px',
                                                border: '2px solid currentColor',
                                                borderTopColor: 'transparent',
                                                borderRadius: '50%',
                                                animation: 'spin 1s linear infinite'
                                            }} />
                                        )}
                                        {isLoading
                                            ? 'Processing...'
                                            : (depositAmount && parseFloat(depositAmount) > 0
                                                ? (activeTab === 'deposit'
                                                    ? (isGasFree ? '⚡ Deposit USDC (Gas-Free!)' : 'Deposit USDC')
                                                    : 'Withdraw USDC')
                                                : 'Enter an amount'
                                            )
                                        }
                                    </button>
                                )}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginTop: '24px' }}>
                            <div style={{ background: c.card, borderRadius: '12px', padding: '12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: `1px solid ${c.cardBorder}` }}>
                                <div style={{ fontSize: '10px', color: c.textLight, textTransform: 'uppercase', marginBottom: '4px' }}>
                                    TVL (USD)
                                </div>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: c.text }}>
                                    {isLoadingStatus ? <Skeleton width="50px" /> : `$${totalHoldings.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                                </div>
                            </div>
                            <div style={{ background: c.card, borderRadius: '12px', padding: '12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: `1px solid ${c.cardBorder}` }}>
                                <div style={{ fontSize: '10px', color: c.textLight, textTransform: 'uppercase', marginBottom: '4px' }}>APY</div>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0052FF' }}>3-6%</div>
                            </div>
                            <div style={{ background: c.card, borderRadius: '12px', padding: '12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: `1px solid ${c.cardBorder}` }}>
                                <div style={{ fontSize: '10px', color: c.textLight, textTransform: 'uppercase', marginBottom: '4px' }}>USDT</div>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#FFA500' }}>
                                    {isLoadingStatus ? <Skeleton width="40px" /> : `${usdtPercent.toFixed(0)}%`}
                                </div>
                            </div>
                            <div style={{ background: c.card, borderRadius: '12px', padding: '12px', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: `1px solid ${c.cardBorder}` }}>
                                <div style={{ fontSize: '10px', color: c.textLight, textTransform: 'uppercase', marginBottom: '4px' }}>USDC</div>
                                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0052FF' }}>
                                    {isLoadingStatus ? <Skeleton width="40px" /> : `${usdcPercent.toFixed(0)}%`}
                                </div>
                            </div>
                        </div>

                        {/* User Balances */}
                        {isConnected && (
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px', fontSize: '13px', color: c.textMuted }}>
                                <span>
                                    Your USDC: <strong style={{ color: '#0052FF' }}>{USDCBalance ? parseFloat(formatUnits(USDCBalance, USDC_DECIMALS)).toFixed(4) : '0'}</strong>
                                </span>
                                <span>
                                    Your jUSDi: <strong style={{ color: '#FFA500' }}>{jUSDiBalance ? parseFloat(formatUnits(jUSDiBalance, USDC_DECIMALS)).toFixed(4) : '0'}</strong>
                                </span>
                            </div>
                        )}

                        {/* Status & Links */}
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '20px', fontSize: '14px', flexWrap: 'wrap' }}>
                            <span style={{ color: isMaintenanceMode ? '#F59E0B' : (strategyStatus?.isPaused ? '#EF4444' : '#22C55E') }}>
                                ● {isMaintenanceMode ? 'Maintenance' : (strategyStatus?.isPaused ? 'Paused' : 'Active')}
                            </span>
                            <a href="https://basescan.org/address/0x0B03463259d5041004290822444c4183aE936050" target="_blank" rel="noopener noreferrer" style={{ color: c.textLight }}>
                                Contract ↗
                            </a>
                            <a href="https://github.com/Jubilee-Protocol/jUSDi/blob/main/docs/RED_TEAM_EVM_AUDIT.md" target="_blank" rel="noopener noreferrer" style={{ color: c.textLight }}>
                                Audit ↗
                            </a>
                            <a href="https://github.com/Jubilee-Protocol/jUSDi/blob/main/docs/FAQ.md" target="_blank" rel="noopener noreferrer" style={{ color: c.textLight }}>
                                FAQ ↗
                            </a>
                            <a href="https://github.com/Jubilee-Protocol/jUSDi#readme" target="_blank" rel="noopener noreferrer" style={{ color: c.textLight }}>
                                Learn More ↗
                            </a>
                            <button
                                onClick={reopenTutorial}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: c.textLight,
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    padding: 0,
                                }}
                            >
                                📚 Tutorial
                            </button>
                            <a
                                href="mailto:contact@jubileeprotocol.xyz"
                                title="Contact us for support"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #E040FB 0%, #7C4DFF 100%)',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: '700',
                                    textDecoration: 'none',
                                    marginLeft: '4px'
                                }}
                            >
                                ✉
                            </a>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer style={{ padding: '24px', textAlign: 'center', fontSize: '14px', color: c.textLight }}>
                    2026 © Jubilee Protocol · Governed by Hundredfold Foundation
                </footer>
            </main>
        </>
    );
}
