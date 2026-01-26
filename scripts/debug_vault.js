const hre = require("hardhat");

async function main() {
    const VAULT = '0xc698e233fbb9810ae0f22e154ee0912fa188c69c';
    const USDC = '0x036cbd53842c5426634e7929541ec2318f3dcf7e';

    const vault = await hre.ethers.getContractAt('contracts/JUSDiVault.sol:JUSDiVault', VAULT);
    const usdc = await hre.ethers.getContractAt('IERC20', USDC);

    console.log("Vault address:", VAULT);
    console.log("Vault USDC balance:", await usdc.balanceOf(VAULT));
    console.log("Vault totalAssets:", await vault.totalAssets());
    console.log("Vault total supply:", await vault.totalSupply());
    console.log("Vault owner:", await vault.owner());
    console.log("Current strategy:", await vault.strategy());
    console.log("Vault asset:", await vault.asset());
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
