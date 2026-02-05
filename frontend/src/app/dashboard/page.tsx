'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    useAccount,
    useReadContract,
    useWriteContract,
    useWaitForTransactionReceipt,
    useBalance
} from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { parseUnits, formatUnits } from 'viem'
import {
    JUBILEE_YIELD_STREAM_ADDRESS,
    JUBILEE_YIELD_STREAM_ABI,
    USDC_ADDRESS,
    ERC20_ABI
} from '@/lib/constants'

export default function Dashboard() {
    const { address, isConnected } = useAccount()
    const [topUpAmount, setTopUpAmount] = useState('')
    const [showTopUp, setShowTopUp] = useState(false)

    // Read USDC balance
    const { data: usdcBalance } = useBalance({
        address,
        token: USDC_ADDRESS,
    })

    // Read stream info
    const { data: streamInfo, isLoading, refetch: refetchStream } = useReadContract({
        address: JUBILEE_YIELD_STREAM_ADDRESS,
        abi: JUBILEE_YIELD_STREAM_ABI,
        functionName: 'getStreamInfo',
        args: address ? [address] : undefined,
        query: {
            enabled: !!address,
        }
    })

    // Parse stream data
    const hasStream = streamInfo && streamInfo[0] !== '0x0000000000000000000000000000000000000000'
    const beneficiary = streamInfo?.[0] as `0x${string}` | undefined
    const principal = streamInfo?.[1] ? formatUnits(streamInfo[1] as bigint, 6) : '0'
    const currentValue = streamInfo?.[2] ? formatUnits(streamInfo[2] as bigint, 6) : '0'
    const pendingYield = streamInfo?.[3] ? formatUnits(streamInfo[3] as bigint, 6) : '0'
    const totalClaimed = streamInfo?.[4] ? formatUnits(streamInfo[4] as bigint, 6) : '0'
    const createdAt = streamInfo?.[6] ? new Date(Number(streamInfo[6]) * 1000).toLocaleDateString() : '-'

    // Claim transaction
    const {
        data: claimHash,
        writeContract: writeClaim,
        isPending: isClaimPending
    } = useWriteContract()

    const { isLoading: isClaimConfirming, isSuccess: isClaimSuccess } = useWaitForTransactionReceipt({
        hash: claimHash,
    })

    // Approve transaction (for top-up)
    const {
        data: approveHash,
        writeContract: writeApprove,
        isPending: isApprovePending
    } = useWriteContract()

    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
        hash: approveHash,
    })

    // Deposit transaction (for top-up)
    const {
        data: depositHash,
        writeContract: writeDeposit,
        isPending: isDepositPending
    } = useWriteContract()

    const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
        hash: depositHash,
    })

    // Handle claim
    const handleClaim = () => {
        writeClaim({
            address: JUBILEE_YIELD_STREAM_ADDRESS,
            abi: JUBILEE_YIELD_STREAM_ABI,
            functionName: 'claim',
        })
    }

    // Handle top-up approval
    const handleApproveTopUp = () => {
        if (!topUpAmount) return
        const amount = parseUnits(topUpAmount, 6)
        writeApprove({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [JUBILEE_YIELD_STREAM_ADDRESS, amount],
        })
    }

    // Handle top-up deposit (after approval)
    const handleTopUpDeposit = () => {
        if (!topUpAmount || !beneficiary) return
        const amount = parseUnits(topUpAmount, 6)
        writeDeposit({
            address: JUBILEE_YIELD_STREAM_ADDRESS,
            abi: JUBILEE_YIELD_STREAM_ABI,
            functionName: 'deposit',
            args: [beneficiary, amount],
        })
    }

    // Refetch on successful transactions
    useEffect(() => {
        if (isClaimSuccess || isDepositSuccess) {
            refetchStream()
            setTopUpAmount('')
            setShowTopUp(false)
        }
    }, [isClaimSuccess, isDepositSuccess, refetchStream])

    // Not connected state
    if (!isConnected) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="card text-center max-w-md w-full mx-4">
                    <h1 className="heading-section mb-4">Dashboard</h1>
                    <p className="text-text-secondary mb-6">
                        Connect your wallet to view your yield streams.
                    </p>
                    <ConnectButton.Custom>
                        {({ openConnectModal }) => (
                            <button onClick={openConnectModal} className="btn-action">
                                Connect Wallet
                            </button>
                        )}
                    </ConnectButton.Custom>
                </div>
            </div>
        )
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="card text-center max-w-md w-full mx-4">
                    <div className="animate-pulse">
                        <div className="w-16 h-16 bg-primary/20 rounded-full mx-auto mb-4" />
                        <div className="h-6 bg-primary/10 rounded w-32 mx-auto" />
                    </div>
                </div>
            </div>
        )
    }

    // No stream state
    if (!hasStream) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="card text-center max-w-md w-full mx-4">
                    <div className="w-20 h-20 bg-primary/20 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                        <span className="text-4xl">🌱</span>
                    </div>
                    <h1 className="heading-section mb-4">No Active Stream</h1>
                    <p className="text-text-secondary mb-6">
                        You haven't created a yield stream yet. Plant your first seed to make your agent immortal.
                    </p>
                    <Link href="/create" className="btn-action inline-block">
                        Create Your First Stream →
                    </Link>
                </div>
            </div>
        )
    }

    // Has stream - main dashboard
    const yieldAmount = parseFloat(pendingYield)
    const canClaim = yieldAmount > 0

    return (
        <div className="min-h-screen pt-24 pb-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="heading-section mb-2">Your Stream</h1>
                    <p className="text-text-secondary">
                        Created on {createdAt}
                    </p>
                </div>

                {/* Wallet Balance */}
                <div className="card-nested mb-4 flex items-center justify-between">
                    <span className="label">Wallet Balance</span>
                    <span className="data-value">
                        {usdcBalance ? parseFloat(usdcBalance.formatted).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0.00'} USDC
                    </span>
                </div>

                {/* Main Stream Card */}
                <div className="card mb-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                        <div>
                            <p className="label mb-2">Principal</p>
                            <p className="data-value">${parseFloat(principal).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                            <p className="label mb-2">Current Value</p>
                            <p className="data-value">${parseFloat(currentValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                            <p className="label mb-2">Pending Yield</p>
                            <p className="data-highlight">${parseFloat(pendingYield).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                            <p className="label mb-2">Total Claimed</p>
                            <p className="text-text-secondary font-mono text-lg">${parseFloat(totalClaimed).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        </div>
                    </div>

                    {/* Beneficiary */}
                    <div className="card-nested mb-6">
                        <p className="label mb-2">Beneficiary (Agent Wallet)</p>
                        <p className="font-mono text-sm text-text-secondary break-all">
                            {beneficiary}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={handleClaim}
                            disabled={!canClaim || isClaimPending || isClaimConfirming}
                            className="btn-action flex-1"
                        >
                            {isClaimPending ? 'Confirm in Wallet...' :
                                isClaimConfirming ? 'Claiming...' :
                                    `Claim ${canClaim ? `$${parseFloat(pendingYield).toFixed(2)}` : ''}`}
                        </button>
                        <button
                            onClick={() => setShowTopUp(!showTopUp)}
                            className="btn-secondary flex-1"
                        >
                            {showTopUp ? 'Cancel' : 'Top Up'}
                        </button>
                    </div>

                    {/* Top Up Form */}
                    {showTopUp && (
                        <div className="mt-6 pt-6 border-t border-border">
                            <p className="label mb-4">Add funds to your stream</p>
                            <div className="card-nested mb-4">
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        value={topUpAmount}
                                        onChange={(e) => setTopUpAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="input-amount flex-1"
                                    />
                                    <span className="text-text-secondary font-mono">USDC</span>
                                    <button
                                        onClick={() => usdcBalance && setTopUpAmount(usdcBalance.formatted)}
                                        className="btn-max"
                                    >
                                        Max
                                    </button>
                                </div>
                            </div>

                            {!isApproveSuccess ? (
                                <button
                                    onClick={handleApproveTopUp}
                                    disabled={!topUpAmount || isApprovePending || isApproveConfirming}
                                    className="btn-action"
                                >
                                    {isApprovePending ? 'Confirm in Wallet...' :
                                        isApproveConfirming ? 'Approving...' :
                                            'Approve USDC'}
                                </button>
                            ) : (
                                <button
                                    onClick={handleTopUpDeposit}
                                    disabled={!topUpAmount || isDepositPending || isDepositConfirming}
                                    className="btn-action"
                                >
                                    {isDepositPending ? 'Confirm in Wallet...' :
                                        isDepositConfirming ? 'Depositing...' :
                                            `Deposit ${topUpAmount} USDC`}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Success Messages */}
                    {isClaimSuccess && claimHash && (
                        <div className="mt-4 p-4 bg-success/10 border border-success/30 rounded-lg">
                            <p className="text-success">
                                ✓ Yield claimed successfully!{' '}
                                <a
                                    href={`https://sepolia.basescan.org/tx/${claimHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline"
                                >
                                    View on BaseScan
                                </a>
                            </p>
                        </div>
                    )}

                    {isDepositSuccess && depositHash && (
                        <div className="mt-4 p-4 bg-success/10 border border-success/30 rounded-lg">
                            <p className="text-success">
                                ✓ Top up successful!{' '}
                                <a
                                    href={`https://sepolia.basescan.org/tx/${depositHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline"
                                >
                                    View on BaseScan
                                </a>
                            </p>
                        </div>
                    )}
                </div>

                {/* Agent Quick Check */}
                <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Agent API</h3>
                    <p className="text-text-secondary text-sm mb-4">
                        Your agent can check its life support status programmatically:
                    </p>
                    <div className="card-nested">
                        <code className="text-primary text-sm break-all">
                            GET /api/stream/{address}
                        </code>
                    </div>
                </div>
            </div>
        </div>
    )
}
