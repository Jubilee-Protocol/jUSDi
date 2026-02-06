/**
 * Deploy new jUSDi Token for Vault V2
 * 
 * The old vault owns the old jUSDi token and can't transfer ownership.
 * Solution: Deploy fresh jUSDi token owned by new Vault V2.
 * 
 * Run: npx hardhat run scripts/deploy_jusdi_v2.js --network base
 */

const hre = require("hardhat");

async function main() {
    console.log("🚀 jUSDi Token V2 Deployment");
    console.log("============================\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

    // New Vault V2 address
    const NEW_VAULT = "0x4AF7115b5616db48609C97c79fd90f0b403807bA";
    const LZ_ENDPOINT = "0x1a44076050125825900e736c501f859c50fE728c"; // LayerZero V2 on Base

    // Deploy new jUSDi token
    console.log("Deploying new jUSDi token...");
    const JUSDi = await hre.ethers.getContractFactory("JUSDi");
    const jusdi = await JUSDi.deploy(LZ_ENDPOINT, deployer.address);
    await jusdi.waitForDeployment();
    const jusdiAddr = await jusdi.getAddress();
    console.log("✅ New jUSDi Token:", jusdiAddr);

    await new Promise(r => setTimeout(r, 5000));

    // Unpause the token
    console.log("\nUnpausing token...");
    await jusdi.unpause();
    console.log("✅ Token unpaused");

    await new Promise(r => setTimeout(r, 3000));

    // Transfer ownership to Vault V2
    console.log("\nTransferring ownership to Vault V2...");
    await jusdi.transferOwnership(NEW_VAULT);
    console.log("✅ Ownership transferred to Vault V2");

    // Verify
    console.log("\nVerifying...");
    console.log("   Token owner:", await jusdi.owner());
    console.log("   Token paused:", await jusdi.paused());

    console.log("\n============================");
    console.log("🎉 jUSDi Token V2 Deployed!");
    console.log("============================\n");
    console.log("New jUSDi Token:", jusdiAddr);
    console.log("Owner:", NEW_VAULT);
    console.log("\n⚠️  IMPORTANT NEXT STEPS:");
    console.log("1. Update JUSDiVault V2 to use new jUSDi token");
    console.log("   - Call: vault.updateComponents(...) with new token");
    console.log("   - OR: Redeploy vault with correct token");
    console.log("2. Update frontend config.ts");
    console.log("3. Verify contract on Basescan");

    // Save
    const fs = require('fs');
    const deployment = {
        timestamp: new Date().toISOString(),
        jusdiTokenV2: jusdiAddr,
        vaultV2: NEW_VAULT,
        lzEndpoint: LZ_ENDPOINT
    };
    fs.writeFileSync('deployment-jusdi-v2.json', JSON.stringify(deployment, null, 2));
    console.log("\n✅ Saved to deployment-jusdi-v2.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
