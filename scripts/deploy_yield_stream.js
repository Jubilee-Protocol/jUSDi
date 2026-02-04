// Deploy JubileeYieldStream to Base Sepolia
const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying JubileeYieldStream to Base Sepolia...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

    // Base Sepolia jUSDi Vault address (from README)
    const VAULT_ADDRESS = "0xc698e233fbB9810Ae0F22e154Ee0912Fa188C69c";

    console.log("Using jUSDi Vault:", VAULT_ADDRESS);
    console.log("Owner will be:", deployer.address);

    // Deploy JubileeYieldStream
    console.log("\n📦 Deploying JubileeYieldStream...");
    const JubileeYieldStream = await hre.ethers.getContractFactory("JubileeYieldStream");
    const yieldStream = await JubileeYieldStream.deploy(VAULT_ADDRESS, deployer.address);

    await yieldStream.waitForDeployment();
    const yieldStreamAddress = await yieldStream.getAddress();

    console.log("✅ JubileeYieldStream deployed to:", yieldStreamAddress);

    // Verify contract configuration
    console.log("\n🔍 Verifying contract configuration...");
    const vault = await yieldStream.vault();
    const asset = await yieldStream.asset();
    console.log("  Vault:", vault);
    console.log("  Asset (USDC):", asset);

    // Save deployment info
    const deployment = {
        network: "base-sepolia",
        timestamp: new Date().toISOString(),
        contracts: {
            jubileeYieldStream: yieldStreamAddress,
            vault: VAULT_ADDRESS,
        },
        deployer: deployer.address,
    };

    const fs = require("fs");
    fs.writeFileSync(
        "Agentic Interaction/deployment-base-sepolia.json",
        JSON.stringify(deployment, null, 2)
    );
    console.log("\n💾 Deployment saved to Agentic Interaction/deployment-base-sepolia.json");

    // Verification instructions
    console.log("\n📋 To verify on Basescan:");
    console.log(`npx hardhat verify --network baseSepolia ${yieldStreamAddress} "${VAULT_ADDRESS}" "${deployer.address}"`);

    console.log("\n🎉 Deployment complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
