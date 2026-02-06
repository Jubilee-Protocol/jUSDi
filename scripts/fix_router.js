/**
 * jUSDi Emergency Fix: LendingRouter Ownership
 * 
 * Problem: LendingRouter.supply() is onlyOwner, but owner is Adapter (not Vault)
 * Fix: Deploy new LendingRouter with Vault as owner, then updateComponents()
 * 
 * Run: npx hardhat run scripts/fix_router.js --network base
 */

const hre = require("hardhat");

async function main() {
    console.log("🔧 jUSDi Emergency Fix: LendingRouter Ownership");
    console.log("=================================================\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

    // ========== CONFIGURATION ==========
    // Base Mainnet Addresses
    const VAULT_ADDRESS = "0x0B03463259d5041004290822444c4183aE936050";
    const AAVE_POOL = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";
    const MORPHO_PLACEHOLDER = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5"; // Use Aave as fallback

    // Existing components (pass zero address to keep unchanged)
    const ORACLE = "0x081433E5DbfAeBffBdDc1F69B9AB372D7A00fA7a";
    const RISK_SCORING = "0x79Bc0A789FC14919ee1698D115624600658efc4e";
    const EMERGENCY_MANAGER = "0x2B271251D0215753C3bcF56383Fd6D07765a6d90";

    // ========== STEP 1: Verify we own the vault ==========
    console.log("Step 1: Verifying vault ownership...");
    const vault = await hre.ethers.getContractAt(
        "contracts/vaults/jUSDi/JUSDiVault.sol:JUSDiVault",
        VAULT_ADDRESS
    );

    const vaultOwner = await vault.owner();
    console.log("   Vault owner:", vaultOwner);

    if (vaultOwner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.error("❌ ERROR: You are not the vault owner!");
        console.error("   Your address:", deployer.address);
        console.error("   Vault owner:", vaultOwner);
        process.exit(1);
    }
    console.log("✅ Ownership verified\n");

    // ========== STEP 2: Deploy new LendingRouter with VAULT as owner ==========
    console.log("Step 2: Deploying new LendingRouter with VAULT as owner...");
    const LendingRouter = await hre.ethers.getContractFactory(
        "contracts/vaults/jUSDi/LendingRouter.sol:LendingRouter"
    );

    const newRouter = await LendingRouter.deploy(
        VAULT_ADDRESS,  // 🔑 THE FIX: Vault is owner, not Adapter!
        AAVE_POOL,
        MORPHO_PLACEHOLDER
    );
    await newRouter.waitForDeployment();
    const newRouterAddr = await newRouter.getAddress();
    console.log("✅ New LendingRouter:", newRouterAddr);

    // Verify ownership
    const routerOwner = await newRouter.owner();
    console.log("   Router owner:", routerOwner);
    if (routerOwner.toLowerCase() !== VAULT_ADDRESS.toLowerCase()) {
        console.error("❌ ERROR: Router owner is not the vault!");
        process.exit(1);
    }
    console.log("✅ Router ownership verified (Vault is owner)\n");

    // Wait for network confirmation
    console.log("   Waiting for network confirmation...");
    await new Promise(r => setTimeout(r, 5000));

    // ========== STEP 3: Update vault to use new router ==========
    console.log("Step 3: Updating vault to use new LendingRouter...");

    // Use zero addresses to keep existing components, only update lendingRouter
    const tx = await vault.updateComponents(
        hre.ethers.ZeroAddress, // keep riskScoring
        hre.ethers.ZeroAddress, // keep emergencyManager  
        hre.ethers.ZeroAddress, // keep oracle
        hre.ethers.ZeroAddress, // keep rebalancingEngine
        newRouterAddr           // ← NEW router
    );
    await tx.wait();
    console.log("✅ Vault updated to use new LendingRouter\n");

    // ========== STEP 4: Verify the fix ==========
    console.log("Step 4: Verifying the fix...");

    const currentRouter = await vault.lendingRouter();
    console.log("   Vault's lendingRouter:", currentRouter);

    if (currentRouter.toLowerCase() !== newRouterAddr.toLowerCase()) {
        console.error("❌ ERROR: Vault still points to old router!");
        process.exit(1);
    }
    console.log("✅ Fix verified!\n");

    // ========== SUMMARY ==========
    console.log("=================================================");
    console.log("🎉 Fix Applied Successfully!");
    console.log("=================================================\n");
    console.log("Old LendingRouter: 0x6533715ccd0fdDe359baB156080DD38D5C85FfF9 (owned by Adapter - BROKEN)");
    console.log("New LendingRouter:", newRouterAddr, "(owned by Vault - FIXED)");
    console.log("\nVault:", VAULT_ADDRESS);
    console.log("\nNext steps:");
    console.log("1. Verify new LendingRouter on Basescan");
    console.log("2. Update frontend config.ts with new router address");
    console.log("3. Test deposit on base.jusdi.xyz");
    console.log("4. Update audit docs");

    // Save fix info
    const fs = require('fs');
    const fixInfo = {
        timestamp: new Date().toISOString(),
        issue: "LendingRouter owned by Adapter instead of Vault",
        fix: "Deployed new LendingRouter with Vault as owner",
        oldRouter: "0x6533715ccd0fdDe359baB156080DD38D5C85FfF9",
        newRouter: newRouterAddr,
        vault: VAULT_ADDRESS,
        txHash: tx.hash
    };
    fs.writeFileSync('fix-router-mainnet.json', JSON.stringify(fixInfo, null, 2));
    console.log("\n✅ Saved fix info to fix-router-mainnet.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
