const hre = require("hardhat");

/**
 * jUSDi Full Deployment Script for Base Sepolia
 * Deploys: LendingRouter, LendingRouterAdapter, connects to existing vault
 */
async function main() {
    console.log("🚀 jUSDi Full Deployment on Base Sepolia");
    console.log("=========================================\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

    // ========== CONFIGURATION ==========
    // Base Sepolia Addresses (lowercase to fix checksum issues)
    const USDC = hre.ethers.getAddress("0x036cbd53842c5426634e7929541ec2318f3dcf7e");

    // Existing deployed vault from JubileeLabsBot
    const EXISTING_VAULT = hre.ethers.getAddress("0xc698e233fbb9810ae0f22e154ee0912fa188c69c");

    // Aave V3 on Base Sepolia
    const AAVE_POOL = hre.ethers.getAddress("0x4e033932203f3582e39130543393526e3d20d235");

    // Morpho placeholder (use Aave as fallback for now)
    const MORPHO_PLACEHOLDER = hre.ethers.getAddress("0x4e033932203f3582e39130543393526e3d20d235");

    // ========== STEP 1: Deploy LendingRouter ==========
    console.log("Step 1: Deploying LendingRouter...");
    const LendingRouter = await hre.ethers.getContractFactory("contracts/vaults/jUSDi/LendingRouter.sol:LendingRouter");
    const lendingRouter = await LendingRouter.deploy(
        deployer.address,
        AAVE_POOL,
        MORPHO_PLACEHOLDER
    );
    await lendingRouter.waitForDeployment();
    const lendingRouterAddr = await lendingRouter.getAddress();
    console.log("✅ LendingRouter:", lendingRouterAddr);

    // Wait for confirmation before next transaction
    console.log("   Waiting for confirmation...");
    await new Promise(r => setTimeout(r, 5000));

    // ========== STEP 2: Deploy LendingRouterAdapter ==========
    console.log("\nStep 2: Deploying LendingRouterAdapter...");
    const LendingRouterAdapter = await hre.ethers.getContractFactory("LendingRouterAdapter");
    const adapter = await LendingRouterAdapter.deploy(
        USDC,
        lendingRouterAddr,
        EXISTING_VAULT
    );
    await adapter.waitForDeployment();
    const adapterAddr = await adapter.getAddress();
    console.log("✅ LendingRouterAdapter:", adapterAddr);

    // Wait for confirmation before next transaction
    console.log("   Waiting for confirmation...");
    await new Promise(r => setTimeout(r, 5000));

    // ========== STEP 3: Transfer LendingRouter ownership to adapter ==========
    console.log("\nStep 3: Transferring LendingRouter ownership to adapter...");
    await lendingRouter.transferOwnership(adapterAddr);
    console.log("✅ Ownership transferred");

    // ========== STEP 4: Connect to existing vault ==========
    console.log("\nStep 4: Connecting adapter to existing vault...");
    const vault = await hre.ethers.getContractAt("contracts/JUSDiVault.sol:JUSDiVault", EXISTING_VAULT);

    // Check if we're the owner
    const vaultOwner = await vault.owner();
    if (vaultOwner.toLowerCase() === deployer.address.toLowerCase()) {
        await vault.setStrategy(adapterAddr);
        console.log("✅ Strategy set on vault");
    } else {
        console.log("⚠️  Cannot set strategy - deployer is not vault owner");
        console.log("   Vault owner:", vaultOwner);
        console.log("   To complete setup, call vault.setStrategy(", adapterAddr, ") from owner account");
    }

    // ========== SUMMARY ==========
    console.log("\n=========================================");
    console.log("🎉 jUSDi EVM Deployment Complete!");
    console.log("=========================================");
    console.log("LendingRouter:       ", lendingRouterAddr);
    console.log("LendingRouterAdapter:", adapterAddr);
    console.log("Existing Vault:      ", EXISTING_VAULT);
    console.log("\nNext steps:");
    console.log("1. Ensure vault.setStrategy() is called with the adapter address");
    console.log("2. Users can now deposit USDC and earn Aave yield automatically");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
