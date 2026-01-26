import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import {
    JUSDiVault, MockERC20, RiskScoring, EmergencyManager,
    StablecoinOracle, RebalancingEngine, LendingRouter,
    MockChainlinkAggregator, MockLending, MockCurvePool
} from "../typechain-types";

describe("jUSDi Final Production Audit & Stress Test", function () {
    let vault: JUSDiVault;
    let usdc: MockERC20;
    let usdt: MockERC20;
    let owner: SignerWithAddress;
    let user: SignerWithAddress;
    let attacker: SignerWithAddress;
    let riskScoring: RiskScoring;
    let emergencyManager: EmergencyManager;
    let oracle: StablecoinOracle;
    let rebalancingEngine: RebalancingEngine;
    let lendingRouter: LendingRouter;
    let mockAave: MockLending;
    let mockMorpho: MockLending;
    let usdcOracle: MockChainlinkAggregator;
    let usdtOracle: MockChainlinkAggregator;

    beforeEach(async function () {
        [owner, user, attacker] = await ethers.getSigners();

        // 1. Deploy Mocks
        const MockERC20Factory = await ethers.getContractFactory("MockERC20");
        usdc = await MockERC20Factory.deploy("USD Coin", "USDC", 6);
        usdt = await MockERC20Factory.deploy("Tether", "USDT", 6);

        const AggregatorFactory = await ethers.getContractFactory("MockChainlinkAggregator");
        usdcOracle = await AggregatorFactory.deploy(ethers.parseUnits("1", 8), 8); // $1.00
        usdtOracle = await AggregatorFactory.deploy(ethers.parseUnits("1", 8), 8); // $1.00

        const RiskScoringFactory = await ethers.getContractFactory("RiskScoring");
        riskScoring = await RiskScoringFactory.deploy(owner.address);

        const StablecoinOracleFactory = await ethers.getContractFactory("StablecoinOracle");
        oracle = await StablecoinOracleFactory.deploy(owner.address);

        const EmergencyManagerFactory = await ethers.getContractFactory("EmergencyManager");
        emergencyManager = await EmergencyManagerFactory.deploy(owner.address, await oracle.getAddress(), await riskScoring.getAddress());

        const RebalancingEngineFactory = await ethers.getContractFactory("RebalancingEngine");
        rebalancingEngine = await RebalancingEngineFactory.deploy(owner.address, await oracle.getAddress());

        const MockLendingFactory = await ethers.getContractFactory("MockLending");
        mockAave = await MockLendingFactory.deploy();
        mockMorpho = await MockLendingFactory.deploy();

        const LendingRouterFactory = await ethers.getContractFactory("LendingRouter");
        lendingRouter = await LendingRouterFactory.deploy(owner.address, await mockAave.getAddress(), await mockMorpho.getAddress());

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

        // 2. Setup Relationships
        await lendingRouter.transferOwnership(await vault.getAddress());
        await oracle.setPriceFeed(await usdc.getAddress(), await usdcOracle.getAddress());
        await oracle.setPriceFeed(await usdt.getAddress(), await usdtOracle.getAddress());

        await riskScoring.updateScore(await usdc.getAddress(), 100, 100, 100);
        await riskScoring.updateScore(await usdt.getAddress(), 100, 100, 100);

        await vault.addAsset(await usdt.getAddress());
    });

    describe("Audit: Internal Accounting & Donation Immunity", function () {
        it("SUM: totalAssets should ignore direct token donations", async function () {
            const amount = ethers.parseUnits("1000", 6);
            await usdc.mint(user.address, amount);
            await usdc.connect(user).approve(await vault.getAddress(), amount);
            await vault.connect(user).deposit(amount, user.address);

            // Donate 5000 USDT (Attacker thinks they can pump share price)
            const donation = ethers.parseUnits("5000", 6);
            await usdt.mint(attacker.address, donation);
            await usdt.connect(attacker).transfer(await vault.getAddress(), donation);

            // Total Assets must remain 1000 ($1000)
            expect(await vault.totalAssets()).to.equal(amount);

            // Share price should still be 1:1
            expect(await vault.convertToAssets(ethers.parseUnits("1", 6))).to.equal(ethers.parseUnits("1", 6));
        });
    });

    describe("Audit: Yield Illiquidity Resilience", function () {
        it("BANK RUN: Vault allows withdrawal from liquid buffer when Aave is down", async function () {
            const amount = ethers.parseUnits("1000", 6);
            await usdc.mint(user.address, amount);
            await usdc.connect(user).approve(await vault.getAddress(), amount);
            await vault.connect(user).deposit(amount, user.address);

            // Liquid buffer target is 10% (100 USDC).
            // Aave should have 900 USDC.
            expect(await usdc.balanceOf(await mockAave.getAddress())).to.equal(ethers.parseUnits("900", 6));

            // CRASH AAVE
            const aaveBalance = await usdc.balanceOf(await mockAave.getAddress());
            await mockAave.drain(await usdc.getAddress(), aaveBalance);

            // Try to withdraw 50 USDC (within liquid buffer)
            const withdrawAmount = ethers.parseUnits("50", 6);
            await vault.connect(user).withdraw(withdrawAmount, user.address, user.address);

            expect(await usdc.balanceOf(user.address)).to.equal(withdrawAmount);

            // Try to withdraw 1000 USDC (should fail or return only liquid)
            // Current code reverts if currentLiquid == 0, or reduces assets to currentLiquid
            // In our case, liquid was 100. We withdrew 50. 50 left.
            const bigWithdraw = ethers.parseUnits("500", 6);
            // This should successfully withdraw only the remaining 50
            await vault.connect(user).withdraw(bigWithdraw, user.address, user.address);
            expect(await usdc.balanceOf(user.address)).to.equal(ethers.parseUnits("100", 6)); // Total 50+50
        });
    });

    describe("Audit: Rebalancing Edge Cases", function () {
        it("DOS: Rebalance should not revert if tokens were donated", async function () {
            const amount = ethers.parseUnits("1000", 6);
            await usdc.mint(user.address, amount);
            await usdc.connect(user).approve(await vault.getAddress(), amount);
            await vault.connect(user).deposit(amount, user.address);

            // Donate USDT to make it "excessive"
            const donation = ethers.parseUnits("5000", 6);
            await usdt.mint(attacker.address, donation);
            await usdt.connect(attacker).transfer(await vault.getAddress(), donation);

            // Trigger rebalance. Previously this would try to swap 'donation' and underflow _managedBalances.
            // Now it should ignore the donation because currentBalance = _managedBalances[usdt] = 0.
            await expect(vault.rebalance()).to.not.be.reverted;
        });
    });
});
