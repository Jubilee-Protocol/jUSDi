const hre = require("hardhat");

async function main() {
    const VAULT = "0x0B03463259d5041004290822444c4183aE936050";
    const JUSDI_TOKEN = "0x04cC650F6dB0B91Ef910a4a54F22232771988432";

    console.log("=== jUSDi Token Debug ===\n");

    // Check jUSDi token state via low-level calls
    const token = await hre.ethers.getContractAt(
        ["function owner() view returns (address)",
            "function paused() view returns (bool)",
            "function totalSupply() view returns (uint256)"],
        JUSDI_TOKEN
    );

    const owner = await token.owner();
    const paused = await token.paused();
    const supply = await token.totalSupply();

    console.log("jUSDi Token:", JUSDI_TOKEN);
    console.log("Owner:", owner);
    console.log("Paused:", paused);
    console.log("Total Supply:", hre.ethers.formatUnits(supply, 6));

    console.log("\nVault Address:", VAULT);
    console.log("Is Vault the Owner?", owner.toLowerCase() === VAULT.toLowerCase());

    if (paused) {
        console.log("\n⚠️  TOKEN IS PAUSED - transfers will fail!");
    }

    if (owner.toLowerCase() !== VAULT.toLowerCase()) {
        console.log("\n⚠️  VAULT IS NOT OWNER - cannot mint jUSDi!");
        console.log("   Need to call: jusdiToken.transferOwnership(VAULT)");
    }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
