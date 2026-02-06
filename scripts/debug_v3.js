const hre = require("hardhat");

async function main() {
    const vaultAddr = "0x26c39532C0dD06C0c4EddAeE36979626b16c77aC"; // V3
    const usdcAddr = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base USDC
    const userAddr = "0xFdE2746e0d579b693520d5Ab37B87D59CA6DE24c"; // Example user (or just omit)

    const vault = await hre.ethers.getContractAt("JUSDiVault", vaultAddr);
    const usdc = await hre.ethers.getContractAt("IERC20", usdcAddr);

    console.log("--- V3 Debug Info ---");

    // 1. Liquid Balance
    const liquidUSDC = await usdc.balanceOf(vaultAddr);
    console.log("Vault Liquid USDC:", hre.ethers.formatUnits(liquidUSDC, 6));

    // 2. Total Assets
    const totalAssets = await vault.totalAssets();
    console.log("Vault TotalAssets:", hre.ethers.formatUnits(totalAssets, 6));

    // 3. Router Config
    const lendingRouter = await vault.lendingRouter();
    console.log("LendingRouter Addr:", lendingRouter);

    // 4. Managed vs Invested
    const managed = await vault.managedBalanceOf(usdcAddr);
    console.log("Managed Balance:  ", hre.ethers.formatUnits(managed, 6));

    // We can't see private _investedBalances directly, but we can infer:
    // Invested ~ Managed - Liquid (roughly, if no yield yet)
    // Or TotalAssets - Liquid

    // 5. Check if Router has funds (if router exists)
    if (lendingRouter !== hre.ethers.ZeroAddress) {
        const router = await hre.ethers.getContractAt("LendingRouter", lendingRouter);
        // Try getting balance from router
        try {
            const invested = await router.getBalance(lendingRouter, usdcAddr, false);
            console.log("Router Balance:   ", hre.ethers.formatUnits(invested, 6));
        } catch (e) {
            console.log("Router getBalance failed:", e.message);
        }
    }
}

main().catch(console.error);
