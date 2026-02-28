'use client';

import Image from 'next/image';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicKey, Transaction } from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    getAccount,
    createAssociatedTokenAccountInstruction,
    createTransferInstruction,
    TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { PROGRAM_ID, MINTS, CLUSTER, getExplorerUrl, USDC_DECIMALS, JUSDI_DECIMALS } from '../config';

// Min deposit constant
const MIN_DEPOSIT_USD = 0.01;

// Theme types
type Theme = 'light' | 'dark';

// Get gradient style based on theme
const getGradientStyle = (theme: Theme) => ({
    background: theme === 'light'
        ? `
            radial-gradient(ellipse at top left, rgba(243, 119, 187, 0.30) 0%, transparent 60%),
            radial-gradient(ellipse at bottom right, rgba(243, 119, 187, 0.22) 0%, transparent 60%),
            radial-gradient(ellipse at center, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.85) 40%, rgba(148, 87, 235, 0.25) 100%)
        `
        : `
            radial-gradient(ellipse at top left, rgba(148, 87, 235, 0.15) 0%, transparent 60%),
            radial-gradient(ellipse at bottom right, rgba(243, 119, 187, 0.15) 0%, transparent 60%),
            #0a0a0f
        `,
    minHeight: '100vh'
});

// Theme colors
const colors = {
    light: {
        bg: '#FFFFFF',
        card: '#FFFFFF',
        cardBorder: 'rgba(148, 87, 235, 0.15)',
        text: '#3B3B3B',
        textMuted: '#6B7280',
        textLight: '#9CA3AF',
        inputBg: '#F9FAFB',
        accent: '#9457EB',
        accentGradient: 'linear-gradient(135deg, #9457EB 0%, #7B3FD4 100%)',
    },
    dark: {
        bg: '#0a0a0f',
        card: '#1a1a2e',
        cardBorder: 'rgba(148, 87, 235, 0.25)',
        text: '#E5E7EB',
        textMuted: '#9CA3AF',
        textLight: '#6B7280',
        inputBg: '#16162a',
        accent: '#9457EB',
        accentGradient: 'linear-gradient(135deg, #9457EB 0%, #7B3FD4 100%)',
    }
};

// Toast component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'pending'; onClose: () => void }) {
    useEffect(() => {
        if (type !== 'pending') {
            const timer = setTimeout(onClose, 5000);
            return () => clearTimeout(timer);
        }
    }, [type, onClose]);

    const bgColor = type === 'success' ? '#22C55E' : type === 'error' ? '#EF4444' : '#9457EB';

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

// Skeleton loader
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
    const { publicKey, connected, sendTransaction } = useWallet();
    const { connection } = useConnection();
    const [depositAmount, setDepositAmount] = useState('');
    const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
    const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(true);
    const [rememberDevice, setRememberDevice] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'pending' } | null>(null);
    const [theme, setTheme] = useState<Theme>('light');
    const [showHistory, setShowHistory] = useState(false);
    const [txHistory, setTxHistory] = useState<TxHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Balances
    const [usdcBalance, setUsdcBalance] = useState<number>(0);
    const [shareBalance, setShareBalance] = useState<number>(0);
    const [totalHoldings, setTotalHoldings] = useState<number>(0);

    // Vault PDA
    const [vaultPda] = useMemo(() => {
        return PublicKey.findProgramAddressSync([Buffer.from('vault')], PROGRAM_ID);
    }, []);

    const address = publicKey?.toBase58();
    const isMainnet = CLUSTER === 'mainnet-beta';

    // Get theme colors
    const c = colors[theme];

    // Load theme
    useEffect(() => {
        const savedTheme = localStorage.getItem('jusdi-solana-theme') as Theme | null;
        if (savedTheme) {
            setTheme(savedTheme);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
        }
    }, []);

    const toggleTheme = useCallback(() => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('jusdi-solana-theme', newTheme);
    }, [theme]);

    // Check localStorage for remembered terms
    useEffect(() => {
        const remembered = localStorage.getItem('jusdi-solana-terms');
        if (remembered === 'true') {
            setHasAcceptedTerms(true);
            setShowTermsModal(false);
        }
    }, []);

    const handleAcceptTerms = () => {
        if (rememberDevice) {
            localStorage.setItem('jusdi-solana-terms', 'true');
        }
        setHasAcceptedTerms(true);
        setShowTermsModal(false);
    };

    // Fetch balances
    const fetchBalances = useCallback(async () => {
        if (!publicKey || !connected) return;
        try {
            const usdcAta = await getAssociatedTokenAddress(MINTS.USDC, publicKey);
            try {
                const usdcAccount = await getAccount(connection, usdcAta);
                setUsdcBalance(Number(usdcAccount.amount) / Math.pow(10, USDC_DECIMALS));
            } catch {
                setUsdcBalance(0);
            }
        } catch (err) {
            console.error('Balance fetch error:', err);
        }
    }, [publicKey, connected, connection]);

    useEffect(() => {
        fetchBalances();
        const interval = setInterval(fetchBalances, 15000);
        return () => clearInterval(interval);
    }, [fetchBalances]);

    // Load tx history
    useEffect(() => {
        if (address) {
            const saved = localStorage.getItem(`jusdi-solana-history-${address}`);
            if (saved) setTxHistory(JSON.parse(saved));
        }
    }, [address]);

    const saveTxToHistory = useCallback((type: 'deposit' | 'withdraw', amount: string, hash: string) => {
        if (!address) return;
        const newTx: TxHistoryItem = { type, amount, timestamp: Date.now(), hash };
        const updated = [newTx, ...txHistory].slice(0, 20);
        setTxHistory(updated);
        localStorage.setItem(`jusdi-solana-history-${address}`, JSON.stringify(updated));
    }, [address, txHistory]);

    const depositUsdValue = parseFloat(depositAmount || '0');
    const shareRatioDisplay = '1.000000';

    // Handle deposit - placeholder for Anchor program call
    const handleDeposit = async () => {
        if (!publicKey || !depositAmount) return;
        setIsLoading(true);
        setToast({ message: 'Depositing USDC...', type: 'pending' });

        try {
            // TODO: Replace with Anchor program.methods.deposit() call
            // For now, show the flow works
            setToast({ message: 'Program not yet initialized on devnet. Deploy first!', type: 'error' });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Transaction failed';
            setToast({ message: msg, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    // Handle withdraw - placeholder for Anchor program call
    const handleWithdraw = async () => {
        if (!publicKey || !depositAmount) return;
        setIsLoading(true);
        setToast({ message: 'Withdrawing...', type: 'pending' });

        try {
            setToast({ message: 'Program not yet initialized on devnet. Deploy first!', type: 'error' });
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'Transaction failed';
            setToast({ message: msg, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    // Terms Modal
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
                    border: '1px solid rgba(148, 87, 235, 0.1)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
                            <Image src="/jubilee-logo-pink.png" alt="Jubilee" width={40} height={40} />
                            <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#3B3B3B' }}>jUSDi</span>
                            <span style={{ fontSize: '12px', background: 'linear-gradient(135deg, #9457EB, #14F195)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: '700', padding: '2px 8px', border: '1px solid rgba(148,87,235,0.3)', borderRadius: '6px' }}>SOLANA</span>
                        </div>
                        <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#9457EB' }}>
                            Terms of Use
                        </h2>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, rgba(243, 119, 187, 0.08) 0%, rgba(148, 87, 235, 0.08) 100%)',
                        borderRadius: '16px',
                        padding: '24px',
                        marginBottom: '28px',
                        maxHeight: '320px',
                        overflowY: 'auto',
                        fontSize: '13px',
                        lineHeight: '1.7',
                        color: '#4B5563',
                        border: '1px solid rgba(148, 87, 235, 0.1)'
                    }}>
                        <p style={{ marginBottom: '16px', fontWeight: '600', color: '#3B3B3B' }}>
                            By using jUSDi on Solana, a product of Jubilee Protocol governed by Hundredfold Foundation and developed by Jubilee Labs, you acknowledge and agree:
                        </p>
                        <p style={{ marginBottom: '14px' }}>
                            <strong style={{ color: '#9457EB' }}>(a)</strong> jUSDi is provided on an &quot;AS-IS&quot; and &quot;AS AVAILABLE&quot; basis. Hundredfold Foundation, Jubilee Labs, and their affiliates expressly disclaim all representations, warranties, and conditions of any kind.
                        </p>
                        <p style={{ marginBottom: '14px' }}>
                            <strong style={{ color: '#9457EB' }}>(b)</strong> Neither Hundredfold Foundation nor Jubilee Labs makes any warranty that jUSDi will meet your requirements, be available on an uninterrupted, timely, secure, or error-free basis.
                        </p>
                        <p style={{ marginBottom: '14px' }}>
                            <strong style={{ color: '#FFA500' }}>(c)</strong> DeFi protocols carry significant risks including: smart contract vulnerabilities, market volatility, oracle failures, and potential total loss of deposited funds.
                        </p>
                        <p>
                            <strong style={{ color: '#FFA500' }}>(d)</strong> This is not financial, legal, or tax advice. You are solely responsible for your own investment decisions.
                        </p>
                    </div>

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
                            style={{ width: '18px', height: '18px', accentColor: '#9457EB', cursor: 'pointer' }}
                        />
                        Remember this device
                    </label>

                    <button
                        onClick={handleAcceptTerms}
                        style={{
                            width: '100%',
                            padding: '20px 40px',
                            background: 'linear-gradient(135deg, #9457EB 0%, #7B3FD4 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '16px',
                            fontSize: '20px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(148, 87, 235, 0.4)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        I Understand &amp; Accept
                    </button>
                </div>
            </div>
        );
    }

    // Main App
    return (
        <div style={getGradientStyle(theme)}>
            {/* Animations */}
            <style jsx global>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes slideIn { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
            `}</style>

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 24px',
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Image src="/jubilee-logo-pink.png" alt="Jubilee" width={32} height={32} />
                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: c.text }}>jUSDi</span>
                    <span style={{
                        fontSize: '10px',
                        background: 'linear-gradient(135deg, #9457EB, #14F195)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: '700',
                        padding: '2px 6px',
                        border: '1px solid rgba(148,87,235,0.3)',
                        borderRadius: '4px'
                    }}>SOLANA</span>
                    {!isMainnet && (
                        <span style={{
                            fontSize: '10px',
                            background: '#FFA500',
                            color: 'white',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: '600'
                        }}>DEVNET</span>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        onClick={toggleTheme}
                        style={{
                            background: 'none',
                            border: `1px solid ${c.cardBorder}`,
                            borderRadius: '10px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '16px',
                            color: c.text
                        }}
                    >
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>
                    <WalletMultiButton style={{
                        background: 'linear-gradient(135deg, #9457EB 0%, #7B3FD4 100%)',
                        borderRadius: '12px',
                        fontSize: '14px',
                        height: '40px',
                    }} />
                </div>
            </div>

            {/* Main Content */}
            <div style={{
                maxWidth: '460px',
                margin: '0 auto',
                padding: '0 20px 40px'
            }}>
                {/* TVL Card */}
                <div style={{
                    background: c.card,
                    borderRadius: '20px',
                    padding: '24px',
                    marginBottom: '16px',
                    border: `1px solid ${c.cardBorder}`,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    textAlign: 'center'
                }}>
                    <p style={{ fontSize: '13px', color: c.textMuted, marginBottom: '4px' }}>Total Value Locked</p>
                    <p style={{ fontSize: '32px', fontWeight: '700', color: c.text }}>
                        ${totalHoldings.toFixed(2)}
                    </p>
                    <p style={{ fontSize: '12px', color: c.textLight, marginTop: '4px' }}>
                        1 jUSDi = ${shareRatioDisplay} USDC
                    </p>
                </div>

                {/* Allocation Bar */}
                <div style={{
                    background: c.card,
                    borderRadius: '16px',
                    padding: '16px 20px',
                    marginBottom: '16px',
                    border: `1px solid ${c.cardBorder}`,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', color: c.textMuted }}>Allocation</span>
                        <span style={{ fontSize: '12px', color: c.textMuted }}>Target: 50/50</span>
                    </div>
                    <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: c.inputBg }}>
                        <div style={{ width: '100%', background: 'linear-gradient(90deg, #2775CA, #9457EB)', borderRadius: '4px' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#2775CA', fontWeight: '600' }}>USDC 100%</span>
                        <span style={{ fontSize: '11px', color: '#26A17B', fontWeight: '600' }}>USDT 0%</span>
                    </div>
                </div>

                {/* Deposit/Withdraw Card */}
                <div style={{
                    background: c.card,
                    borderRadius: '20px',
                    padding: '24px',
                    border: `1px solid ${c.cardBorder}`,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                }}>
                    {/* Tab Switcher */}
                    <div style={{
                        display: 'flex',
                        background: c.inputBg,
                        borderRadius: '12px',
                        padding: '4px',
                        marginBottom: '20px'
                    }}>
                        {(['deposit', 'withdraw'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => { setActiveTab(tab); setDepositAmount(''); }}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: activeTab === tab ? c.card : 'transparent',
                                    border: activeTab === tab ? `1px solid ${c.cardBorder}` : 'none',
                                    borderRadius: '10px',
                                    fontSize: '14px',
                                    fontWeight: activeTab === tab ? '600' : '400',
                                    color: activeTab === tab ? c.text : c.textMuted,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: activeTab === tab ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                                    textTransform: 'capitalize'
                                }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Balance Display */}
                    {connected && (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: '12px',
                            fontSize: '13px'
                        }}>
                            <span style={{ color: c.textMuted }}>
                                {activeTab === 'deposit' ? 'USDC Balance' : 'jUSDi Balance'}
                            </span>
                            <span style={{ color: c.text, fontWeight: '500' }}>
                                {activeTab === 'deposit'
                                    ? `${usdcBalance.toFixed(2)} USDC`
                                    : `${shareBalance.toFixed(2)} jUSDi`
                                }
                            </span>
                        </div>
                    )}

                    {/* Amount Input */}
                    <div style={{
                        position: 'relative',
                        marginBottom: '12px'
                    }}>
                        <input
                            type="number"
                            placeholder="0.00"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '16px',
                                paddingRight: '80px',
                                background: c.inputBg,
                                border: `1px solid ${c.cardBorder}`,
                                borderRadius: '14px',
                                fontSize: '20px',
                                fontWeight: '600',
                                color: c.text,
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                        <button
                            onClick={() => {
                                const maxBal = activeTab === 'deposit' ? usdcBalance : shareBalance;
                                setDepositAmount(String(maxBal));
                            }}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'rgba(148, 87, 235, 0.1)',
                                border: '1px solid rgba(148, 87, 235, 0.2)',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#9457EB',
                                cursor: 'pointer'
                            }}
                        >
                            MAX
                        </button>
                    </div>

                    {/* USD Value */}
                    {depositAmount && (
                        <p style={{ fontSize: '13px', color: c.textMuted, marginBottom: '16px', textAlign: 'right' }}>
                            ≈ ${depositUsdValue.toFixed(2)} USD
                        </p>
                    )}

                    {/* Action Button */}
                    {!connected ? (
                        <WalletMultiButton style={{
                            width: '100%',
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, #9457EB 0%, #7B3FD4 100%)',
                            borderRadius: '14px',
                            fontSize: '16px',
                            fontWeight: '600',
                            height: '52px',
                        }} />
                    ) : (
                        <button
                            onClick={activeTab === 'deposit' ? handleDeposit : handleWithdraw}
                            disabled={isLoading || !depositAmount || Number(depositAmount) <= 0}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: isLoading || !depositAmount
                                    ? c.inputBg
                                    : 'linear-gradient(135deg, #9457EB 0%, #7B3FD4 100%)',
                                color: isLoading || !depositAmount ? c.textMuted : 'white',
                                border: 'none',
                                borderRadius: '14px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: isLoading || !depositAmount ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: isLoading || !depositAmount ? 'none' : '0 4px 14px rgba(148, 87, 235, 0.4)'
                            }}
                        >
                            {isLoading
                                ? 'Processing...'
                                : activeTab === 'deposit'
                                    ? `Deposit ${depositAmount || ''} USDC`
                                    : `Withdraw ${depositAmount || ''} jUSDi`
                            }
                        </button>
                    )}
                </div>

                {/* Transaction History */}
                {connected && txHistory.length > 0 && (
                    <div style={{
                        background: c.card,
                        borderRadius: '16px',
                        padding: '16px 20px',
                        marginTop: '16px',
                        border: `1px solid ${c.cardBorder}`,
                    }}>
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: c.text,
                                fontSize: '14px',
                                fontWeight: '600',
                                padding: 0
                            }}
                        >
                            <span>Transaction History</span>
                            <span>{showHistory ? '▲' : '▼'}</span>
                        </button>
                        {showHistory && (
                            <div style={{ marginTop: '12px' }}>
                                {txHistory.map((tx, i) => (
                                    <div key={i} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '8px 0',
                                        borderTop: i > 0 ? `1px solid ${c.cardBorder}` : 'none',
                                        fontSize: '13px'
                                    }}>
                                        <div>
                                            <span style={{ color: tx.type === 'deposit' ? '#22C55E' : '#EF4444', fontWeight: '600' }}>
                                                {tx.type === 'deposit' ? '↓' : '↑'} {tx.type}
                                            </span>
                                            <span style={{ color: c.textMuted, marginLeft: '8px' }}>{tx.amount} USDC</span>
                                        </div>
                                        <a
                                            href={getExplorerUrl(tx.hash, 'tx')}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: '#9457EB', fontSize: '12px' }}
                                        >
                                            View ↗
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '24px',
                    fontSize: '12px',
                    color: c.textLight
                }}>
                    <p>Powered by <strong>Solana</strong> • {CLUSTER}</p>
                    <p style={{ marginTop: '4px' }}>
                        Program: <a
                            href={getExplorerUrl(PROGRAM_ID.toBase58())}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#9457EB' }}
                        >
                            {PROGRAM_ID.toBase58().slice(0, 8)}...
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}
