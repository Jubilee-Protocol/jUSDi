const hre = require("hardhat");

/**
 * jUSDi MAINNET Deployment Script for Base
 * 
 * CRITICAL: This deploys to MAINNET. Review all addresses carefully.
 * 
 * Pre-requisites:
 * 1. Set PRIVATE_KEY in .env (production wallet)
 * 2. Set BASE_URL in .env (mainnet RPC)
 * 3. Ensure sufficient ETH for gas
 * 4. Complete security audit
 */
async function main() {
    console.log("🚀 jUSDi MAINNET Deployment on Base");
    console.log("⚠️  THIS IS PRODUCTION - VERIFY ALL ADDRESSES");
    console.log("=========================================\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

    if (balance < hre.ethers.parseEther("0.01")) {
        throw new Error("Insufficient ETH for deployment. Need at least 0.01 ETH.");
    }

    // ========== MAINNET CONFIGURATION ==========
    // Base Mainnet Addresses - VERIFY THESE
    const USDC = hre.ethers.getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"); // Circle USDC on Base
    const AAVE_V3_POOL = hre.ethers.getAddress("0xA238Dd80C259a72e81d7e4664a9801593F98d1c5"); // Aave V3 Pool on Base

    console.log("Configuration:");
    console.log("  USDC:", USDC);
    console.log("  Aave V3 Pool:", AAVE_V3_POOL);
    console.log("");

    // ========== STEP 1: Deploy jUSDi Token ==========
    console.log("Step 1: Deploying jUSDi Token...");
    const JUSDi = await hre.ethers.getContractFactory("JUSDi");
    const jusdi = await JUSDi.deploy(deployer.address);
    await jusdi.waitForDeployment();
    const jusdiAddr = await jusdi.getAddress();
    console.log("✅ jUSDi Token:", jusdiAddr);
    await new Promise(r => setTimeout(r, 5000));

    // ========== STEP 2: Deploy JUSDiVault ==========
    console.log("\nStep 2: Deploying JUSDiVault (ERC4626)...");
    const JUSDiVault = await hre.ethers.getContractFactory("contracts/JUSDiVault.sol:JUSDiVault");
    const vault = await JUSDiVault.deploy(
        USDC,
        "Jubilee USD Index Vault",
        "jUSDi",
        deployer.address
    );
    await vault.waitForDeployment();
    const vaultAddr = await vault.getAddress();
    console.log("✅ JUSDiVault:", vaultAddr);
    await new Promise(r => setTimeout(r, 5000));

    // ========== STEP 3: Deploy LendingRouter ==========
    console.log("\nStep 3: Deploying LendingRouter...");
    const LendingRouter = await hre.ethers.getContractFactory("contracts/vaults/jUSDi/LendingRouter.sol:LendingRouter");
    const router = await LendingRouter.deploy(
        deployer.address,
        AAVE_V3_POOL,
        AAVE_V3_POOL // Using Aave for both initially
    );
    await router.waitForDeployment();
    const routerAddr = await router.getAddress();
    console.log("✅ LendingRouter:", routerAddr);
    await new Promise(r => setTimeout(r, 5000));

    // ========== STEP 4: Deploy LendingRouterAdapter ==========
    console.log("\nStep 4: Deploying LendingRouterAdapter...");
    const Adapter = await hre.ethers.getContractFactory("LendingRouterAdapter");
    const adapter = await Adapter.deploy(
        USDC,
        routerAddr,
        vaultAddr
    );
    await adapter.waitForDeployment();
    const adapterAddr = await adapter.getAddress();
    console.log("✅ LendingRouterAdapter:", adapterAddr);
    await new Promise(r => setTimeout(r, 5000));

    // ========== STEP 5: Configure Ownership ==========
    console.log("\nStep 5: Configuring ownership...");
    await router.transferOwnership(adapterAddr);
    console.log("✅ Router ownership transferred to adapter");
    await new Promise(r => setTimeout(r, 5000));

    // ========== STEP 6: Set Strategy ==========
    console.log("\nStep 6: Setting vault strategy...");
    await vault.setStrategy(adapterAddr);
    console.log("✅ Strategy set on vault");

    // ========== DEPLOYMENT SUMMARY ==========
    console.log("\n=========================================");
    console.log("🎉 jUSDi MAINNET Deployment Complete!");
    console.log("=========================================");
    console.log("\nContract Addresses:");
    console.log("  jUSDi Token:          ", jusdiAddr);
    console.log("  JUSDiVault:           ", vaultAddr);
    console.log("  LendingRouter:        ", routerAddr);
    console.log("  LendingRouterAdapter: ", adapterAddr);
    console.log("\nConfiguration:");
    console.log("  Base Asset (USDC):    ", USDC);
    console.log("  Aave V3 Pool:         ", AAVE_V3_POOL);
    console.log("\nNext Steps:");
    console.log("  1. Verify contracts on Basescan");
    console.log("  2. Transfer ownership to multisig");
    console.log("  3. Add to frontend configuration");
    console.log("  4. Announce deployment");

    // Save deployment addresses
    const fs = require("fs");
    const deployment = {
        network: "base-mainnet",
        timestamp: new Date().toISOString(),
        contracts: {
            jusdiToken: jusdiAddr,
            vault: vaultAddr,
            lendingRouter: routerAddr,
            adapter: adapterAddr
        },
        config: {
            usdc: USDC,
            aavePool: AAVE_V3_POOL
        }
    };
    fs.writeFileSync("deployment-mainnet.json", JSON.stringify(deployment, null, 2));
    console.log("\n📁 Deployment saved to deployment-mainnet.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
