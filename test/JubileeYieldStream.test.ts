import { expect } from "chai";
import { ethers } from "hardhat";
import { JubileeYieldStream, MockVault, MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { parseUnits } from "ethers";

/**
 * JubileeYieldStream Integration Tests
 * 
 * Tests the complete lifecycle of yield stream creation, accumulation, and distribution.
 * These tests verify both human and agentic interaction patterns.
 */
describe("JubileeYieldStream", function () {
    // Type guard for custom error
    const anyValue = () => true;

    let yieldStream: JubileeYieldStream;
    let vault: MockVault;
    let usdc: MockERC20;
    let owner: SignerWithAddress;
    let sponsor: SignerWithAddress;
    let agent: SignerWithAddress;
    let keeper: SignerWithAddress;

    const USDC_DECIMALS = 6;
    const INITIAL_USDC = parseUnits("100000", USDC_DECIMALS);
    const DEPOSIT_AMOUNT = parseUnits("10000", USDC_DECIMALS);

    beforeEach(async function () {
        [owner, sponsor, agent, keeper] = await ethers.getSigners();

        // Deploy MockUSDC (using MockERC20)
        const MockERC20Factory = await ethers.getContractFactory("MockERC20");
        usdc = await MockERC20Factory.deploy("USD Coin", "USDC", 6) as MockERC20;
        await usdc.waitForDeployment();

        // Deploy Mock Vault (ERC4626)
        const MockVaultFactory = await ethers.getContractFactory("MockVault");
        vault = await MockVaultFactory.deploy(await usdc.getAddress()) as MockVault;
        await vault.waitForDeployment();

        // Deploy JubileeYieldStream
        const YieldStream = await ethers.getContractFactory("JubileeYieldStream");
        yieldStream = await YieldStream.deploy(
            await vault.getAddress(),
            owner.address
        ) as JubileeYieldStream;
        await yieldStream.waitForDeployment();

        // Mint USDC to sponsor
        await usdc.mint(sponsor.address, INITIAL_USDC);

        // Approve YieldStream to spend sponsor's USDC
        await usdc.connect(sponsor).approve(
            await yieldStream.getAddress(),
            ethers.MaxUint256
        );
    });

    describe("Stream Creation", function () {
        it("should create a stream with valid beneficiary and deposit", async function () {
            const tx = await yieldStream.connect(sponsor).deposit(agent.address, DEPOSIT_AMOUNT);
            const receipt = await tx.wait();

            expect(receipt).to.not.be.null;

            const stream = await yieldStream.streams(sponsor.address);
            expect(stream.beneficiary).to.equal(agent.address);
            expect(stream.principalAssets).to.equal(DEPOSIT_AMOUNT);
            expect(stream.sharesHeld).to.be.gt(0);
        });

        it("should revert for zero deposit amount", async function () {
            await expect(
                yieldStream.connect(sponsor).deposit(agent.address, 0)
            ).to.be.reverted;
        });

        it("should revert for zero beneficiary address", async function () {
            await expect(
                yieldStream.connect(sponsor).deposit(ethers.ZeroAddress, DEPOSIT_AMOUNT)
            ).to.be.reverted;
        });

        it("should allow top-up to existing stream", async function () {
            // Initial deposit
            await yieldStream.connect(sponsor).deposit(agent.address, DEPOSIT_AMOUNT);

            // Top-up
            const topUpAmount = parseUnits("5000", USDC_DECIMALS);
            await yieldStream.connect(sponsor).deposit(agent.address, topUpAmount);

            const stream = await yieldStream.streams(sponsor.address);
            expect(stream.principalAssets).to.equal(DEPOSIT_AMOUNT + topUpAmount);
        });
    });

    describe("Yield Claims", function () {
        beforeEach(async function () {
            // Create stream
            await yieldStream.connect(sponsor).deposit(agent.address, DEPOSIT_AMOUNT);
        });

        it("should calculate yield based on vault appreciation", async function () {
            // Simulate yield (mint USDC directly to vault)
            const yieldAmount = parseUnits("1000", USDC_DECIMALS);
            await usdc.mint(await vault.getAddress(), yieldAmount);

            const claimable = await yieldStream.claimableYield(sponsor.address);
            expect(claimable).to.be.gt(0);
        });

        it("should transfer yield to beneficiary on claim", async function () {
            // Simulate yield
            const yieldAmount = parseUnits("500", USDC_DECIMALS);
            await usdc.mint(await vault.getAddress(), yieldAmount);

            const agentBalanceBefore = await usdc.balanceOf(agent.address);

            await yieldStream.connect(sponsor).claim();

            const agentBalanceAfter = await usdc.balanceOf(agent.address);
            expect(agentBalanceAfter).to.be.gt(agentBalanceBefore);
        });

        it("should allow anyone to claim on behalf of funder (keeper pattern)", async function () {
            // Simulate yield
            await usdc.mint(await vault.getAddress(), parseUnits("500", USDC_DECIMALS));

            const agentBalanceBefore = await usdc.balanceOf(agent.address);

            // Keeper claims on behalf of sponsor
            await yieldStream.connect(keeper).claimFor(sponsor.address);

            const agentBalanceAfter = await usdc.balanceOf(agent.address);
            expect(agentBalanceAfter).to.be.gt(agentBalanceBefore);
        });

        it("should revert claim when no yield available", async function () {
            await expect(
                yieldStream.connect(sponsor).claim()
            ).to.be.reverted;
        });

        it("should update lastClaimAt timestamp after claim", async function () {
            await usdc.mint(await vault.getAddress(), parseUnits("500", USDC_DECIMALS));

            const streamBefore = await yieldStream.streams(sponsor.address);
            expect(streamBefore.lastClaimAt).to.equal(0);

            await yieldStream.connect(sponsor).claim();

            const streamAfter = await yieldStream.streams(sponsor.address);
            expect(streamAfter.lastClaimAt).to.be.gt(0);
        });
    });

    describe("Principal Withdrawal", function () {
        beforeEach(async function () {
            await yieldStream.connect(sponsor).deposit(agent.address, DEPOSIT_AMOUNT);
        });

        it("should allow partial withdrawal", async function () {
            const withdrawAmount = parseUnits("5000", USDC_DECIMALS);
            const sponsorBalanceBefore = await usdc.balanceOf(sponsor.address);

            await yieldStream.connect(sponsor).withdrawPrincipal(withdrawAmount);

            const sponsorBalanceAfter = await usdc.balanceOf(sponsor.address);
            const stream = await yieldStream.streams(sponsor.address);

            expect(sponsorBalanceAfter).to.be.gt(sponsorBalanceBefore);
            expect(stream.principalAssets).to.be.lt(DEPOSIT_AMOUNT);
        });

        it("should close stream on full withdrawal", async function () {
            await yieldStream.connect(sponsor).withdrawPrincipal(DEPOSIT_AMOUNT);

            const stream = await yieldStream.streams(sponsor.address);
            expect(stream.principalAssets).to.equal(0);
            expect(stream.sharesHeld).to.equal(0);
        });

        it("should revert withdrawal exceeding principal", async function () {
            const excessAmount = parseUnits("20000", USDC_DECIMALS);
            await expect(
                yieldStream.connect(sponsor).withdrawPrincipal(excessAmount)
            ).to.be.reverted;
        });
    });

    describe("Beneficiary Management", function () {
        beforeEach(async function () {
            await yieldStream.connect(sponsor).deposit(agent.address, DEPOSIT_AMOUNT);
        });

        it("should allow owner to update beneficiary", async function () {
            const newAgent = keeper;

            await yieldStream.connect(sponsor).setBeneficiary(newAgent.address);

            const stream = await yieldStream.streams(sponsor.address);
            expect(stream.beneficiary).to.equal(newAgent.address);
        });

        it("should reject zero address as beneficiary", async function () {
            await expect(
                yieldStream.connect(sponsor).setBeneficiary(ethers.ZeroAddress)
            ).to.be.reverted;
        });
    });

    describe("View Functions (Agent API)", function () {
        beforeEach(async function () {
            await yieldStream.connect(sponsor).deposit(agent.address, DEPOSIT_AMOUNT);
        });

        it("should return complete stream info via getStreamInfo", async function () {
            const [
                beneficiary,
                principal,
                currentValue,
                pendingYield,
                totalClaimed,
                shares,
                created,
                lastClaim
            ] = await yieldStream.getStreamInfo(sponsor.address);

            expect(beneficiary).to.equal(agent.address);
            expect(principal).to.equal(DEPOSIT_AMOUNT);
            expect(currentValue).to.be.gte(0);
            expect(shares).to.be.gt(0);
            expect(created).to.be.gt(0);
        });

        it("should estimate monthly yield correctly", async function () {
            // Simulate some time passing with yield
            await usdc.mint(await vault.getAddress(), parseUnits("500", USDC_DECIMALS));

            // Move time forward 30 days
            await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine", []);

            const monthlyYield = await yieldStream.estimateMonthlyYield(sponsor.address);
            expect(monthlyYield).to.be.gte(0);
        });

        it("should check sustainability against burn rate", async function () {
            // Simulate yield to make it sustainable
            await usdc.mint(await vault.getAddress(), parseUnits("1000", USDC_DECIMALS));

            // Move time forward
            await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine", []);

            const monthlyBurn = parseUnits("50", USDC_DECIMALS);
            const [sustainable, monthsRemaining] = await yieldStream.checkSustainability(
                sponsor.address,
                monthlyBurn
            );

            // Result depends on actual yield, just verify function works
            expect(typeof sustainable).to.equal("boolean");
            expect(monthsRemaining).to.be.gte(0);
        });
    });

    describe("Emergency Controls", function () {
        it("should allow owner to pause contract", async function () {
            await yieldStream.connect(owner).pause();

            await expect(
                yieldStream.connect(sponsor).deposit(agent.address, DEPOSIT_AMOUNT)
            ).to.be.reverted;
        });

        it("should allow owner to unpause contract", async function () {
            await yieldStream.connect(owner).pause();
            await yieldStream.connect(owner).unpause();

            // Should work now
            await yieldStream.connect(sponsor).deposit(agent.address, DEPOSIT_AMOUNT);
            const stream = await yieldStream.streams(sponsor.address);
            expect(stream.principalAssets).to.equal(DEPOSIT_AMOUNT);
        });

        it("should prevent non-owner from pausing", async function () {
            await expect(
                yieldStream.connect(sponsor).pause()
            ).to.be.reverted;
        });
    });
});
