const hre = require("hardhat");

async function main() {
    const VAULT = '0xc698e233fbb9810ae0f22e154ee0912fa188c69c';
    const ADAPTER = '0xE3a564Ed7Ff686319BD618aA1c72dCdf5E3e5624';

    console.log("Setting strategy on vault...");
    const vault = await hre.ethers.getContractAt('contracts/JUSDiVault.sol:JUSDiVault', VAULT);

    const tx = await vault.setStrategy(ADAPTER);
    console.log("TX:", tx.hash);
    await tx.wait();

    console.log("✅ Strategy set!");
    console.log("Current Strategy:", await vault.strategy());
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
