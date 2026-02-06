const hre = require("hardhat");

async function main() {
    const VAULT = "0x0B03463259d5041004290822444c4183aE936050";
    const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

    console.log("=== jUSDi Deposit Debug ===\n");

    // 1. Check vault state
    const vault = await hre.ethers.getContractAt(
        "contracts/vaults/jUSDi/JUSDiVault.sol:JUSDiVault",
        VAULT
    );

    console.log("1. Vault State:");
    console.log("   Owner:", await vault.owner());
    console.log("   Asset:", await vault.asset());
    console.log("   LendingRouter:", await vault.lendingRouter());

    // 2. Check emergency state
    const emergencyMgr = await vault.emergencyManager();
    console.log("\n2. Emergency Manager:", emergencyMgr);

    const emergency = await hre.ethers.getContractAt(
        "contracts/vaults/jUSDi/EmergencyManager.sol:EmergencyManager",
        emergencyMgr
    );
    console.log("   isPaused:", await emergency.isPaused());

    // 3. Check LendingRouter
    const router = await vault.lendingRouter();
    console.log("\n3. LendingRouter:", router);

    const lendingRouter = await hre.ethers.getContractAt(
        "contracts/vaults/jUSDi/LendingRouter.sol:LendingRouter",
        router
    );
    console.log("   Owner:", await lendingRouter.owner());
    console.log("   AavePool:", await lendingRouter.aavePool());

    // 4. Check if vault has USDC balance
    const usdc = await hre.ethers.getContractAt("IERC20", USDC);
    console.log("\n4. Vault USDC Balance:", hre.ethers.formatUnits(await usdc.balanceOf(VAULT), 6));

    // 5. Check total assets and supply
    console.log("\n5. Vault Metrics:");
    console.log("   Total Assets:", hre.ethers.formatUnits(await vault.totalAssets(), 6));
    console.log("   Total Supply:", hre.ethers.formatUnits(await vault.totalSupply(), 6));

    // 6. Check jUSDi token
    const jusdiToken = await vault.jusdiToken();
    console.log("\n6. jUSDi Token:", jusdiToken);

    const token = await hre.ethers.getContractAt("IERC20", jusdiToken);
    console.log("   Total Supply:", hre.ethers.formatUnits(await token.totalSupply(), 6));

    // 7. Check if vault can mint jUSDi
    console.log("\n7. Checking jUSDi minting permissions...");
    try {
        const isMinter = await hre.ethers.getContractAt(
            "contracts/tokens/JUSDi.sol:JUSDi",
            jusdiToken
        );
        console.log("   Vault is minter:", await isMinter.isMinter(VAULT));
    } catch (e) {
        console.log("   Error checking minter:", e.message.slice(0, 100));
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
