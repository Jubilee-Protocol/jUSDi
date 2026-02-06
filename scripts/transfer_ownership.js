const hre = require("hardhat");

async function main() {
    console.log("Transferring jUSDi ownership to Vault...");

    const VAULT = "0x0B03463259d5041004290822444c4183aE936050";
    const JUSDI_TOKEN = "0x04cC650F6dB0B91Ef910a4a54F22232771988432";

    const token = await hre.ethers.getContractAt(
        ["function owner() view returns (address)",
            "function paused() view returns (bool)",
            "function transferOwnership(address newOwner) external"],
        JUSDI_TOKEN
    );

    console.log("Current owner:", await token.owner());
    console.log("Paused:", await token.paused());

    const tx = await token.transferOwnership(VAULT);
    console.log("TX hash:", tx.hash);
    await tx.wait();

    console.log("New owner:", await token.owner());
    console.log("✅ Done!");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
