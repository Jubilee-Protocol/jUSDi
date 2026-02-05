import { baseSepolia, base } from 'viem/chains'

// Contract addresses by network
export const CONTRACTS = {
    [baseSepolia.id]: {
        yieldStream: '0x376dD533c197Fe3C18d4f311F94abbff2d83cfd3',
        vault: '0xc698e233fbB9810Ae0F22e154Ee0912Fa188C69c',
        usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Circle's USDC on Base Sepolia
    },
    [base.id]: {
        yieldStream: '', // Mainnet TBD
        vault: '',
        usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
    },
} as const

// JubileeYieldStream ABI (key functions only)
export const YIELD_STREAM_ABI = [
    // View Functions
    {
        name: 'getStreamInfo',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: '_funder', type: 'address' }],
        outputs: [
            { name: 'beneficiary', type: 'address' },
            { name: 'principal', type: 'uint256' },
            { name: 'currentValue', type: 'uint256' },
            { name: 'pendingYield', type: 'uint256' },
            { name: 'totalClaimed', type: 'uint256' },
            { name: 'shares', type: 'uint256' },
            { name: 'created', type: 'uint256' },
            { name: 'lastClaim', type: 'uint256' },
        ],
    },
    {
        name: 'claimableYield',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: '_funder', type: 'address' }],
        outputs: [{ name: 'yieldAmount', type: 'uint256' }],
    },
    {
        name: 'estimateMonthlyYield',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: '_funder', type: 'address' }],
        outputs: [{ name: 'monthlyYield', type: 'uint256' }],
    },
    {
        name: 'checkSustainability',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: '_funder', type: 'address' },
            { name: '_monthlyBurnRate', type: 'uint256' },
        ],
        outputs: [
            { name: 'sustainable', type: 'bool' },
            { name: 'monthsRemaining', type: 'uint256' },
        ],
    },
    // Write Functions
    {
        name: 'deposit',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: '_beneficiary', type: 'address' },
            { name: '_amount', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        name: 'claim',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [],
        outputs: [],
    },
    {
        name: 'claimFor',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: '_funder', type: 'address' }],
        outputs: [],
    },
    {
        name: 'withdrawPrincipal',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: '_amount', type: 'uint256' }],
        outputs: [],
    },
    {
        name: 'setBeneficiary',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [{ name: '_newBeneficiary', type: 'address' }],
        outputs: [],
    },
    // Events
    {
        name: 'StreamCreated',
        type: 'event',
        inputs: [
            { name: 'funder', type: 'address', indexed: true },
            { name: 'beneficiary', type: 'address', indexed: true },
            { name: 'principal', type: 'uint256', indexed: false },
            { name: 'sharesReceived', type: 'uint256', indexed: false },
        ],
    },
    {
        name: 'YieldClaimed',
        type: 'event',
        inputs: [
            { name: 'funder', type: 'address', indexed: true },
            { name: 'beneficiary', type: 'address', indexed: true },
            { name: 'yieldAmount', type: 'uint256', indexed: false },
            { name: 'sharesBurned', type: 'uint256', indexed: false },
        ],
    },
] as const

// ERC20 ABI for USDC approval
export const ERC20_ABI = [
    {
        name: 'approve',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ name: '', type: 'bool' }],
    },
    {
        name: 'allowance',
        type: 'function',
        stateMutability: 'view',
        inputs: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
        ],
        outputs: [{ name: '', type: 'uint256' }],
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }],
    },
] as const

// Convenience exports for Base Sepolia (default network)
export const JUBILEE_YIELD_STREAM_ADDRESS = CONTRACTS[baseSepolia.id].yieldStream as `0x${string}`
export const USDC_ADDRESS = CONTRACTS[baseSepolia.id].usdc as `0x${string}`
export const VAULT_ADDRESS = CONTRACTS[baseSepolia.id].vault as `0x${string}`

// Export ABIs with standardized names
export const JUBILEE_YIELD_STREAM_ABI = YIELD_STREAM_ABI

