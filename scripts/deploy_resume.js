const hre = require("hardhat");

/**
 * jUSDi Deployment RESUME Script
 * Continues from already deployed LendingRouter
 */
async function main() {
    console.log("🚀 jUSDi Deployment RESUME");
    console.log("=========================================\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    console.log("Balance:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

    // ========== CONFIGURATION ==========
    const USDC = hre.ethers.getAddress("0x036cbd53842c5426634e7929541ec2318f3dcf7e");
    const EXISTING_VAULT = hre.ethers.getAddress("0xc698e233fbb9810ae0f22e154ee0912fa188c69c");

    // Already deployed LendingRouter
    const lendingRouterAddr = "0x79695d252C9abC36949F675615f3dcc602B97CE5";
    console.log("Using existing LendingRouter:", lendingRouterAddr);

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

    // Wait for confirmation
    console.log("   Waiting for confirmation...");
    await new Promise(r => setTimeout(r, 10000));

    // ========== STEP 3: Transfer LendingRouter ownership to adapter ==========
    console.log("\nStep 3: Transferring LendingRouter ownership to adapter...");
    const lendingRouter = await hre.ethers.getContractAt("contracts/vaults/jUSDi/LendingRouter.sol:LendingRouter", lendingRouterAddr);
    await lendingRouter.transferOwnership(adapterAddr);
    console.log("✅ Ownership transferred");

    await new Promise(r => setTimeout(r, 5000));

    // ========== STEP 4: Connect to existing vault ==========
    console.log("\nStep 4: Connecting adapter to existing vault...");
    const vault = await hre.ethers.getContractAt("contracts/JUSDiVault.sol:JUSDiVault", EXISTING_VAULT);

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
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
