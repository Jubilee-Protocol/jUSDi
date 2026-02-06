/**
 * jUSDi Emergency Fix #2: Token Permissions
 * 
 * Problem 1: jUSDi token is PAUSED - transfers fail
 * Problem 2: jUSDi owner is deployer, not Vault - Vault can't mint
 * 
 * Fix: Unpause token and transfer ownership to Vault
 * 
 * Run: npx hardhat run scripts/fix_token.js --network base
 */

const hre = require("hardhat");

async function main() {
    console.log("🔧 jUSDi Emergency Fix #2: Token Permissions");
    console.log("=============================================\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

    // Addresses
    const VAULT = "0x0B03463259d5041004290822444c4183aE936050";
    const JUSDI_TOKEN = "0x04cC650F6dB0B91Ef910a4a54F22232771988432";

    // Get token contract
    const token = await hre.ethers.getContractAt(
        ["function owner() view returns (address)",
            "function paused() view returns (bool)",
            "function unpause() external",
            "function transferOwnership(address newOwner) external"],
        JUSDI_TOKEN
    );

    // Step 1: Check current state
    console.log("Current State:");
    const owner = await token.owner();
    const paused = await token.paused();
    console.log("   Owner:", owner);
    console.log("   Paused:", paused);

    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
        console.error("\n❌ ERROR: You are not the token owner!");
        console.error("   Your address:", deployer.address);
        console.error("   Token owner:", owner);
        process.exit(1);
    }

    // Step 2: Unpause the token
    if (paused) {
        console.log("\nStep 1: Unpausing jUSDi token...");
        const tx1 = await token.unpause();
        await tx1.wait();
        console.log("✅ Token unpaused");
    } else {
        console.log("\n✅ Token already unpaused");
    }

    // Step 3: Transfer ownership to Vault
    console.log("\nStep 2: Transferring ownership to Vault...");
    const tx2 = await token.transferOwnership(VAULT);
    await tx2.wait();
    console.log("✅ Ownership transferred to Vault");

    // Verify
    console.log("\nVerifying...");
    const newOwner = await token.owner();
    const newPaused = await token.paused();
    console.log("   New Owner:", newOwner);
    console.log("   Paused:", newPaused);

    if (newOwner.toLowerCase() === VAULT.toLowerCase() && !newPaused) {
        console.log("\n🎉 FIX SUCCESSFUL!");
        console.log("   jUSDi token is now owned by Vault and unpaused.");
        console.log("   Deposits should work now!");
    } else {
        console.log("\n⚠️  Verification failed. Please check manually.");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
