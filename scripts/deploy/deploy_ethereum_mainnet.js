const hre = require("hardhat");

/**
 * jUSDi MAINNET Deployment Script for Ethereum
 * 
 * CRITICAL: This deploys to ETHEREUM MAINNET. Review all addresses carefully.
 */
async function main() {
    console.log("🚀 jUSDi MAINNET Deployment on Ethereum");
    console.log("⚠️  THIS IS PRODUCTION - VERIFY ALL ADDRESSES");
    console.log("=========================================\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

    if (balance < hre.ethers.parseEther("0.05")) {
        throw new Error("Insufficient ETH for deployment. Need at least 0.05 ETH.");
    }

    // ========== ETHEREUM MAINNET CONFIGURATION ==========
    // Ethereum Mainnet Addresses - VERIFY THESE
    const USDC = hre.ethers.getAddress("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"); // Circle USDC
    const AAVE_V3_POOL = hre.ethers.getAddress("0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"); // Aave V3 Pool

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
    await new Promise(r => setTimeout(r, 15000)); // Longer wait for Ethereum

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
    await new Promise(r => setTimeout(r, 15000));

    // ========== STEP 3: Deploy LendingRouter ==========
    console.log("\nStep 3: Deploying LendingRouter...");
    const LendingRouter = await hre.ethers.getContractFactory("contracts/vaults/jUSDi/LendingRouter.sol:LendingRouter");
    const router = await LendingRouter.deploy(
        deployer.address,
        AAVE_V3_POOL,
        AAVE_V3_POOL
    );
    await router.waitForDeployment();
    const routerAddr = await router.getAddress();
    console.log("✅ LendingRouter:", routerAddr);
    await new Promise(r => setTimeout(r, 15000));

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
    await new Promise(r => setTimeout(r, 15000));

    // ========== STEP 5: Configure Ownership ==========
    console.log("\nStep 5: Configuring ownership...");
    await router.transferOwnership(adapterAddr);
    console.log("✅ Router ownership transferred to adapter");
    await new Promise(r => setTimeout(r, 15000));

    // ========== STEP 6: Set Strategy ==========
    console.log("\nStep 6: Setting vault strategy...");
    await vault.setStrategy(adapterAddr);
    console.log("✅ Strategy set on vault");

    // ========== DEPLOYMENT SUMMARY ==========
    console.log("\n=========================================");
    console.log("🎉 jUSDi ETHEREUM MAINNET Deployment Complete!");
    console.log("=========================================");
    console.log("\nContract Addresses:");
    console.log("  jUSDi Token:          ", jusdiAddr);
    console.log("  JUSDiVault:           ", vaultAddr);
    console.log("  LendingRouter:        ", routerAddr);
    console.log("  LendingRouterAdapter: ", adapterAddr);

    // Save deployment addresses
    const fs = require("fs");
    const deployment = {
        network: "ethereum-mainnet",
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
    fs.writeFileSync("deployment-ethereum-mainnet.json", JSON.stringify(deployment, null, 2));
    console.log("\n📁 Deployment saved to deployment-ethereum-mainnet.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
