/**
 * jUSDi Mainnet Deployment Script (Resume from Step 4)
 * 
 * Already deployed:
 * - LendingRouter:     0x6533715ccd0fdDe359baB156080DD38D5C85FfF9
 * - StablecoinOracle:  0x081433E5DbfAeBffBdDc1F69B9AB372D7A00fA7a
 * - RiskScoring:       0x79Bc0A789FC14919ee1698D115624600658efc4e
 * - EmergencyManager:  0x2B271251D0215753C3bcF56383Fd6D07765a6d90
 */

const hre = require("hardhat");

async function main() {
    console.log("🚀 jUSDi Mainnet Deployment (Resume from Step 4)");
    console.log("=================================================\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

    // ========== CONFIGURATION ==========
    const USDC = hre.ethers.getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
    const TREASURY = deployer.address;

    // Already deployed contracts
    const LENDING_ROUTER = "0x6533715ccd0fdDe359baB156080DD38D5C85FfF9";
    const ORACLE = "0x081433E5DbfAeBffBdDc1F69B9AB372D7A00fA7a";
    const RISK_SCORING = "0x79Bc0A789FC14919ee1698D115624600658efc4e";
    const EMERGENCY_MANAGER = "0x2B271251D0215753C3bcF56383Fd6D07765a6d90";

    // LayerZero V2 Endpoint on Base Mainnet
    const LZ_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";

    // ========== STEP 4: Deploy JUSDi Token ==========
    console.log("Step 4: Deploying JUSDi Token (OFT)...");
    const JUSDi = await hre.ethers.getContractFactory("JUSDi");
    const jusdiToken = await JUSDi.deploy(LZ_ENDPOINT, deployer.address);
    await jusdiToken.waitForDeployment();
    const jusdiTokenAddr = await jusdiToken.getAddress();
    console.log("✅ JUSDi Token:", jusdiTokenAddr);

    await new Promise(r => setTimeout(r, 8000));

    // ========== STEP 5: Deploy JUSDiVault ==========
    console.log("\nStep 5: Deploying JUSDiVault...");
    const JUSDiVault = await hre.ethers.getContractFactory(
        "contracts/vaults/jUSDi/JUSDiVault.sol:JUSDiVault"
    );
    const vault = await JUSDiVault.deploy(
        USDC,                    // _baseAsset
        jusdiTokenAddr,          // _jusdiToken
        deployer.address,        // _owner
        RISK_SCORING,            // _riskScoring
        EMERGENCY_MANAGER,       // _emergencyManager
        ORACLE,                  // _oracle
        hre.ethers.ZeroAddress,  // _rebalancingEngine
        LENDING_ROUTER           // _lendingRouter
    );
    await vault.waitForDeployment();
    const vaultAddr = await vault.getAddress();
    console.log("✅ JUSDiVault:", vaultAddr);

    await new Promise(r => setTimeout(r, 8000));

    // ========== STEP 6: Deploy LendingRouterAdapter ==========
    console.log("\nStep 6: Deploying LendingRouterAdapter...");
    const LendingRouterAdapter = await hre.ethers.getContractFactory("LendingRouterAdapter");
    const adapter = await LendingRouterAdapter.deploy(
        USDC,
        LENDING_ROUTER,
        vaultAddr
    );
    await adapter.waitForDeployment();
    const adapterAddr = await adapter.getAddress();
    console.log("✅ LendingRouterAdapter:", adapterAddr);

    await new Promise(r => setTimeout(r, 5000));

    // ========== STEP 7: Configure ==========
    console.log("\nStep 7: Configuring...");

    // Transfer LendingRouter ownership to adapter
    const lendingRouter = await hre.ethers.getContractAt(
        "contracts/vaults/jUSDi/LendingRouter.sol:LendingRouter",
        LENDING_ROUTER
    );
    await lendingRouter.transferOwnership(adapterAddr);
    console.log("   LendingRouter ownership → Adapter");

    // Set treasury
    await vault.setTreasury(TREASURY);
    console.log("   Treasury set");

    // ========== SUMMARY ==========
    console.log("\n=================================================");
    console.log("🎉 jUSDi Mainnet Deployment Complete!");
    console.log("=================================================\n");

    console.log("Deployed Contracts:");
    console.log("-------------------");
    console.log(`LendingRouter:        ${LENDING_ROUTER}`);
    console.log(`LendingRouterAdapter: ${adapterAddr}`);
    console.log(`JUSDiVault:           ${vaultAddr}`);
    console.log(`JUSDi Token:          ${jusdiTokenAddr}`);
    console.log(`StablecoinOracle:     ${ORACLE}`);
    console.log(`RiskScoring:          ${RISK_SCORING}`);
    console.log(`EmergencyManager:     ${EMERGENCY_MANAGER}`);

    console.log("\nConfiguration:");
    console.log("--------------");
    console.log(`Base Asset (USDC):    ${USDC}`);
    console.log(`Treasury:             ${TREASURY}`);
    console.log(`LZ Endpoint:          ${LZ_ENDPOINT}`);

    console.log("\nNext Steps:");
    console.log("-----------");
    console.log("1. Verify all contracts on Basescan");
    console.log("2. Update frontend config.ts");
    console.log("3. Test deposit/withdraw");

    // Save deployment info
    const fs = require('fs');
    const deployment = {
        network: "base-mainnet",
        timestamp: new Date().toISOString(),
        contracts: {
            lendingRouter: LENDING_ROUTER,
            adapter: adapterAddr,
            vault: vaultAddr,
            jusdiToken: jusdiTokenAddr,
            oracle: ORACLE,
            riskScoring: RISK_SCORING,
            emergencyManager: EMERGENCY_MANAGER
        },
        config: {
            usdc: USDC,
            treasury: TREASURY,
            lzEndpoint: LZ_ENDPOINT
        }
    };
    fs.writeFileSync('deployment-mainnet.json', JSON.stringify(deployment, null, 2));
    console.log("\n✅ Saved deployment info to deployment-mainnet.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
