/**
 * jUSDi Complete V3 Deployment - Everything Fresh
 * 
 * Previous deployments had issues:
 * - V1: LendingRouter ownership, token paused/ownership
 * - V2: Token is immutable, can't change after deployment
 * 
 * This deploys fresh:
 * 1. jUSDi Token (unpaused, owned by vault)
 * 2. LendingRouter (owned by vault)
 * 3. JUSDiVault (with decimals fix, owns token and router)
 * 
 * Run: npx hardhat run scripts/deploy_v3_complete.js --network base
 */

const hre = require("hardhat");

async function main() {
    console.log("🚀 jUSDi Complete V3 Deployment");
    console.log("================================\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

    // ========== CONFIGURATION ==========
    const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const LZ_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c";
    const AAVE_POOL = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";
    const ORACLE = "0x081433E5DbfAeBffBdDc1F69B9AB372D7A00fA7a";
    const RISK_SCORING = "0x79Bc0A789FC14919ee1698D115624600658efc4e";
    const EMERGENCY_MANAGER = "0x2B271251D0215753C3bcF56383Fd6D07765a6d90";
    const TREASURY = deployer.address;

    // ========== STEP 1: Deploy jUSDi Token ==========
    console.log("Step 1: Deploying jUSDi Token...");
    const JUSDi = await hre.ethers.getContractFactory("JUSDi");
    const jusdi = await JUSDi.deploy(LZ_ENDPOINT, deployer.address);
    await jusdi.waitForDeployment();
    const jusdiAddr = await jusdi.getAddress();
    console.log("✅ jUSDi Token:", jusdiAddr);

    await new Promise(r => setTimeout(r, 5000));

    // ========== STEP 2: Deploy LendingRouter (temp owner) ==========
    console.log("\nStep 2: Deploying LendingRouter...");
    const LendingRouter = await hre.ethers.getContractFactory(
        "contracts/vaults/jUSDi/LendingRouter.sol:LendingRouter"
    );
    const router = await LendingRouter.deploy(
        deployer.address,  // temp owner (will transfer to vault)
        AAVE_POOL,
        AAVE_POOL  // morpho placeholder
    );
    await router.waitForDeployment();
    const routerAddr = await router.getAddress();
    console.log("✅ LendingRouter:", routerAddr);

    await new Promise(r => setTimeout(r, 5000));

    // ========== STEP 3: Deploy JUSDiVault V3 ==========
    console.log("\nStep 3: Deploying JUSDiVault V3 (with decimals fix)...");
    const JUSDiVault = await hre.ethers.getContractFactory(
        "contracts/vaults/jUSDi/JUSDiVault.sol:JUSDiVault"
    );
    const vault = await JUSDiVault.deploy(
        USDC,               // base asset
        jusdiAddr,          // jUSDi token (NEW!)
        deployer.address,   // owner
        RISK_SCORING,
        EMERGENCY_MANAGER,
        ORACLE,
        hre.ethers.ZeroAddress, // rebalancing engine
        routerAddr          // lending router
    );
    await vault.waitForDeployment();
    const vaultAddr = await vault.getAddress();
    console.log("✅ JUSDiVault V3:", vaultAddr);

    await new Promise(r => setTimeout(r, 5000));

    // ========== STEP 4: Configure Ownership ==========
    console.log("\nStep 4: Configuring ownership...");

    // Transfer LendingRouter ownership to Vault
    await router.transferOwnership(vaultAddr);
    console.log("   ✅ LendingRouter → Vault");

    await new Promise(r => setTimeout(r, 3000));

    // Unpause jUSDi token
    await jusdi.unpause();
    console.log("   ✅ jUSDi unpaused");

    await new Promise(r => setTimeout(r, 3000));

    // Transfer jUSDi ownership to Vault
    await jusdi.transferOwnership(vaultAddr);
    console.log("   ✅ jUSDi → Vault");

    await new Promise(r => setTimeout(r, 3000));

    // Set treasury on vault
    await vault.setTreasury(TREASURY);
    console.log("   ✅ Treasury set");

    // ========== STEP 5: Verify ==========
    console.log("\nStep 5: Verifying deployment...");

    // Check decimals fix
    const vaultContract = await hre.ethers.getContractAt(
        ["function decimals() view returns (uint8)",
            "function previewDeposit(uint256) view returns (uint256)"],
        vaultAddr
    );
    const decimals = await vaultContract.decimals();
    const oneUSDC = hre.ethers.parseUnits("1", 6);
    const shares = await vaultContract.previewDeposit(oneUSDC);
    console.log("   Vault decimals:", decimals);
    console.log("   1 USDC → shares:", hre.ethers.formatUnits(shares, 18), "jUSDi");

    // Check ownership
    const routerOwner = await router.owner();
    const tokenOwner = await jusdi.owner();
    const tokenPaused = await jusdi.paused();
    console.log("   LendingRouter owner:", routerOwner);
    console.log("   jUSDi owner:", tokenOwner);
    console.log("   jUSDi paused:", tokenPaused);

    const allCorrect =
        decimals === 18n &&
        shares === hre.ethers.parseUnits("1", 18) &&
        routerOwner.toLowerCase() === vaultAddr.toLowerCase() &&
        tokenOwner.toLowerCase() === vaultAddr.toLowerCase() &&
        !tokenPaused;

    // ========== SUMMARY ==========
    console.log("\n================================");
    if (allCorrect) {
        console.log("🎉 V3 Deployment SUCCESSFUL!");
    } else {
        console.log("⚠️  V3 Deployment - Check Issues Above");
    }
    console.log("================================\n");

    console.log("Deployed Contracts:");
    console.log("  jUSDi Token:", jusdiAddr);
    console.log("  LendingRouter:", routerAddr);
    console.log("  JUSDiVault V3:", vaultAddr);

    console.log("\nConfiguration:");
    console.log("  USDC:", USDC);
    console.log("  Treasury:", TREASURY);
    console.log("  Aave Pool:", AAVE_POOL);

    console.log("\n⚠️  NEXT STEPS:");
    console.log("1. Verify contracts on Basescan");
    console.log("2. Update frontend config.ts:");
    console.log(`   vault: '${vaultAddr}'`);
    console.log(`   jusdiToken: '${jusdiAddr}'`);
    console.log(`   lendingRouter: '${routerAddr}'`);
    console.log("3. Test deposit on base.jusdi.xyz");

    // Save
    const fs = require('fs');
    const deployment = {
        timestamp: new Date().toISOString(),
        network: "base-mainnet",
        version: "v3",
        contracts: {
            jusdiToken: jusdiAddr,
            lendingRouter: routerAddr,
            vault: vaultAddr,
            oracle: ORACLE,
            riskScoring: RISK_SCORING,
            emergencyManager: EMERGENCY_MANAGER
        },
        verification: {
            decimals: Number(decimals),
            oneUsdcToShares: hre.ethers.formatUnits(shares, 18),
            routerOwnedByVault: routerOwner.toLowerCase() === vaultAddr.toLowerCase(),
            tokenOwnedByVault: tokenOwner.toLowerCase() === vaultAddr.toLowerCase(),
            tokenUnpaused: !tokenPaused
        }
    };
    fs.writeFileSync('deployment-v3-complete.json', JSON.stringify(deployment, null, 2));
    console.log("\n✅ Saved to deployment-v3-complete.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
