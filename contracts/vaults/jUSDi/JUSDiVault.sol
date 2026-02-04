// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./RiskScoring.sol";
import "./EmergencyManager.sol";
import "./StablecoinOracle.sol";
import "./RebalancingEngine.sol";
import "./LendingRouter.sol";
import "../../JUSDi.sol";

/**
 * @title JUSDiVault
 * @notice Jubilee USD Index Vault - ERC4626 compliant.
 * @dev Manages USDC, USDT, DAI, and USDS with automated risk-based rebalancing and yield optimization.
 */
contract JUSDiVault is ERC4626, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // --- Components ---
    /// @notice Risk scoring component for asset allocation
    RiskScoring public riskScoring;
    /// @notice Emergency manager for circuit breakers and pauses
    EmergencyManager public emergencyManager;
    /// @notice Price oracle for stablecoins
    StablecoinOracle public oracle;
    /// @notice Engine for executing swaps during rebalancing
    address public rebalancingEngine;
    /// @notice Router for yield protocols (Aave/Morpho)
    address public lendingRouter;

    // --- Token Separation ---
    JUSDi public immutable jusdiToken;

    // --- Accounting ---
    /// @notice Internally tracked balances to prevent donation attacks
    mapping(address => uint256) private _managedBalances;
    /// @notice Internally tracked invested balances to separate yield
    mapping(address => uint256) private _investedBalances;
    /// @notice Targeted liquid buffer in BPS (e.g. 1000 = 10%)
    uint256 public liquidBufferBps = 1000;

    // --- Assets & Weights ---
    address[] public underlyingStables;
    mapping(address => bool) public isSupported;

    // --- Constants ---
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant TARGET_PRICE_STABILITY = 1e8; // $1.00

    // --- Events ---
    event AssetAdded(address indexed asset);
    event Rebalanced(uint256 timestamp);
    event EmergencyFlightExecuted(address indexed riskyAsset, uint256 amount);

    constructor(
        IERC20 _baseAsset,
        address _jusdiToken,
        address _owner,
        address _riskScoring,
        address _emergencyManager,
        address _oracle,
        address _rebalancingEngine,
        address _lendingRouter
    )
        ERC4626(_baseAsset)
        ERC20("Jubilee USD Index Vault", "vJUSDi")
        Ownable(_owner)
    {
        jusdiToken = JUSDi(_jusdiToken);
        riskScoring = RiskScoring(_riskScoring);
        emergencyManager = EmergencyManager(_emergencyManager);
        oracle = StablecoinOracle(_oracle);
        rebalancingEngine = _rebalancingEngine;
        lendingRouter = _lendingRouter;

        // Add base asset (e.g., USDC) as first supported asset
        _addAsset(address(_baseAsset));
    }

    // --- Admin Functions ---

    /**
     * @notice Adds a new stablecoin to the vault.
     * @param asset The address of the stablecoin to add.
     */
    function addAsset(address asset) external onlyOwner {
        _addAsset(asset);
    }

    /**
     * @notice Updates the core protocol components.
     * @param _riskScoring New RiskScoring address.
     * @param _emergencyManager New EmergencyManager address.
     * @param _oracle New StablecoinOracle address.
     * @param _rebalancingEngine New RebalancingEngine address.
     * @param _lendingRouter New LendingRouter address.
     */
    function updateComponents(
        address _riskScoring,
        address _emergencyManager,
        address _oracle,
        address _rebalancingEngine,
        address _lendingRouter
    ) external onlyOwner {
        if (_riskScoring != address(0)) riskScoring = RiskScoring(_riskScoring);
        if (_emergencyManager != address(0))
            emergencyManager = EmergencyManager(_emergencyManager);
        if (_oracle != address(0)) oracle = StablecoinOracle(_oracle);
        if (_rebalancingEngine != address(0))
            rebalancingEngine = _rebalancingEngine;
        if (_lendingRouter != address(0)) lendingRouter = _lendingRouter;
    }

    function _addAsset(address asset) internal {
        require(!isSupported[asset], "Already supported");
        underlyingStables.push(asset);
        isSupported[asset] = true;
        emit AssetAdded(asset);
    }

    // --- Core Logic ---

    /**
     * @notice Returns the total value of all underlying assets in terms of the base asset.
     */
    function totalAssets() public view override returns (uint256) {
        uint256 totalVal = 0;
        address baseAsset = asset();
        uint8 baseDecimals = IERC20Metadata(baseAsset).decimals();

        for (uint256 i = 0; i < underlyingStables.length; i++) {
            address stable = underlyingStables[i];

            // 1. Principal (Liquid + Invested Principal)
            // We use _managedBalances as the source of truth for Principal.
            // This ignores direct donations to the vault (liquid donations).
            uint256 principal = _managedBalances[stable];

            // 2. Yield
            uint256 yield = 0;
            if (lendingRouter != address(0)) {
                // Check Aave/Morpho balance (Principal + Yield)
                try
                    LendingRouter(lendingRouter).getBalance(
                        address(lendingRouter),
                        stable,
                        false
                    )
                returns (uint256 investedTotal) {
                    uint256 investedPrincipal = _investedBalances[stable];
                    if (investedTotal > investedPrincipal) {
                        yield = investedTotal - investedPrincipal;
                    }
                } catch {}
            }

            uint256 totalAssetBalance = principal + yield;

            if (totalAssetBalance > 0) {
                if (stable == baseAsset) {
                    totalVal += totalAssetBalance;
                } else {
                    uint256 price = oracle.getPrice(stable); // 8 decimals
                    uint256 basePrice = oracle.getPrice(baseAsset); // 8 decimals
                    uint8 stableDecimals = IERC20Metadata(stable).decimals();

                    uint256 normalizedBalance;
                    if (baseDecimals >= stableDecimals) {
                        normalizedBalance =
                            totalAssetBalance *
                            (10 ** (baseDecimals - stableDecimals));
                    } else {
                        normalizedBalance =
                            totalAssetBalance /
                            (10 ** (stableDecimals - baseDecimals));
                    }

                    totalVal += (normalizedBalance * price) / basePrice;
                }
            }
        }
        return totalVal;
    }

    // --- External Token Overrides ---

    function decimals() public view override(ERC4626) returns (uint8) {
        return jusdiToken.decimals();
    }

    function totalSupply()
        public
        view
        override(ERC20, IERC20)
        returns (uint256)
    {
        return jusdiToken.totalSupply();
    }

    function balanceOf(
        address account
    ) public view override(ERC20, IERC20) returns (uint256) {
        return jusdiToken.balanceOf(account);
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20) {
        if (from == address(0)) {
            jusdiToken.mint(to, value);
        } else if (to == address(0)) {
            jusdiToken.burn(from, value);
        } else {
            revert(
                "JUSDiVault: Transfers via Vault not supported. Interact with Token directly."
            );
        }
    }

    /**
     * @notice Returns the amount of managed balance for a specific asset.
     */
    function managedBalanceOf(address asset) external view returns (uint256) {
        return _managedBalances[asset];
    }

    /**
     * @notice Deposit base asset into the vault.
     */
    function deposit(
        uint256 assets,
        address receiver
    ) public override returns (uint256) {
        require(!emergencyManager.isPaused(), "Vault paused");

        // Before deposit, record balance diff
        uint256 shares = super.deposit(assets, receiver);

        // Update accounting
        address baseAsset = asset();
        _managedBalances[baseAsset] += assets;

        // Auto-yield: Move excess to LendingRouter (maintaining liquid buffer)
        uint256 total = totalAssets();
        uint256 targetBuffer = (total * liquidBufferBps) / BPS_DENOMINATOR;
        uint256 currentLiquid = IERC20(baseAsset).balanceOf(address(this));

        if (currentLiquid > targetBuffer) {
            uint256 toSupply = currentLiquid - targetBuffer;
            IERC20(baseAsset).safeIncreaseAllowance(lendingRouter, toSupply);
            LendingRouter(lendingRouter).supply(baseAsset, toSupply, false);
            _investedBalances[baseAsset] += toSupply;
        }

        return shares;
    }

    /**
     * @notice Withdraw base asset from the vault.
     */
    function withdraw(
        uint256 assets,
        address receiver,
        address owner
    ) public override returns (uint256) {
        address baseAsset = asset();
        uint256 currentLiquid = IERC20(baseAsset).balanceOf(address(this));

        uint256 shortage = 0;
        uint256 yieldUsed = 0;

        // 1. Pull from yield if liquid buffer is insufficient
        if (currentLiquid < assets) {
            shortage = assets - currentLiquid;
            // SECURITY: Handle illiquid yield protocols gracefully
            try
                LendingRouter(lendingRouter).withdraw(
                    baseAsset,
                    shortage,
                    address(this),
                    false
                )
            {
                // Update invested principal tracking
                uint256 investedPrincipal = _investedBalances[baseAsset];
                if (shortage >= investedPrincipal) {
                    _investedBalances[baseAsset] = 0;
                    yieldUsed = shortage - investedPrincipal;
                } else {
                    _investedBalances[baseAsset] -= shortage;
                    yieldUsed = 0;
                }
            } catch {
                // If Aave/Morpho fails, we can only withdraw what we have liquidly
                if (currentLiquid == 0) revert("Yield protocol illiquid");
                assets = currentLiquid;
                shortage = 0;
                yieldUsed = 0;
            }
        }

        // 2. Perform withdrawal
        uint256 shares = super.withdraw(assets, receiver, owner);

        // 3. Update accounting
        // _managedBalances tracks Principal. Decrease by AmountCoveredByPrincipal
        // AmountCoveredByPrincipal = Assets - YieldUsed
        if (assets >= yieldUsed) {
            _managedBalances[baseAsset] -= (assets - yieldUsed);
        } else {
            // Should be impossible if logic is correct (yieldUsed is part of assets)
            _managedBalances[baseAsset] = 0;
        }

        return shares;
    }

    /**
     * @notice Rebalances a specific asset back to base asset with custom slippage.
     * @param stable The asset to rebalance.
     * @param minOut The minimum amount of base asset to receive.
     */
    function rebalance(address stable, uint256 minOut) external nonReentrant {
        require(isSupported[stable], "Unsupported asset");
        uint256 total = totalAssets();
        require(total > 0, "Vault empty");

        // 1. Emergency Circuit Breaker
        if (emergencyManager.checkCircuitBreaker(stable)) {
            _emergencyFlightToQuality(stable, minOut);
            return;
        }

        // 2. Allocation Check
        uint256 maxAllocBps = riskScoring.getMaxAllocation(stable);
        uint256 currentBalance = _managedBalances[stable];
        // Note: For rebalancing, we only swap what is liquidly in the vault.
        // If funds are in yield, they must be withdrawn first (manual/auto).

        uint256 usdVal = _getUsdValue(stable, currentBalance);
        uint256 currentAllocBps = (usdVal * BPS_DENOMINATOR) / total;

        if (currentAllocBps > maxAllocBps && stable != asset()) {
            uint256 excessBps = currentAllocBps - maxAllocBps;
            uint256 amountToSwap = (currentBalance * excessBps) /
                currentAllocBps;
            if (amountToSwap > 0) {
                _swapToQuality(stable, amountToSwap, minOut);
            }
        }
        emit Rebalanced(block.timestamp);
    }

    /**
     * @notice Rebalances the vault based on risk scores (default slippage).
     */
    function rebalance() external nonReentrant {
        uint256 total = totalAssets();
        if (total == 0) return;

        for (uint256 i = 0; i < underlyingStables.length; i++) {
            address stable = underlyingStables[i];

            // Allocation Check
            uint256 currentBalance = _managedBalances[stable];
            if (currentBalance == 0) continue;

            if (emergencyManager.checkCircuitBreaker(stable)) {
                _emergencyFlightToQuality(stable, 0);
                continue;
            }

            uint256 maxAllocBps = riskScoring.getMaxAllocation(stable);
            uint256 usdVal = _getUsdValue(stable, currentBalance);
            uint256 currentAllocBps = (usdVal * BPS_DENOMINATOR) / total;

            if (currentAllocBps > maxAllocBps && stable != asset()) {
                uint256 excessBps = currentAllocBps - maxAllocBps;
                uint256 amountToSwap = (currentBalance * excessBps) /
                    currentAllocBps;
                if (amountToSwap > 0) {
                    _swapToQuality(stable, amountToSwap, 0);
                }
            }
        }
        emit Rebalanced(block.timestamp);
    }

    function _getUsdValue(
        address stable,
        uint256 amount
    ) internal view returns (uint256) {
        address baseAsset = asset();
        uint8 baseDecs = IERC20Metadata(baseAsset).decimals();
        uint8 stableDecs = IERC20Metadata(stable).decimals();
        uint256 normalizedVal;

        if (baseDecs >= stableDecs) {
            normalizedVal = amount * (10 ** (baseDecs - stableDecs));
        } else {
            normalizedVal = amount / (10 ** (stableDecs - baseDecs));
        }

        uint256 price = oracle.getPrice(stable);
        uint256 basePrice = oracle.getPrice(baseAsset);
        return (normalizedVal * price) / basePrice;
    }

    function _swapToQuality(
        address assetFrom,
        uint256 amount,
        uint256 minOutOverride
    ) internal {
        address baseAsset = asset();
        IERC20(assetFrom).safeIncreaseAllowance(rebalancingEngine, amount);

        uint256 minOut = minOutOverride;
        if (minOut == 0) {
            uint256 expectedOut = _getUsdValue(assetFrom, amount);
            minOut = (expectedOut * 99) / 100; // 1% default
        }

        uint256 received = RebalancingEngine(rebalancingEngine).swap(
            assetFrom,
            baseAsset,
            amount,
            minOut
        );

        // Update accounting
        _managedBalances[assetFrom] -= amount;
        _managedBalances[baseAsset] += received;
    }

    function _emergencyFlightToQuality(
        address riskyAsset,
        uint256 minOutOverride
    ) internal {
        uint256 balance = _managedBalances[riskyAsset];
        address baseAsset = asset();

        if (balance > 0 && riskyAsset != baseAsset) {
            IERC20(riskyAsset).safeIncreaseAllowance(
                rebalancingEngine,
                balance
            );

            uint256 minOut = minOutOverride;
            if (minOut == 0) {
                uint256 expectedOut = _getUsdValue(riskyAsset, balance);
                minOut = (expectedOut * 95) / 100; // 5% default for emergency
            }

            uint256 received = RebalancingEngine(rebalancingEngine).swap(
                riskyAsset,
                baseAsset,
                balance,
                minOut
            );

            // Update accounting
            _managedBalances[riskyAsset] -= balance;
            _managedBalances[baseAsset] += received;

            emit EmergencyFlightExecuted(riskyAsset, balance);
        }
    }

    // --- Yield Integration ---

    // External routing for Aave/Compound managed by admin/keeper
    function depositToYield(address asset, uint256 amount) external onlyOwner {
        // Implementation will call LendingRouter
    }
}
