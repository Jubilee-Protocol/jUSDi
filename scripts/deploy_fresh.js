const hre = require("hardhat");

async function main() {
    console.log("🚀 Redeploying LendingRouterAdapter with fix...\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const USDC = hre.ethers.getAddress("0x036cbd53842c5426634e7929541ec2318f3dcf7e");
    const VAULT = hre.ethers.getAddress("0xc698e233fbb9810ae0f22e154ee0912fa188c69c");
    const LENDING_ROUTER = "0x79695d252C9abC36949F675615f3dcc602B97CE5";

    // Deploy new adapter
    console.log("Deploying new LendingRouterAdapter...");
    const LendingRouterAdapter = await hre.ethers.getContractFactory("LendingRouterAdapter");
    const adapter = await LendingRouterAdapter.deploy(
        USDC,
        LENDING_ROUTER,
        VAULT
    );
    await adapter.waitForDeployment();
    const adapterAddr = await adapter.getAddress();
    console.log("✅ New Adapter:", adapterAddr);

    // Wait
    await new Promise(r => setTimeout(r, 10000));

    // Transfer LendingRouter ownership to new adapter
    console.log("\nTransferring LendingRouter ownership...");
    const router = await hre.ethers.getContractAt('contracts/vaults/jUSDi/LendingRouter.sol:LendingRouter', LENDING_ROUTER);

    // First we need to get it back from the old adapter
    const currentOwner = await router.owner();
    console.log("Current owner:", currentOwner);

    // The old adapter (0xE3a564Ed7Ff686319BD618aA1c72dCdf5E3e5624) is the owner
    // We can't transfer from it since we don't control it
    // We need to deploy a NEW LendingRouter too

    console.log("\n⚠️  The old adapter owns the LendingRouter.");
    console.log("We need to deploy a fresh LendingRouter too.");

    // Deploy fresh LendingRouter
    const AAVE_POOL = hre.ethers.getAddress("0x4e033932203f3582e39130543393526e3d20d235");

    console.log("\nDeploying fresh LendingRouter...");
    const LendingRouter = await hre.ethers.getContractFactory("contracts/vaults/jUSDi/LendingRouter.sol:LendingRouter");
    const newRouter = await LendingRouter.deploy(
        deployer.address,
        AAVE_POOL,
        AAVE_POOL  // Use Aave for both for now
    );
    await newRouter.waitForDeployment();
    const newRouterAddr = await newRouter.getAddress();
    console.log("✅ New LendingRouter:", newRouterAddr);

    await new Promise(r => setTimeout(r, 5000));

    // Deploy ANOTHER adapter with the new router
    console.log("\nDeploying final LendingRouterAdapter...");
    const finalAdapter = await LendingRouterAdapter.deploy(
        USDC,
        newRouterAddr,
        VAULT
    );
    await finalAdapter.waitForDeployment();
    const finalAdapterAddr = await finalAdapter.getAddress();
    console.log("✅ Final Adapter:", finalAdapterAddr);

    await new Promise(r => setTimeout(r, 5000));

    // Transfer ownership of new router to new adapter
    console.log("\nTransferring new router ownership to adapter...");
    await newRouter.transferOwnership(finalAdapterAddr);
    console.log("✅ Ownership transferred");

    await new Promise(r => setTimeout(r, 5000));

    // Set strategy on vault
    console.log("\nSetting strategy on vault...");
    const vault = await hre.ethers.getContractAt('contracts/JUSDiVault.sol:JUSDiVault', VAULT);
    const tx = await vault.setStrategy(finalAdapterAddr);
    console.log("TX:", tx.hash);
    await tx.wait();
    console.log("✅ Strategy set!");

    console.log("\n=========================================");
    console.log("🎉 jUSDi EVM Deployment COMPLETE!");
    console.log("=========================================");
    console.log("LendingRouter:", newRouterAddr);
    console.log("Adapter:", finalAdapterAddr);
    console.log("Vault:", VAULT);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
