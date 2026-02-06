/**
 * jUSDi Keeper - Collect Fees
 * 
 * Collects accumulated management and performance fees from the vault.
 * Used by GitHub Actions keeper workflow (weekly cron).
 * 
 * SECURITY: Requires KEEPER_PRIVATE_KEY in GitHub Secrets
 * 
 * Fees:
 * - Management: 1% annual on AUM
 * - Performance: 10% of yield
 */

const { ethers } = require('ethers');

const VAULT_ABI = [
    'function collectFees() external',
    'function treasury() view returns (address)',
    'function managementFeeBps() view returns (uint256)',
    'function performanceFeeBps() view returns (uint256)',
    'function lastFeeCollection() view returns (uint256)',
    'function totalAssets() view returns (uint256)',
    'function owner() view returns (address)'
];

async function main() {
    console.log('🏦 jUSDi Fee Collection Keeper');
    console.log('================================\n');

    const rpcUrl = process.env.RPC_URL || 'https://mainnet.base.org';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const privateKey = process.env.KEEPER_PRIVATE_KEY;
    const vaultAddress = process.env.VAULT_ADDRESS;

    if (!privateKey) {
        console.error('❌ Missing KEEPER_PRIVATE_KEY');
        process.exit(1);
    }
    if (!vaultAddress) {
        console.error('❌ Missing VAULT_ADDRESS');
        process.exit(1);
    }

    const wallet = new ethers.Wallet(privateKey, provider);
    const vault = new ethers.Contract(vaultAddress, VAULT_ABI, wallet);

    console.log(`Keeper:  ${wallet.address}`);
    console.log(`Vault:   ${vaultAddress}`);
    console.log(`Network: ${(await provider.getNetwork()).name}\n`);

    try {
        // Check vault state
        const treasury = await vault.treasury();
        const totalAssets = await vault.totalAssets();
        const lastCollection = await vault.lastFeeCollection();
        const mgmtFee = await vault.managementFeeBps();
        const perfFee = await vault.performanceFeeBps();

        console.log('📊 Vault State:');
        console.log(`   Treasury:    ${treasury}`);
        console.log(`   Total AUM:   ${ethers.formatUnits(totalAssets, 6)} USDC`);
        console.log(`   Mgmt Fee:    ${Number(mgmtFee) / 100}%`);
        console.log(`   Perf Fee:    ${Number(perfFee) / 100}%`);

        const now = Math.floor(Date.now() / 1000);
        const daysSinceLast = (now - Number(lastCollection)) / 86400;
        console.log(`   Days since:  ${daysSinceLast.toFixed(1)} days\n`);

        // Only collect if treasury is set
        if (treasury === ethers.ZeroAddress) {
            console.log('⚠️  Treasury not set. Skipping fee collection.');
            console.log('   Call vault.setTreasury(address) to enable fees.');
            process.exit(0);
        }

        // Estimate gas
        const gasEstimate = await vault.collectFees.estimateGas();
        console.log(`⛽ Gas estimate: ${gasEstimate.toString()}`);

        // Execute fee collection
        console.log('\n💰 Collecting fees...');
        const tx = await vault.collectFees({
            gasLimit: gasEstimate * 120n / 100n // 20% buffer
        });
        console.log(`   Tx hash: ${tx.hash}`);

        const receipt = await tx.wait();
        console.log(`   Block:   ${receipt.blockNumber}`);
        console.log(`   Gas:     ${receipt.gasUsed.toString()}`);

        // Parse FeesCollected event
        const iface = new ethers.Interface([
            'event FeesCollected(uint256 managementFee, uint256 performanceFee, address treasury)'
        ]);
        for (const log of receipt.logs) {
            try {
                const parsed = iface.parseLog(log);
                if (parsed) {
                    console.log('\n✅ Fees Collected:');
                    console.log(`   Management: ${ethers.formatUnits(parsed.args.managementFee, 6)} USDC`);
                    console.log(`   Performance: ${ethers.formatUnits(parsed.args.performanceFee, 6)} USDC`);
                    console.log(`   Recipient:  ${parsed.args.treasury}`);
                }
            } catch (e) { }
        }

        console.log('\n🎉 Fee collection complete!');

    } catch (error) {
        console.error('\n❌ Fee collection failed:', error.message);
        if (error.reason) console.error('   Reason:', error.reason);
        process.exit(1);
    }
}

main();
