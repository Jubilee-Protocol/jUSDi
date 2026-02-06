/**
 * Check if we can safely pause old vaults without affecting V3
 * 
 * Problem: V1, V2, V3 vaults all use the SAME EmergencyManager
 * If we pause it, ALL vaults get paused including V3!
 * 
 * Run: npx hardhat run scripts/check_pause_strategy.js --network base
 */

const hre = require("hardhat");

async function main() {
    console.log("=== Pause Strategy Analysis ===\n");

    const EMERGENCY_MANAGER = "0x2B271251D0215753C3bcF56383Fd6D07765a6d90";
    const V1_VAULT = "0x0B03463259d5041004290822444c4183aE936050";
    const V2_VAULT = "0x4AF7115b5616db48609C97c79fd90f0b403807bA";
    const V3_VAULT = "0x26c39532C0dD06C0c4EddAeE36979626b16c77aC";

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);

    // Check EmergencyManager owner and state
    const em = await hre.ethers.getContractAt(
        ["function owner() view returns (address)",
            "function isPaused() view returns (bool)"],
        EMERGENCY_MANAGER
    );
    console.log("\nEmergencyManager:", EMERGENCY_MANAGER);
    console.log("   Owner:", await em.owner());
    console.log("   isPaused:", await em.isPaused());

    // Check which vaults use this EmergencyManager
    const vaultInterface = [
        "function emergencyManager() view returns (address)",
        "function owner() view returns (address)"
    ];

    console.log("\n--- Vault Analysis ---");

    // V1
    const v1 = await hre.ethers.getContractAt(vaultInterface, V1_VAULT);
    console.log("\nV1 Vault:", V1_VAULT);
    console.log("   emergencyManager:", await v1.emergencyManager());
    console.log("   owner:", await v1.owner());

    // V2
    const v2 = await hre.ethers.getContractAt(vaultInterface, V2_VAULT);
    console.log("\nV2 Vault:", V2_VAULT);
    console.log("   emergencyManager:", await v2.emergencyManager());
    console.log("   owner:", await v2.owner());

    // V3
    const v3 = await hre.ethers.getContractAt(vaultInterface, V3_VAULT);
    console.log("\nV3 Vault:", V3_VAULT);
    console.log("   emergencyManager:", await v3.emergencyManager());
    console.log("   owner:", await v3.owner());

    // Check if they share the same EmergencyManager
    const v1em = await v1.emergencyManager();
    const v2em = await v2.emergencyManager();
    const v3em = await v3.emergencyManager();

    if (v1em === v3em || v2em === v3em) {
        console.log("\n⚠️  WARNING: V3 shares EmergencyManager with old vaults!");
        console.log("   Pausing EmergencyManager will pause V3 too!");
        console.log("\n   SOLUTION: Deploy new EmergencyManager for V3, or");
        console.log("   use updateComponents() on V3 to set a different EM.");
    } else {
        console.log("\n✅ V3 has separate EmergencyManager. Safe to pause old EM.");
    }

    // Check if we can use updateComponents to change V3's EM
    console.log("\n--- Options ---");
    console.log("1. Deploy new EmergencyManager for V3");
    console.log("2. V3 already has different EM (check above)");
    console.log("3. Don't pause old vaults - they will fail anyway");
    console.log("   (V1 token ownership wrong, V2 token immutable wrong)");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
