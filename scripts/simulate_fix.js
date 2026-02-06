const hre = require("hardhat");

async function main() {
    const vaultAddr = "0x26c39532C0dD06C0c4EddAeE36979626b16c77aC"; // V3
    const usdcAddr = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const whale = "0x3304E22DDaa22bCdC5fCa2269b418046aE7b566A"; // USDC whale usually

    // We need a JUSDi holder. I'll mint some since we own the vault?
    // Oh wait, V3 Vault owns the token. We can't mint directly.
    // We can deposit USDC to get JUSDi.

    // 1. Get USDC
    const usdc = await hre.ethers.getContractAt("IERC20", usdcAddr);
    const vault = await hre.ethers.getContractAt("JUSDiVault", vaultAddr);

    // Impersonate a wealthy account for USDC
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [whale],
    });
    const signer = await hre.ethers.getSigner(whale);

    // 2. Deposit 10 USDC
    const amt = hre.ethers.parseUnits("10", 6);
    await usdc.connect(signer).approve(vaultAddr, amt);
    await vault.connect(signer).deposit(amt, whale);
    console.log("Deposited 10 USDC");

    // Check JUSDi balance
    const shares = await vault.balanceOf(whale);
    console.log("Shares:", hre.ethers.formatUnits(shares, 18));

    // 3. Try Redeem (Should fail if illiquid)
    // First, ensure vault is illiquid (funds in Router)
    // Deposit pushes to router if > buffer. 
    // buffer is 10%. 10 USDC deposit -> 1 USDC liquid, 9 USDC to router.
    // But we need to ensure liquidity is LOW compared to withdraw.
    // The previous deposit might have left some liquid.
    // Let's check liquid.
    let liquid = await usdc.balanceOf(vaultAddr);
    console.log("Liquid:", hre.ethers.formatUnits(liquid, 6));

    console.log("--- Attempting REDEEM (Shares) ---");
    try {
        await vault.connect(signer).redeem(shares, whale, whale);
        console.log("Redeem Success!");
    } catch (e) {
        console.log("Redeem Failed (Expected):", e.message);
    }

    // 4. Try Withdraw (Should succeed by pulling from Router)
    console.log("--- Attempting WITHDRAW (Assets) ---");
    // We assume 1:1 roughly. 10 USDC.
    const assets = hre.ethers.parseUnits("10", 6);
    try {
        // Need shares again? We failed redeem so we still have them.
        await vault.connect(signer).withdraw(assets, whale, whale);
        console.log("Withdraw Success!");
    } catch (e) {
        console.log("Withdraw Failed:", e.message);
    }
}

main().catch(console.error);
