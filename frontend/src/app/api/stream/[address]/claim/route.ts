import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { baseSepolia } from 'viem/chains'
import {
    JUBILEE_YIELD_STREAM_ADDRESS,
    JUBILEE_YIELD_STREAM_ABI
} from '@/lib/constants'

// Public client for reading
const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
})

/**
 * POST /api/stream/[address]/claim
 * 
 * Agent Claim API - Returns the data needed for an agent to claim their yield.
 * The agent must sign the transaction themselves using their own wallet.
 * 
 * This endpoint provides:
 * - Verification that yield is available
 * - The transaction data for the claim call
 * - Gas estimation
 * 
 * Request body (optional):
 * {
 *   "funder": "0x..." // If provided, claims for this specific funder
 * }
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ address: string }> }
) {
    try {
        const { address: beneficiaryAddress } = await params

        // Validate address
        if (!beneficiaryAddress || !/^0x[a-fA-F0-9]{40}$/.test(beneficiaryAddress)) {
            return NextResponse.json(
                { error: 'Invalid beneficiary address' },
                { status: 400 }
            )
        }

        // Parse request body
        let funderAddress = beneficiaryAddress
        try {
            const body = await request.json()
            if (body.funder && /^0x[a-fA-F0-9]{40}$/.test(body.funder)) {
                funderAddress = body.funder
            }
        } catch {
            // No body or invalid JSON, use beneficiary as funder
        }

        // Get stream info
        const streamInfo = await publicClient.readContract({
            address: JUBILEE_YIELD_STREAM_ADDRESS as `0x${string}`,
            abi: JUBILEE_YIELD_STREAM_ABI,
            functionName: 'getStreamInfo',
            args: [funderAddress as `0x${string}`],
        }) as [string, bigint, bigint, bigint, bigint, bigint, bigint, bigint]

        const [beneficiary, principal, currentValue, pendingYield] = streamInfo

        // Verify this beneficiary matches
        if (beneficiary.toLowerCase() !== beneficiaryAddress.toLowerCase()) {
            return NextResponse.json(
                {
                    error: 'Address mismatch',
                    message: 'The provided address is not the beneficiary for this stream',
                    expected_beneficiary: beneficiary
                },
                { status: 403 }
            )
        }

        // Check if yield is available
        if (pendingYield === BigInt(0)) {
            return NextResponse.json({
                success: false,
                message: 'No yield available to claim',
                pending_yield: '0',
                transaction: null
            })
        }

        // Format yield
        const yieldFormatted = (Number(pendingYield) / 1e6).toFixed(6)

        // Prepare transaction data for claimFor
        // Using claimFor allows anyone (including the agent) to trigger the claim
        const txData = {
            to: JUBILEE_YIELD_STREAM_ADDRESS,
            data: `0x${Buffer.from(
                // claimFor(address) selector + encoded address
                publicClient.chain?.id ? 'claimFor' : 'claimFor'
            ).toString('hex')}`,
            chainId: baseSepolia.id,
            // Provide the function signature for agents to construct the tx
            functionName: 'claimFor',
            args: [funderAddress],
            abi: [
                {
                    inputs: [{ name: "funder", type: "address" }],
                    name: "claimFor",
                    outputs: [],
                    stateMutability: "nonpayable",
                    type: "function"
                }
            ]
        }

        return NextResponse.json({
            success: true,
            message: 'Yield available for claim',
            pending_yield: yieldFormatted,
            pending_yield_raw: pendingYield.toString(),
            funder: funderAddress,
            beneficiary: beneficiaryAddress,
            transaction: {
                to: JUBILEE_YIELD_STREAM_ADDRESS,
                chainId: baseSepolia.id,
                chainName: 'Base Sepolia',
                functionName: 'claimFor',
                functionSignature: 'claimFor(address)',
                args: [funderAddress],
                // Human-readable instructions
                instructions: [
                    'Call claimFor(funderAddress) on the JubileeYieldStream contract',
                    'The yield will be sent to the beneficiary address',
                    'This can be called by anyone (permissionless)',
                    'Gas estimate: ~80,000 gas'
                ]
            }
        })

    } catch (error) {
        console.error('Claim API error:', error)
        return NextResponse.json(
            {
                error: 'Failed to process claim request',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}
