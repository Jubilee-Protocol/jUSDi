const hre = require("hardhat");

async function main() {
    const LENDING_ROUTER = '0x79695d252C9abC36949F675615f3dcc602B97CE5';
    const ADAPTER = '0xE3a564Ed7Ff686319BD618aA1c72dCdf5E3e5624';
    const VAULT = '0xc698e233fbb9810ae0f22e154ee0912fa188c69c';

    // Step 1: Transfer LendingRouter ownership to adapter
    console.log("Step 1: Transferring LendingRouter ownership to adapter...");
    const lendingRouter = await hre.ethers.getContractAt('contracts/vaults/jUSDi/LendingRouter.sol:LendingRouter', LENDING_ROUTER);

    const currentOwner = await lendingRouter.owner();
    console.log("Current LendingRouter owner:", currentOwner);

    if (currentOwner.toLowerCase() === ADAPTER.toLowerCase()) {
        console.log("✅ Ownership already transferred");
    } else {
        const tx1 = await lendingRouter.transferOwnership(ADAPTER);
        console.log("TX:", tx1.hash);
        await tx1.wait();
        console.log("✅ Ownership transferred");
    }

    // Wait
    await new Promise(r => setTimeout(r, 5000));

    // Step 2: Set strategy on vault
    console.log("\nStep 2: Setting strategy on vault...");
    const vault = await hre.ethers.getContractAt('contracts/JUSDiVault.sol:JUSDiVault', VAULT);

    const currentStrategy = await vault.strategy();
    console.log("Current Strategy:", currentStrategy);

    if (currentStrategy.toLowerCase() === ADAPTER.toLowerCase()) {
        console.log("✅ Strategy already set");
    } else {
        const tx2 = await vault.setStrategy(ADAPTER);
        console.log("TX:", tx2.hash);
        await tx2.wait();
        console.log("✅ Strategy set!");
    }

    console.log("\n=========================================");
    console.log("🎉 jUSDi EVM Setup Complete!");
    console.log("=========================================");
    console.log("LendingRouter:", LENDING_ROUTER);
    console.log("Adapter:", ADAPTER);
    console.log("Vault:", VAULT);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
