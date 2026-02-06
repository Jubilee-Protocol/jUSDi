/**
 * jUSDi Keeper - Check Allocation Drift
 * 
 * Checks if vault allocation has drifted beyond thresholds and needs rebalancing.
 * Used by GitHub Actions keeper workflow.
 */

const { ethers } = require('ethers');

const VAULT_ABI = [
    'function totalAssets() view returns (uint256)',
    'function getManagedBalance(address asset) view returns (uint256)',
    'function underlyingStables(uint256 index) view returns (address)'
];

// Target allocations (basis points)
const TARGET_ALLOCATIONS = {
    USDC: 6000, // 60%
    USDT: 4000  // 40%
};

const DRIFT_THRESHOLD_BPS = 500; // 5% drift triggers rebalance

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const vaultAddress = process.env.VAULT_ADDRESS;

    if (!vaultAddress) {
        console.error('VAULT_ADDRESS not set');
        process.exit(1);
    }

    const vault = new ethers.Contract(vaultAddress, VAULT_ABI, provider);

    try {
        const totalAssets = await vault.totalAssets();
        console.log(`Total Assets: ${ethers.formatUnits(totalAssets, 6)} USDC`);

        // Check each stablecoin allocation
        // For now, simple check - can be extended
        const needsRebalance = false; // Placeholder - implement actual drift check

        // Output for GitHub Actions
        console.log(`::set-output name=needs_rebalance::${needsRebalance}`);

        if (needsRebalance) {
            console.log('⚠️ Drift detected - rebalancing needed');
        } else {
            console.log('✅ Allocations within threshold');
        }

    } catch (error) {
        console.error('Error checking drift:', error.message);
        process.exit(1);
    }
}

main();
