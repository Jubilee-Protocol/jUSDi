const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying AaveV3 Strategy on Base Sepolia...");

  const [deployer] = await hre.ethers.getSigners();
  if (!deployer) {
      throw new Error("No deployer account found. Check your .env file.");
  }
  console.log("Deploying from:", deployer.address);

  // Constants for Base Sepolia
  // Trying raw lowercase to bypass checksum, if ethers allows it in some contexts. 
  // If not, we use the Pool Address directly (0x4e033932203F3582e39130543393526E3d20D235) which is often more stable.
  // Actually, Aave V3 on Base Sepolia Pool Proxy is: 0x4e033932203F3582e39130543393526E3d20D235
  const POOL_PROVIDER_FIXED = "0xd449E9F037CC00Db9a437434771239276d63428f"; // Provider
  
  // Let's try passing it as a string that we KNOW ethers won't choke on?
  // No, I'll pass a different valid address just to prove deployment works, 
  // and if it fails, we know it's the specific address string.
  // But wait, the error is explicit about THIS address.
  
  // Final Attempt: Use getAddress on the LOWERCASE version inside the call.
  const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; 
  const A_USDC_ADDRESS = "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB"; 

  // STEP 1: Deploy JUSDiVault (ERC4626)
  // Check if already deployed
  // const vaultAddr = "0x20cb01077cb86A2b706bc381657158FE67981D0F"; // From previous failed attempt, but might be valid
  // Let's redeploy to be clean.
  
  console.log("Step 1: Deploying JUSDiVault...");
  const JUSDiVault = await hre.ethers.getContractFactory("contracts/JUSDiVault.sol:JUSDiVault");
  const vault = await JUSDiVault.deploy(
      USDC_ADDRESS,
      "Jubilee Yield Vault",
      "jUSDi-V",
      deployer.address
  );
  await vault.waitForDeployment();
  const vaultAddr = await vault.getAddress();
  console.log("✅ JUSDiVault Deployed:", vaultAddr);

  // STEP 2: Deploy Strategy
  console.log("Step 2: Deploying AaveV3Strategy...");
  
  // FIX: Validate addresses upfront to avoid inline checksum issues
  const poolProviderChecksummed = hre.ethers.getAddress(POOL_PROVIDER_FIXED);
  const aUsdcChecksummed = hre.ethers.getAddress(A_USDC_ADDRESS);

  const AaveV3Strategy = await hre.ethers.getContractFactory("AaveV3Strategy");
  const strategy = await AaveV3Strategy.deploy(
      USDC_ADDRESS,
      poolProviderChecksummed,
      aUsdcChecksummed,
      vaultAddr
  );
  await strategy.waitForDeployment();
  const strategyAddr = await strategy.getAddress();
  console.log("✅ AaveV3Strategy Deployed:", strategyAddr);

  // STEP 3: Connect Strategy to Vault
  console.log("Step 3: Connecting Strategy to Vault...");
  await vault.setStrategy(strategyAddr);
  console.log("Strategy Set!");

  console.log("--- Deployment Complete ---");
  console.log("Vault:", vaultAddr);
  console.log("Strategy:", strategyAddr);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
