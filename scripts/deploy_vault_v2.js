/**
 * jUSDi Vault V2 Deployment - Fixed Decimals
 * 
 * Problem: Old vault didn't have _decimalsOffset(), so 1 USDC → 0.000000000001 jUSDi
 * Fix: New vault has _decimalsOffset() = 12, so 1 USDC → 1 jUSDi
 * 
 * Run: npx hardhat run scripts/deploy_vault_v2.js --network base
 */

const hre = require("hardhat");

async function main() {
    console.log("🚀 jUSDi Vault V2 Deployment (Decimals Fix)");
    console.log("============================================\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Balance:", hre.ethers.formatEther(balance), "ETH\n");

    // ========== CONFIGURATION ==========
    const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const JUSDI_TOKEN = "0x04cC650F6dB0B91Ef910a4a54F22232771988432";
    const ORACLE = "0x081433E5DbfAeBffBdDc1F69B9AB372D7A00fA7a";
    const RISK_SCORING = "0x79Bc0A789FC14919ee1698D115624600658efc4e";
    const EMERGENCY_MANAGER = "0x2B271251D0215753C3bcF56383Fd6D07765a6d90";
    const AAVE_POOL = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";

    // ========== STEP 1: Deploy new LendingRouter (owned by new vault) ==========
    console.log("Step 1: Deploying new LendingRouter...");

    // We'll set owner to deployer first, then transfer to vault after vault is deployed
    const LendingRouter = await hre.ethers.getContractFactory(
        "contracts/vaults/jUSDi/LendingRouter.sol:LendingRouter"
    );
    const router = await LendingRouter.deploy(
        deployer.address,  // temporary owner
        AAVE_POOL,
        AAVE_POOL  // morpho placeholder
    );
    await router.waitForDeployment();
    const routerAddr = await router.getAddress();
    console.log("✅ New LendingRouter:", routerAddr);

    await new Promise(r => setTimeout(r, 5000));

    // ========== STEP 2: Deploy JUSDiVault V2 ==========
    console.log("\nStep 2: Deploying JUSDiVault V2 (with _decimalsOffset fix)...");

    const JUSDiVault = await hre.ethers.getContractFactory(
        "contracts/vaults/jUSDi/JUSDiVault.sol:JUSDiVault"
    );
    const vault = await JUSDiVault.deploy(
        USDC,            // base asset
        JUSDI_TOKEN,     // jUSDi token
        deployer.address, // owner
        RISK_SCORING,    // risk scoring
        EMERGENCY_MANAGER, // emergency manager
        ORACLE,          // oracle
        hre.ethers.ZeroAddress, // rebalancing engine (not set)
        routerAddr       // lending router
    );
    await vault.waitForDeployment();
    const vaultAddr = await vault.getAddress();
    console.log("✅ New JUSDiVault V2:", vaultAddr);

    await new Promise(r => setTimeout(r, 5000));

    // ========== STEP 3: Transfer router ownership to vault ==========
    console.log("\nStep 3: Transferring LendingRouter ownership to new vault...");
    await router.transferOwnership(vaultAddr);
    console.log("✅ LendingRouter owned by vault");

    // ========== STEP 4: Transfer jUSDi token ownership to new vault ==========
    console.log("\nStep 4: Transferring jUSDi token ownership to new vault...");

    // We own the old vault which owns the token - need to transfer
    const OLD_VAULT = "0x0B03463259d5041004290822444c4183aE936050";

    // Check if old vault owns the token
    const jusdi = await hre.ethers.getContractAt(
        ["function owner() view returns (address)",
            "function transferOwnership(address) external"],
        JUSDI_TOKEN
    );

    const tokenOwner = await jusdi.owner();
    console.log("   Current jUSDi owner:", tokenOwner);

    if (tokenOwner.toLowerCase() === OLD_VAULT.toLowerCase()) {
        console.log("   ⚠️  Token is owned by old vault. Need to transfer from old vault.");
        console.log("   This requires calling: OldVault.transferTokenOwnership(newVault)");
        console.log("   But old vault may not have this function.");
        console.log("   MANUAL STEP: You may need to handle jUSDi ownership separately.");
    } else if (tokenOwner.toLowerCase() === deployer.address.toLowerCase()) {
        await jusdi.transferOwnership(vaultAddr);
        console.log("✅ jUSDi token owned by new vault");
    } else {
        console.log("   ⚠️  Cannot transfer - you don't own the token");
    }

    // ========== STEP 5: Verify decimals fix ==========
    console.log("\nStep 5: Verifying decimals fix...");
    const vaultContract = await hre.ethers.getContractAt(
        ["function decimals() view returns (uint8)",
            "function previewDeposit(uint256) view returns (uint256)"],
        vaultAddr
    );

    const decimals = await vaultContract.decimals();
    console.log("   Vault decimals:", decimals);

    const oneUSDC = hre.ethers.parseUnits("1", 6);
    const shares = await vaultContract.previewDeposit(oneUSDC);
    console.log("   1 USDC → shares:", hre.ethers.formatUnits(shares, 18), "jUSDi");

    // ========== SUMMARY ==========
    console.log("\n============================================");
    console.log("🎉 Deployment Complete!");
    console.log("============================================\n");
    console.log("New Contracts:");
    console.log("  JUSDiVault V2:", vaultAddr);
    console.log("  LendingRouter:", routerAddr);
    console.log("\nExisting Contracts:");
    console.log("  jUSDi Token:", JUSDI_TOKEN);
    console.log("  Old Vault (deprecated):", OLD_VAULT);

    console.log("\n⚠️  IMPORTANT NEXT STEPS:");
    console.log("1. Transfer jUSDi token ownership to new vault if needed");
    console.log("2. Update frontend config.ts with new vault address");
    console.log("3. Verify contracts on Basescan");
    console.log("4. Test deposit");

    // Save deployment info
    const fs = require('fs');
    const deployment = {
        timestamp: new Date().toISOString(),
        vaultV2: vaultAddr,
        lendingRouter: routerAddr,
        oldVault: OLD_VAULT,
        jusdiToken: JUSDI_TOKEN
    };
    fs.writeFileSync('deployment-vault-v2.json', JSON.stringify(deployment, null, 2));
    console.log("\n✅ Saved to deployment-vault-v2.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
