const hre = require("hardhat");

async function main() {
    const vault = await hre.ethers.getContractAt('contracts/JUSDiVault.sol:JUSDiVault', '0xc698e233fbb9810ae0f22e154ee0912fa188c69c');
    console.log('Vault Owner:', await vault.owner());
    console.log('Current Strategy:', await vault.strategy());
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
