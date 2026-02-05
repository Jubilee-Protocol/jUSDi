import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http, formatUnits } from 'viem'
import { baseSepolia } from 'viem/chains'
import { CONTRACTS, YIELD_STREAM_ABI } from '@/lib/constants'

/**
 * Agent API Endpoint
 * 
 * GET /api/stream/[address]
 * 
 * Returns stream status in a format optimized for agent consumption.
 * Agents can poll this endpoint to check their life support status.
 * 
 * Query Parameters:
 * - burn_rate: Monthly burn rate in USDC (optional, for sustainability check)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ address: string }> }
) {
    const { address } = await params
    const { searchParams } = new URL(request.url)
    const burnRate = searchParams.get('burn_rate')

    // Validate address
    if (!address || !address.startsWith('0x') || address.length !== 42) {
        return NextResponse.json(
            {
                error: 'Invalid address format',
                status: 'error',
            },
            { status: 400 }
        )
    }

    try {
        // Create viem client for Base Sepolia
        const client = createPublicClient({
            chain: baseSepolia,
            transport: http(),
        })

        const contractAddress = CONTRACTS[baseSepolia.id].yieldStream as `0x${string}`

        // Fetch stream info
        const streamInfo = await client.readContract({
            address: contractAddress,
            abi: YIELD_STREAM_ABI,
            functionName: 'getStreamInfo',
            args: [address as `0x${string}`],
        }) as [string, bigint, bigint, bigint, bigint, bigint, bigint, bigint]

        const [
            beneficiary,
            principal,
            currentValue,
            pendingYield,
            totalClaimed,
            shares,
            created,
            lastClaim,
        ] = streamInfo

        // Check if stream exists
        if (principal === 0n) {
            return NextResponse.json({
                status: 'not_found',
                message: 'No stream found for this address',
                address,
            }, { status: 404 })
        }

        // Calculate sustainability if burn rate provided
        let sustainability = null
        if (burnRate) {
            const burnRateUsdc = parseFloat(burnRate)
            const principalNum = parseFloat(formatUnits(principal, 6))
            const monthlyYield = (principalNum * 0.08) / 12 // Assume 8% APY

            sustainability = {
                monthly_yield: monthlyYield.toFixed(2),
                monthly_burn: burnRateUsdc.toFixed(2),
                sustainable: monthlyYield >= burnRateUsdc,
                months_remaining: monthlyYield >= burnRateUsdc
                    ? 'infinite'
                    : Math.floor(principalNum / (burnRateUsdc - monthlyYield)),
            }
        }

        // Build response
        const response = {
            status: 'alive',
            address,
            beneficiary,
            principal: formatUnits(principal, 6),
            current_value: formatUnits(currentValue, 6),
            yield_available: formatUnits(pendingYield, 6),
            total_claimed: formatUnits(totalClaimed, 6),
            shares: shares.toString(),
            created_at: Number(created),
            last_claim_at: Number(lastClaim),
            network: 'base-sepolia',
            contract: contractAddress,
            ...(sustainability && { sustainability }),
        }

        return NextResponse.json(response, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
            },
        })
    } catch (error) {
        console.error('Error fetching stream info:', error)
        return NextResponse.json(
            {
                status: 'error',
                error: 'Failed to fetch stream info',
                message: error instanceof Error ? error.message : 'Unknown error',
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
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    })
}
