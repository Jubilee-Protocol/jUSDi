/**
 * jUSDi Mainnet Deployment Script
 * 
 * Deploys the full jUSDi stack to Base Mainnet:
 * 1. LendingRouter (Aave V3 integration)
 * 2. LendingRouterAdapter (strategy interface)
 * 3. JUSDiVault (ERC4626 vault)
 * 
 * SECURITY: Requires PRIVATE_KEY in .env
 */

const hre = require("hardhat");

async function main() {
    console.log("🚀 jUSDi Mainnet Deployment");
    console.log("===========================\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

    // ========== BASE MAINNET CONFIGURATION ==========
    const USDC = hre.ethers.getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
    const USDT = hre.ethers.getAddress("0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2");
    const AAVE_POOL = hre.ethers.getAddress("0xA238Dd80C259a72e81d7e4664a9801593F98d1c5");

    // Morpho placeholder (use Aave as fallback)
    const MORPHO_PLACEHOLDER = AAVE_POOL;

    // Treasury for fee collection
    const TREASURY = deployer.address; // Change to your actual treasury

    // ========== STEP 1: Deploy LendingRouter ==========
    console.log("Step 1: Deploying LendingRouter...");
    const LendingRouter = await hre.ethers.getContractFactory(
        "contracts/vaults/jUSDi/LendingRouter.sol:LendingRouter"
    );
    const lendingRouter = await LendingRouter.deploy(
        deployer.address,
        AAVE_POOL,
        MORPHO_PLACEHOLDER
    );
    await lendingRouter.waitForDeployment();
    const lendingRouterAddr = await lendingRouter.getAddress();
    console.log("✅ LendingRouter:", lendingRouterAddr);

    console.log("   Waiting for confirmation...");
    await new Promise(r => setTimeout(r, 10000));

    // ========== STEP 2: Deploy JUSDiVault ==========
    console.log("\nStep 2: Deploying JUSDiVault...");

    // Deploy supporting contracts first (mocks for now, replace with real addresses)
    // For mainnet, you may want to deploy these separately or use existing addresses

    const EmergencyManager = await hre.ethers.getContractFactory("EmergencyManager");
    const emergencyManager = await EmergencyManager.deploy();
    await emergencyManager.waitForDeployment();
    const emergencyManagerAddr = await emergencyManager.getAddress();
    console.log("   EmergencyManager:", emergencyManagerAddr);

    await new Promise(r => setTimeout(r, 5000));

    const StablecoinOracle = await hre.ethers.getContractFactory(
        "contracts/vaults/jUSDi/StablecoinOracle.sol:StablecoinOracle"
    );
    const oracle = await StablecoinOracle.deploy();
    await oracle.waitForDeployment();
    const oracleAddr = await oracle.getAddress();
    console.log("   StablecoinOracle:", oracleAddr);

    await new Promise(r => setTimeout(r, 5000));

    const RiskScoring = await hre.ethers.getContractFactory(
        "contracts/vaults/jUSDi/RiskScoring.sol:RiskScoring"
    );
    const riskScoring = await RiskScoring.deploy();
    await riskScoring.waitForDeployment();
    const riskScoringAddr = await riskScoring.getAddress();
    console.log("   RiskScoring:", riskScoringAddr);

    await new Promise(r => setTimeout(r, 5000));

    // Deploy JUSDi token
    const JUSDi = await hre.ethers.getContractFactory("JUSDi");
    const jusdiToken = await JUSDi.deploy();
    await jusdiToken.waitForDeployment();
    const jusdiTokenAddr = await jusdiToken.getAddress();
    console.log("   JUSDi Token:", jusdiTokenAddr);

    await new Promise(r => setTimeout(r, 5000));

    // Deploy vault
    const JUSDiVault = await hre.ethers.getContractFactory(
        "contracts/vaults/jUSDi/JUSDiVault.sol:JUSDiVault"
    );
    const vault = await JUSDiVault.deploy(
        USDC,                    // Base asset
        jusdiTokenAddr,          // JUSDi token
        riskScoringAddr,         // Risk scoring
        emergencyManagerAddr,    // Emergency manager
        oracleAddr              // Oracle
    );
    await vault.waitForDeployment();
    const vaultAddr = await vault.getAddress();
    console.log("✅ JUSDiVault:", vaultAddr);

    await new Promise(r => setTimeout(r, 10000));

    // ========== STEP 3: Deploy LendingRouterAdapter ==========
    console.log("\nStep 3: Deploying LendingRouterAdapter...");
    const LendingRouterAdapter = await hre.ethers.getContractFactory("LendingRouterAdapter");
    const adapter = await LendingRouterAdapter.deploy(
        USDC,
        lendingRouterAddr,
        vaultAddr
    );
    await adapter.waitForDeployment();
    const adapterAddr = await adapter.getAddress();
    console.log("✅ LendingRouterAdapter:", adapterAddr);

    await new Promise(r => setTimeout(r, 5000));

    // ========== STEP 4: Configure Ownership ==========
    console.log("\nStep 4: Configuring ownership and treasury...");

    // Transfer LendingRouter ownership to adapter
    await lendingRouter.transferOwnership(adapterAddr);
    console.log("   LendingRouter ownership -> Adapter");

    // Set lending router on vault
    await vault.updateComponents(
        hre.ethers.ZeroAddress,  // riskScoring (keep current)
        hre.ethers.ZeroAddress,  // emergencyManager (keep current)
        hre.ethers.ZeroAddress,  // oracle (keep current)
        hre.ethers.ZeroAddress,  // rebalancingEngine (keep current)
        lendingRouterAddr        // lendingRouter
    );
    console.log("   Vault lendingRouter set");

    // Set treasury for fee collection
    await vault.setTreasury(TREASURY);
    console.log("   Treasury set to:", TREASURY);

    // ========== SUMMARY ==========
    console.log("\n===========================");
    console.log("🎉 jUSDi Mainnet Deployment Complete!");
    console.log("===========================\n");

    console.log("Deployed Contracts:");
    console.log("-------------------");
    console.log(`LendingRouter:        ${lendingRouterAddr}`);
    console.log(`LendingRouterAdapter: ${adapterAddr}`);
    console.log(`JUSDiVault:           ${vaultAddr}`);
    console.log(`JUSDi Token:          ${jusdiTokenAddr}`);
    console.log(`EmergencyManager:     ${emergencyManagerAddr}`);
    console.log(`StablecoinOracle:     ${oracleAddr}`);
    console.log(`RiskScoring:          ${riskScoringAddr}`);

    console.log("\nConfiguration:");
    console.log("--------------");
    console.log(`Base Asset (USDC):    ${USDC}`);
    console.log(`Aave V3 Pool:         ${AAVE_POOL}`);
    console.log(`Treasury:             ${TREASURY}`);

    console.log("\nNext Steps:");
    console.log("-----------");
    console.log("1. Verify all contracts on Basescan");
    console.log("2. Update frontend config.ts with new addresses");
    console.log("3. Add MAINNET_VAULT_ADDRESS to GitHub Secrets");
    console.log("4. Test deposit/withdraw on mainnet");

    // Return addresses for verification script
    return {
        lendingRouter: lendingRouterAddr,
        adapter: adapterAddr,
        vault: vaultAddr,
        jusdiToken: jusdiTokenAddr,
        emergencyManager: emergencyManagerAddr,
        oracle: oracleAddr,
        riskScoring: riskScoringAddr
    };
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
