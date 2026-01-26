const hre = require("hardhat");

/**
 * jUSDi Testnet Deployment Script for Ethereum Sepolia
 */
async function main() {
    console.log("🚀 jUSDi Deployment on Ethereum Sepolia");
    console.log("=========================================\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

    if (balance < hre.ethers.parseEther("0.01")) {
        throw new Error("Insufficient ETH. Need at least 0.01 Sepolia ETH.");
    }

    // ========== SEPOLIA TESTNET CONFIGURATION ==========
    // Sepolia Testnet Addresses
    // Note: Using mock USDC for testing (deploy your own or use existing testnet token)
    const MOCK_USDC = hre.ethers.getAddress("0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"); // Circle USDC on Sepolia
    const AAVE_V3_POOL = hre.ethers.getAddress("0x6ae43d3271ff6888e7fc43fd7321a503ff738951"); // Aave V3 Pool on Sepolia

    console.log("Configuration:");
    console.log("  USDC (Sepolia):", MOCK_USDC);
    console.log("  Aave V3 Pool:", AAVE_V3_POOL);
    console.log("");

    // ========== STEP 1: Deploy JUSDiVault ==========
    console.log("Step 1: Deploying JUSDiVault (ERC4626)...");
    const JUSDiVault = await hre.ethers.getContractFactory("contracts/JUSDiVault.sol:JUSDiVault");
    const vault = await JUSDiVault.deploy(
        MOCK_USDC,
        "Jubilee USD Index Vault",
        "jUSDi",
        deployer.address
    );
    await vault.waitForDeployment();
    const vaultAddr = await vault.getAddress();
    console.log("✅ JUSDiVault:", vaultAddr);
    await new Promise(r => setTimeout(r, 10000));

    // ========== STEP 2: Deploy LendingRouter ==========
    console.log("\nStep 2: Deploying LendingRouter...");
    const LendingRouter = await hre.ethers.getContractFactory("contracts/vaults/jUSDi/LendingRouter.sol:LendingRouter");
    const router = await LendingRouter.deploy(
        deployer.address,
        AAVE_V3_POOL,
        AAVE_V3_POOL
    );
    await router.waitForDeployment();
    const routerAddr = await router.getAddress();
    console.log("✅ LendingRouter:", routerAddr);
    await new Promise(r => setTimeout(r, 10000));

    // ========== STEP 3: Deploy LendingRouterAdapter ==========
    console.log("\nStep 3: Deploying LendingRouterAdapter...");
    const Adapter = await hre.ethers.getContractFactory("LendingRouterAdapter");
    const adapter = await Adapter.deploy(
        MOCK_USDC,
        routerAddr,
        vaultAddr
    );
    await adapter.waitForDeployment();
    const adapterAddr = await adapter.getAddress();
    console.log("✅ LendingRouterAdapter:", adapterAddr);
    await new Promise(r => setTimeout(r, 10000));

    // ========== STEP 4: Configure Ownership ==========
    console.log("\nStep 4: Configuring ownership...");
    await router.transferOwnership(adapterAddr);
    console.log("✅ Router ownership transferred to adapter");
    await new Promise(r => setTimeout(r, 10000));

    // ========== STEP 5: Set Strategy ==========
    console.log("\nStep 5: Setting vault strategy...");
    await vault.setStrategy(adapterAddr);
    console.log("✅ Strategy set on vault");

    // ========== DEPLOYMENT SUMMARY ==========
    console.log("\n=========================================");
    console.log("🎉 jUSDi Ethereum Sepolia Deployment Complete!");
    console.log("=========================================");
    console.log("\nContract Addresses:");
    console.log("  JUSDiVault:           ", vaultAddr);
    console.log("  LendingRouter:        ", routerAddr);
    console.log("  LendingRouterAdapter: ", adapterAddr);
    console.log("\nConfiguration:");
    console.log("  Base Asset (USDC):    ", MOCK_USDC);
    console.log("  Aave V3 Pool:         ", AAVE_V3_POOL);

    // Save deployment addresses
    const fs = require("fs");
    const deployment = {
        network: "ethereum-sepolia",
        timestamp: new Date().toISOString(),
        contracts: {
            vault: vaultAddr,
            lendingRouter: routerAddr,
            adapter: adapterAddr
        },
        config: {
            usdc: MOCK_USDC,
            aavePool: AAVE_V3_POOL
        }
    };
    fs.writeFileSync("deployment-sepolia.json", JSON.stringify(deployment, null, 2));
    console.log("\n📁 Deployment saved to deployment-sepolia.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
