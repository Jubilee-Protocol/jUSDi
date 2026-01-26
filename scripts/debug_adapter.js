const hre = require("hardhat");

async function main() {
    const LENDING_ROUTER = '0x79695d252C9abC36949F675615f3dcc602B97CE5';
    const ADAPTER = '0xE3a564Ed7Ff686319BD618aA1c72dCdf5E3e5624';

    const router = await hre.ethers.getContractAt('contracts/vaults/jUSDi/LendingRouter.sol:LendingRouter', LENDING_ROUTER);
    const adapter = await hre.ethers.getContractAt('LendingRouterAdapter', ADAPTER);

    console.log("=== LendingRouter ===");
    console.log("Owner:", await router.owner());
    console.log("Aave Pool:", await router.aavePool());
    console.log("Morpho:", await router.morpho());

    console.log("\n=== Adapter ===");
    console.log("Asset:", await adapter.asset());
    console.log("Vault:", await adapter.vault());
    console.log("LendingRouter:", await adapter.lendingRouter());
    console.log("useMorpho:", await adapter.useMorpho());
    console.log("totalAssets:", await adapter.totalAssets());
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
