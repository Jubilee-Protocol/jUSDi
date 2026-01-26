import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
    const configName = process.env.NETWORK_CONFIG || network.name;
    const configPath = path.join(__dirname, "../../configs", `${configName}.json`);

    if (!fs.existsSync(configPath)) {
        console.error(`Config not found at ${configPath}. Use NETWORK_CONFIG environment variable.`);
        process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    console.log(`Deploying jUSDi to ${config.name}...`);

    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // 1. Deploy RiskScoring
    const RiskScoring = await ethers.getContractFactory("RiskScoring");
    const riskScoring = await RiskScoring.deploy(deployer.address);
    await riskScoring.waitForDeployment();
    console.log("RiskScoring deployed to:", await riskScoring.getAddress());

    // 2. Deploy StablecoinOracle (In a real deploy, many feeds would already exist)
    const StablecoinOracle = await ethers.getContractFactory("StablecoinOracle");
    const oracle = await StablecoinOracle.deploy(deployer.address);
    await oracle.waitForDeployment();
    console.log("StablecoinOracle deployed to:", await oracle.getAddress());

    // 3. Deploy EmergencyManager
    const EmergencyManager = await ethers.getContractFactory("EmergencyManager");
    const emergencyManager = await EmergencyManager.deploy(
        deployer.address,
        await oracle.getAddress(),
        await riskScoring.getAddress()
    );
    await emergencyManager.waitForDeployment();
    console.log("EmergencyManager deployed to:", await emergencyManager.getAddress());

    // 4. Deploy RebalancingEngine
    const RebalancingEngine = await ethers.getContractFactory("RebalancingEngine");
    const rebalancingEngine = await RebalancingEngine.deploy(deployer.address);
    await rebalancingEngine.waitForDeployment();
    console.log("RebalancingEngine deployed to:", await rebalancingEngine.getAddress());

    // 5. Deploy LendingRouter
    const LendingRouter = await ethers.getContractFactory("LendingRouter");
    const lendingRouter = await LendingRouter.deploy(
        deployer.address,
        config.protocols.aaveV3Pool
    );
    await lendingRouter.waitForDeployment();
    console.log("LendingRouter deployed to:", await lendingRouter.getAddress());

    // 6. Deploy JUSDiVault
    const JUSDiVault = await ethers.getContractFactory("JUSDiVault");
    const vault = await JUSDiVault.deploy(
        config.tokens.USDC,
        "Jubilee USD Index",
        "jUSDi",
        deployer.address,
        await riskScoring.getAddress(),
        await emergencyManager.getAddress(),
        await oracle.getAddress(),
        await rebalancingEngine.getAddress(),
        await lendingRouter.getAddress()
    );
    await vault.waitForDeployment();
    console.log("JUSDiVault deployed to:", await vault.getAddress());

    console.log("Deployment complete!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
