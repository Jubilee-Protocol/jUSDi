import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { JUSDiVault, MockERC20, RiskScoring, EmergencyManager, StablecoinOracle, RebalancingEngine, LendingRouter } from "../typechain-types";

describe("JUSDiVault", function () {
    let vault: JUSDiVault;
    let usdc: MockERC20;
    let usdt: MockERC20;
    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let riskScoring: RiskScoring;
    let emergencyManager: EmergencyManager;
    let oracle: StablecoinOracle;
    let rebalancingEngine: RebalancingEngine;
    let lendingRouter: LendingRouter;

    beforeEach(async function () {
        [owner, user] = await ethers.getSigners();

        // Deploy Mocks
        const MockERC20Factory = await ethers.getContractFactory("MockERC20");
        usdc = await MockERC20Factory.deploy("USD Coin", "USDC", 6);
        usdt = await MockERC20Factory.deploy("Tether", "USDT", 6);

        const RiskScoringFactory = await ethers.getContractFactory("RiskScoring");
        riskScoring = await RiskScoringFactory.deploy(owner.address);

        const StablecoinOracleFactory = await ethers.getContractFactory("StablecoinOracle");
        oracle = await StablecoinOracleFactory.deploy(owner.address);

        const EmergencyManagerFactory = await ethers.getContractFactory("EmergencyManager");
        emergencyManager = await EmergencyManagerFactory.deploy(owner.address, await oracle.getAddress(), await riskScoring.getAddress());

        const RebalancingEngineFactory = await ethers.getContractFactory("RebalancingEngine");
        rebalancingEngine = await RebalancingEngineFactory.deploy(owner.address, await oracle.getAddress());

        const LendingRouterFactory = await ethers.getContractFactory("LendingRouter");
        const MockLendingFactory = await ethers.getContractFactory("MockLending");
        const mockAave = await MockLendingFactory.deploy();
        const mockMorpho = await MockLendingFactory.deploy();

        lendingRouter = await LendingRouterFactory.deploy(
            owner.address,
            await mockAave.getAddress(),
            await mockMorpho.getAddress()
        );

        const JUSDiVaultFactory = await ethers.getContractFactory("contracts/vaults/jUSDi/JUSDiVault.sol:JUSDiVault");
        vault = await JUSDiVaultFactory.deploy(
            await usdc.getAddress(),
            "Jubilee USD Index",
            "jUSDi",
            owner.address,
            await riskScoring.getAddress(),
            await emergencyManager.getAddress(),
            await oracle.getAddress(),
            await rebalancingEngine.getAddress(),
            await lendingRouter.getAddress()
        );

        await lendingRouter.transferOwnership(await vault.getAddress());

        // Setup Oracle
        await oracle.setPriceFeed(await usdc.getAddress(), await usdc.getAddress());
        // We override getPrice in MockERC20 to return $1.00
    });

    describe("Deposits", function () {
        it("Should allow user to deposit USDC", async function () {
            const amount = ethers.parseUnits("1000", 6);
            await usdc.mint(user.address, amount);
            await usdc.connect(user).approve(await vault.getAddress(), amount);

            await vault.connect(user).deposit(amount, user.address);

            // Vault defaults to 6 decimals for shares since USDC is 6 decimals.
            const expectedShares = amount;
            expect(await vault.balanceOf(user.address)).to.equal(expectedShares);
            expect(await vault.totalAssets()).to.equal(amount);
        });
    });

    describe("Withdrawals", function () {
        it("Should allow user to withdraw USDC", async function () {
            const amount = ethers.parseUnits("1000", 6);
            await usdc.mint(user.address, amount);
            await usdc.connect(user).approve(await vault.getAddress(), amount);
            await vault.connect(user).deposit(amount, user.address);

            await vault.connect(user).withdraw(amount, user.address, user.address);

            expect(await vault.balanceOf(user.address)).to.equal(0);
            expect(await usdc.balanceOf(user.address)).to.equal(amount);
        });
    });
});
