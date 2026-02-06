const hre = require("hardhat");

async function main() {
    const vault = await hre.ethers.getContractAt(
        "contracts/vaults/jUSDi/JUSDiVault.sol:JUSDiVault",
        "0x0B03463259d5041004290822444c4183aE936050"
    );
    console.log("Current lendingRouter:", await vault.lendingRouter());

    const newRouter = await hre.ethers.getContractAt(
        "contracts/vaults/jUSDi/LendingRouter.sol:LendingRouter",
        "0x90AA6bEccFcD34BE53B8742659235084337840e9"
    );
    console.log("New router owner:", await newRouter.owner());
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
