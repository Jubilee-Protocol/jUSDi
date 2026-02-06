const hre = require("hardhat");

async function main() {
    console.log("Checking jUSDi ownership situation...\n");

    const JUSDI = "0x04cC650F6dB0B91Ef910a4a54F22232771988432";
    const OLD_VAULT = "0x0B03463259d5041004290822444c4183aE936050";
    const NEW_VAULT = "0x4AF7115b5616db48609C97c79fd90f0b403807bA";

    const [deployer] = await hre.ethers.getSigners();

    // Check token owner
    const token = await hre.ethers.getContractAt(
        ["function owner() view returns (address)"],
        JUSDI
    );
    console.log("jUSDi owner:", await token.owner());

    // Check old vault owner
    const oldVault = await hre.ethers.getContractAt(
        ["function owner() view returns (address)",
            "function jusdiToken() view returns (address)"],
        OLD_VAULT
    );
    console.log("Old vault owner:", await oldVault.owner());
    console.log("Old vault's jusdiToken:", await oldVault.jusdiToken());

    // The jUSDi token has transferOwnership(). The Vault owns the token.
    // But the Vault doesn't expose a function to call transferOwnership on the token.
    // However, since we (deployer) own the Vault, and the Vault owns the token...
    // We need to add a function to transfer token ownership, OR
    // We could make a direct call if the Vault has some generic execute function.

    console.log("\nDeployer address:", deployer.address);
    console.log("Do we own the vault?", (await oldVault.owner()).toLowerCase() === deployer.address.toLowerCase());

    // Unfortunately, the Vault doesn't have a function to transfer token ownership.
    // Options:
    // 1. Add a function to the vault (requires redeployment - defeats purpose)
    // 2. Create a new jUSDi token and use that with new vault
    // 3. Modify jUSDi to allow multi-owner/minter pattern

    console.log("\n⚠️ The old vault owns jUSDi token but has no function to transfer ownership.");
    console.log("Options:");
    console.log("1. Deploy new jUSDi token for new vault (clean slate)");
    console.log("2. Modify code to allow multiple minters");
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
