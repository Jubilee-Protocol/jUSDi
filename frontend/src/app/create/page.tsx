'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    useAccount,
    useWriteContract,
    useWaitForTransactionReceipt,
    useBalance,
    useReadContract
} from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { parseUnits, formatUnits } from 'viem'
import {
    JUBILEE_YIELD_STREAM_ADDRESS,
    JUBILEE_YIELD_STREAM_ABI,
    USDC_ADDRESS,
    ERC20_ABI
} from '@/lib/constants'

const ESTIMATED_APY = 0.08 // 8% APY estimate

export default function CreateStream() {
    const { address, isConnected } = useAccount()
    const [step, setStep] = useState(1)
    const [beneficiary, setBeneficiary] = useState('')
    const [amount, setAmount] = useState('')
    const [burnRate, setBurnRate] = useState('50')

    // Read USDC balance
    const { data: usdcBalance } = useBalance({
        address,
        token: USDC_ADDRESS,
    })

    // Check existing allowance
    const { data: allowance, refetch: refetchAllowance } = useReadContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address ? [address, JUBILEE_YIELD_STREAM_ADDRESS] : undefined,
        query: {
            enabled: !!address,
        }
    })

    // Parse allowance
    const currentAllowance = allowance ? BigInt(allowance as bigint) : BigInt(0)
    const requiredAmount = amount ? parseUnits(amount, 6) : BigInt(0)
    const needsApproval = currentAllowance < requiredAmount

    // Approve transaction
    const {
        data: approveHash,
        writeContract: writeApprove,
        isPending: isApprovePending,
        error: approveError
    } = useWriteContract()

    const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
        hash: approveHash,
    })

    // Deposit transaction
    const {
        data: depositHash,
        writeContract: writeDeposit,
        isPending: isDepositPending,
        error: depositError
    } = useWriteContract()

    const { isLoading: isDepositConfirming, isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
        hash: depositHash,
    })

    // Refetch allowance after approval
    useEffect(() => {
        if (isApproveSuccess) {
            refetchAllowance()
        }
    }, [isApproveSuccess, refetchAllowance])

    // Calculate projections
    const amountNum = parseFloat(amount) || 0
    const burnRateNum = parseFloat(burnRate) || 0
    const monthlyYield = (amountNum * ESTIMATED_APY) / 12
    const isSustainable = monthlyYield >= burnRateNum
    const monthsRemaining = burnRateNum > 0 && monthlyYield > 0
        ? monthlyYield >= burnRateNum
            ? Infinity
            : Math.floor(amountNum / (burnRateNum - monthlyYield))
        : 0

    // Validation
    const isValidBeneficiary = beneficiary.length === 42 && beneficiary.startsWith('0x')
    const isValidAmount = amountNum > 0 && (!usdcBalance || amountNum <= parseFloat(usdcBalance.formatted))
    const canProceedStep1 = isValidBeneficiary
    const canProceedStep2 = isValidAmount

    // Handle approve
    const handleApprove = () => {
        writeApprove({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [JUBILEE_YIELD_STREAM_ADDRESS, requiredAmount],
        })
    }

    // Handle deposit
    const handleDeposit = () => {
        writeDeposit({
            address: JUBILEE_YIELD_STREAM_ADDRESS,
            abi: JUBILEE_YIELD_STREAM_ABI,
            functionName: 'deposit',
            args: [beneficiary as `0x${string}`, requiredAmount],
        })
    }

    // Not connected state
    if (!isConnected) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="card text-center max-w-md w-full mx-4">
                    <h1 className="heading-section mb-4">Create Stream</h1>
                    <p className="text-text-secondary mb-6">
                        Connect your wallet to create a yield stream for your agent.
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

    // Success state
    if (isDepositSuccess && depositHash) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="card text-center max-w-lg w-full mx-4">
                    <div className="w-20 h-20 bg-success/20 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                        <span className="text-5xl">✓</span>
                    </div>
                    <h1 className="heading-section text-success mb-4">Stream Created!</h1>
                    <p className="text-text-secondary mb-6">
                        Your agent now has a perpetual yield stream. The seed has been planted.
                    </p>

                    <div className="card-nested text-left space-y-3 mb-6">
                        <div className="flex justify-between">
                            <span className="label">Principal</span>
                            <span className="data-value">${amountNum.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="label">Monthly Yield</span>
                            <span className="data-highlight">~${monthlyYield.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="label">Status</span>
                            <span className={isSustainable ? 'status-healthy' : 'status-warning'}>
                                {isSustainable ? '∞ IMMORTAL' : `~${monthsRemaining} months`}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <a
                            href={`https://sepolia.basescan.org/tx/${depositHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary flex-1"
                        >
                            View on BaseScan
                        </a>
                        <Link href="/dashboard" className="btn-action flex-1">
                            Go to Dashboard →
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen pt-24 pb-12">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-4 mb-12">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${step >= s
                                        ? 'bg-primary text-white'
                                        : 'bg-background-nested text-text-muted border border-border'
                                    }`}
                            >
                                {step > s ? '✓' : s}
                            </div>
                            {s < 3 && (
                                <div className={`w-12 h-0.5 ${step > s ? 'bg-primary' : 'bg-border'}`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Wallet Balance */}
                <div className="card-nested mb-4 flex items-center justify-between">
                    <span className="label">Wallet Balance</span>
                    <span className="data-value">
                        {usdcBalance ? parseFloat(usdcBalance.formatted).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0.00'} USDC
                    </span>
                </div>

                {/* Step 1: Beneficiary */}
                {step === 1 && (
                    <div className="card">
                        <h1 className="heading-section mb-2">Who receives the yield?</h1>
                        <p className="text-text-secondary mb-8">
                            Enter the wallet address of your agent. This address will receive all yield payments.
                        </p>

                        <div className="mb-6">
                            <label className="label block mb-2">Agent Wallet Address</label>
                            <input
                                type="text"
                                value={beneficiary}
                                onChange={(e) => setBeneficiary(e.target.value)}
                                placeholder="0x..."
                                className="input-field font-mono"
                            />
                            {beneficiary && !isValidBeneficiary && (
                                <p className="text-error text-sm mt-2">
                                    Please enter a valid Ethereum address
                                </p>
                            )}
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            disabled={!canProceedStep1}
                            className="btn-action"
                        >
                            Continue →
                        </button>
                    </div>
                )}

                {/* Step 2: Amount & Simulation */}
                {step === 2 && (
                    <div className="card">
                        <button onClick={() => setStep(1)} className="btn-ghost mb-4">
                            ← Back
                        </button>

                        <h1 className="heading-section mb-2">How much to deposit?</h1>
                        <p className="text-text-secondary mb-8">
                            This is "the seed" — your principal is preserved while the yield flows to your agent.
                        </p>

                        {/* Amount Input */}
                        <div className="card-nested mb-6">
                            <label className="label block mb-2">Deposit Amount</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="10000"
                                    className="input-amount flex-1"
                                />
                                <span className="text-text-secondary font-mono text-lg">USDC</span>
                                <button
                                    onClick={() => usdcBalance && setAmount(usdcBalance.formatted)}
                                    className="btn-max"
                                >
                                    Max
                                </button>
                            </div>
                            {amount && !isValidAmount && (
                                <p className="text-error text-sm mt-2">
                                    {amountNum > parseFloat(usdcBalance?.formatted || '0')
                                        ? 'Insufficient balance'
                                        : 'Please enter a valid amount'}
                                </p>
                            )}
                        </div>

                        {/* Quick Amounts */}
                        <div className="flex gap-2 mb-6">
                            {['1000', '5000', '10000', '25000'].map((preset) => (
                                <button
                                    key={preset}
                                    onClick={() => setAmount(preset)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${amount === preset
                                            ? 'bg-primary text-white'
                                            : 'bg-background-nested text-text-secondary hover:bg-primary/20'
                                        }`}
                                >
                                    ${parseInt(preset).toLocaleString()}
                                </button>
                            ))}
                        </div>

                        {/* Burn Rate */}
                        <div className="card-nested mb-6">
                            <label className="label block mb-2">Agent Monthly Burn Rate (Optional)</label>
                            <div className="flex items-center gap-4">
                                <span className="text-text-secondary">$</span>
                                <input
                                    type="number"
                                    value={burnRate}
                                    onChange={(e) => setBurnRate(e.target.value)}
                                    placeholder="50"
                                    className="input-field flex-1"
                                />
                                <span className="text-text-secondary">/month</span>
                            </div>
                        </div>

                        {/* Yield Projection */}
                        {amountNum > 0 && (
                            <div className="card-nested mb-8">
                                <h3 className="font-semibold mb-4">Yield Projection</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary">Estimated APY</span>
                                        <span className="text-text-primary">~{(ESTIMATED_APY * 100).toFixed(0)}%</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary">Monthly Yield</span>
                                        <span className="data-highlight">~${monthlyYield.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary">Agent Burn Rate</span>
                                        <span className="text-text-primary">${burnRateNum.toFixed(2)}/mo</span>
                                    </div>
                                    <div className="border-t border-border pt-3 flex justify-between">
                                        <span className="font-medium">Status</span>
                                        <span className={isSustainable ? 'status-healthy' : 'status-warning'}>
                                            <span className={`w-2 h-2 rounded-full ${isSustainable ? 'bg-success' : 'bg-warning'}`} />
                                            {isSustainable
                                                ? 'IMMORTAL'
                                                : monthsRemaining > 0
                                                    ? `~${monthsRemaining} months runway`
                                                    : 'Needs more capital'
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setStep(3)}
                            disabled={!canProceedStep2}
                            className="btn-action"
                        >
                            Continue to Deposit →
                        </button>
                    </div>
                )}

                {/* Step 3: Confirm & Execute */}
                {step === 3 && (
                    <div className="card">
                        <button onClick={() => setStep(2)} className="btn-ghost mb-4">
                            ← Back
                        </button>

                        <h1 className="heading-section mb-2">Confirm & Deposit</h1>
                        <p className="text-text-secondary mb-8">
                            Review your stream details and complete the transaction.
                        </p>

                        {/* Summary */}
                        <div className="card-nested mb-6">
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="label">Beneficiary</span>
                                    <span className="font-mono text-sm text-text-secondary">
                                        {beneficiary.slice(0, 8)}...{beneficiary.slice(-6)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="label">Principal</span>
                                    <span className="data-value">${amountNum.toLocaleString()} USDC</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="label">Monthly Yield</span>
                                    <span className="data-highlight">~${monthlyYield.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="label">Status</span>
                                    <span className={isSustainable ? 'status-healthy' : 'status-warning'}>
                                        {isSustainable ? '∞ IMMORTAL' : `~${monthsRemaining} months`}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Allowance status */}
                        {!needsApproval && (
                            <div className="card-nested mb-4 flex items-center gap-2 text-success text-sm">
                                <span className="w-2 h-2 bg-success rounded-full" />
                                USDC allowance already set
                            </div>
                        )}

                        {/* Approval Button (if needed) */}
                        {needsApproval && (
                            <button
                                onClick={handleApprove}
                                disabled={isApprovePending || isApproveConfirming}
                                className="btn-secondary w-full mb-4"
                            >
                                {isApprovePending ? 'Confirm in Wallet...' :
                                    isApproveConfirming ? 'Approving USDC...' :
                                        isApproveSuccess ? '✓ USDC Approved' :
                                            'Step 1: Approve USDC'}
                            </button>
                        )}

                        {approveError && (
                            <p className="text-error text-sm mb-4">
                                Approval failed: {approveError.message}
                            </p>
                        )}

                        {/* Deposit Button */}
                        <button
                            onClick={handleDeposit}
                            disabled={needsApproval || isDepositPending || isDepositConfirming}
                            className="btn-action"
                        >
                            {isDepositPending ? 'Confirm in Wallet...' :
                                isDepositConfirming ? 'Creating Stream...' :
                                    needsApproval ? 'Approve USDC First' :
                                        `Deposit ${amountNum.toLocaleString()} USDC`}
                        </button>

                        {depositError && (
                            <p className="text-error text-sm mt-4">
                                Deposit failed: {depositError.message}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
