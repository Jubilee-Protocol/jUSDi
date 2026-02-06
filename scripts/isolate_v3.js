/**
 * Deploy new EmergencyManager for V3 and pause old vaults
 * 
 * Strategy:
 * 1. Deploy new EmergencyManager (for V3 only)
 * 2. Update V3 to use new EmergencyManager via updateComponents()
 * 3. Pause old EmergencyManager to block V1/V2 deposits
 * 
 * Run: npx hardhat run scripts/isolate_v3.js --network base
 */

const hre = require("hardhat");

async function main() {
    console.log("🔒 Isolating V3 and Blocking Old Vaults");
    console.log("=======================================\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

    // Addresses
    const V3_VAULT = "0x26c39532C0dD06C0c4EddAeE36979626b16c77aC";
    const OLD_EM = "0x2B271251D0215753C3bcF56383Fd6D07765a6d90";
    const ORACLE = "0x081433E5DbfAeBffBdDc1F69B9AB372D7A00fA7a";
    const RISK_SCORING = "0x79Bc0A789FC14919ee1698D115624600658efc4e";

    // ========== STEP 1: Deploy new EmergencyManager for V3 ==========
    console.log("Step 1: Deploying new EmergencyManager for V3...");
    const EmergencyManager = await hre.ethers.getContractFactory(
        "contracts/vaults/jUSDi/EmergencyManager.sol:EmergencyManager"
    );
    const newEM = await EmergencyManager.deploy(
        deployer.address,  // owner
        ORACLE,
        RISK_SCORING
    );
    await newEM.waitForDeployment();
    const newEMAddr = await newEM.getAddress();
    console.log("✅ New EmergencyManager:", newEMAddr);

    await new Promise(r => setTimeout(r, 5000));

    // ========== STEP 2: Update V3 to use new EmergencyManager ==========
    console.log("\nStep 2: Updating V3 to use new EmergencyManager...");
    const vault = await hre.ethers.getContractAt(
        "contracts/vaults/jUSDi/JUSDiVault.sol:JUSDiVault",
        V3_VAULT
    );

    const tx = await vault.updateComponents(
        hre.ethers.ZeroAddress,  // keep riskScoring
        newEMAddr,               // ← NEW EmergencyManager
        hre.ethers.ZeroAddress,  // keep oracle
        hre.ethers.ZeroAddress,  // keep rebalancingEngine
        hre.ethers.ZeroAddress   // keep lendingRouter
    );
    await tx.wait();
    console.log("✅ V3 now uses new EmergencyManager");

    await new Promise(r => setTimeout(r, 3000));

    // ========== STEP 3: Pause old EmergencyManager ==========
    console.log("\nStep 3: Pausing old EmergencyManager (blocks V1/V2)...");
    const oldEM = await hre.ethers.getContractAt(
        ["function setPaused(bool, string) external",
            "function isPaused() view returns (bool)"],
        OLD_EM
    );

    await oldEM.setPaused(true, "Deprecated: Use V3 vault at 0x26c39532C0dD06C0c4EddAeE36979626b16c77aC");
    console.log("✅ Old EmergencyManager PAUSED");

    // ========== VERIFY ==========
    console.log("\nVerifying...");

    const v3EM = await vault.emergencyManager();
    console.log("   V3 EmergencyManager:", v3EM);
    console.log("   V3 uses new EM:", v3EM.toLowerCase() === newEMAddr.toLowerCase());

    const newEMPaused = await newEM.isPaused();
    const oldEMPaused = await oldEM.isPaused();
    console.log("   New EM isPaused:", newEMPaused);
    console.log("   Old EM isPaused:", oldEMPaused);

    // ========== SUMMARY ==========
    console.log("\n=======================================");
    console.log("🎉 Isolation Complete!");
    console.log("=======================================\n");

    console.log("V3 Vault:", V3_VAULT);
    console.log("  → EmergencyManager:", newEMAddr, "(ACTIVE)");

    console.log("\nV1/V2 Vaults:");
    console.log("  → EmergencyManager:", OLD_EM, "(PAUSED)");
    console.log("  → Deposits will FAIL with 'Vault paused'");

    // Save
    const fs = require('fs');
    const deployment = {
        timestamp: new Date().toISOString(),
        newEmergencyManager: newEMAddr,
        oldEmergencyManager: OLD_EM,
        v3Vault: V3_VAULT,
        oldEMPaused: true
    };
    fs.writeFileSync('deployment-isolation.json', JSON.stringify(deployment, null, 2));
    console.log("\n✅ Saved to deployment-isolation.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
