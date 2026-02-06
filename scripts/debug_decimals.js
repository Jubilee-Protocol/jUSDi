const hre = require("hardhat");

async function main() {
    console.log("=== Decimals Debug ===\n");

    const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const VAULT = "0x0B03463259d5041004290822444c4183aE936050";
    const JUSDI = "0x04cC650F6dB0B91Ef910a4a54F22232771988432";

    // Check USDC decimals
    const usdc = await hre.ethers.getContractAt(
        ["function decimals() view returns (uint8)"],
        USDC
    );
    console.log("USDC decimals:", await usdc.decimals());

    // Check jUSDi decimals
    const jusdi = await hre.ethers.getContractAt(
        ["function decimals() view returns (uint8)"],
        JUSDI
    );
    console.log("jUSDi decimals:", await jusdi.decimals());

    // Check vault decimals override
    const vault = await hre.ethers.getContractAt(
        ["function decimals() view returns (uint8)",
            "function asset() view returns (address)",
            "function totalAssets() view returns (uint256)",
            "function totalSupply() view returns (uint256)",
            "function previewDeposit(uint256) view returns (uint256)",
            "function convertToShares(uint256) view returns (uint256)"],
        VAULT
    );
    console.log("Vault.decimals():", await vault.decimals());
    console.log("Vault.asset():", await vault.asset());
    console.log("Vault.totalAssets():", await vault.totalAssets());
    console.log("Vault.totalSupply():", await vault.totalSupply());

    // Preview deposit of 1 USDC
    const oneUSDC = hre.ethers.parseUnits("1", 6);
    console.log("\n1 USDC (raw):", oneUSDC.toString());
    console.log("previewDeposit(1 USDC):", (await vault.previewDeposit(oneUSDC)).toString());
    console.log("convertToShares(1 USDC):", (await vault.convertToShares(oneUSDC)).toString());
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
