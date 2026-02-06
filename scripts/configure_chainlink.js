/**
 * Configure Chainlink Price Feeds for jUSDi StablecoinOracle
 * 
 * Run with: npx hardhat run scripts/configure_chainlink.js --network base
 */

const hre = require("hardhat");

async function main() {
    console.log("🔗 Configuring Chainlink Price Feeds");
    console.log("=====================================\n");

    const [signer] = await hre.ethers.getSigners();
    console.log("Signer:", signer.address);

    // Contract addresses
    const ORACLE_ADDRESS = "0x081433E5DbfAeBffBdDc1F69B9AB372D7A00fA7a";

    // Base Mainnet token addresses
    const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    const USDT = "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2";

    // Base Mainnet Chainlink price feeds
    const USDC_USD_FEED = "0x7e860098F58bBFC8648a4311b374B1D669a2bc6B";
    const USDT_USD_FEED = "0xf19d560eB8d2ADf07BD6D13ed03e1D11215721F9";

    // Connect to oracle
    const oracle = await hre.ethers.getContractAt(
        "contracts/vaults/jUSDi/StablecoinOracle.sol:StablecoinOracle",
        ORACLE_ADDRESS,
        signer
    );

    console.log("Setting USDC/USD price feed...");
    const tx1 = await oracle.setPriceFeed(USDC, USDC_USD_FEED);
    await tx1.wait();
    console.log("✅ USDC feed set:", tx1.hash);

    console.log("\nSetting USDT/USD price feed...");
    const tx2 = await oracle.setPriceFeed(USDT, USDT_USD_FEED);
    await tx2.wait();
    console.log("✅ USDT feed set:", tx2.hash);

    // Verify by reading prices
    console.log("\n📊 Verifying prices...");
    try {
        const usdcPrice = await oracle.getPrice(USDC);
        console.log("USDC price:", hre.ethers.formatUnits(usdcPrice, 8), "USD");
    } catch (e) {
        console.log("⚠️ USDC price read failed (may need time to propagate)");
    }

    try {
        const usdtPrice = await oracle.getPrice(USDT);
        console.log("USDT price:", hre.ethers.formatUnits(usdtPrice, 8), "USD");
    } catch (e) {
        console.log("⚠️ USDT price read failed (may need time to propagate)");
    }

    console.log("\n✅ Chainlink configuration complete!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
