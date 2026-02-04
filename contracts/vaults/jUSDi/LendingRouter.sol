// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

struct ReserveConfigurationMap {
    uint256 data;
}

struct ReserveData {
    ReserveConfigurationMap configuration;
    uint128 liquidityIndex;
    uint128 currentLiquidityRate;
    uint128 variableBorrowIndex;
    uint128 currentVariableBorrowRate;
    uint128 currentStableBorrowRate;
    uint40 lastUpdateTimestamp;
    uint16 id;
    address aTokenAddress;
    address stableDebtTokenAddress;
    address variableDebtTokenAddress;
    address interestRateStrategyAddress;
    uint128 accruedToTreasury;
    uint128 unbacked;
    uint128 isolationModeTotalDebt;
}

interface IAavePool {
    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 referralCode
    ) external;
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);
    function getReserveData(
        address asset
    ) external view returns (ReserveData memory);
}

interface IMorpho {
    function supply(address asset, uint256 amount, address onBehalfOf) external;
    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256);
    // Note: Morpho interface might vary by version. Keeping balances if it exists in the specific deployment
    // or assuming it needs similar fix. For now, we focus on safe Aave implementation.
    function balances(
        address account,
        address asset
    ) external view returns (uint256);
}

/**
 * @title LendingRouter
 * @notice Routes funds to Aave/Morpho/Compound for yield optimization.
 */
contract LendingRouter is Ownable {
    using SafeERC20 for IERC20;

    /// @notice Address of the Aave Pool contract
    address public aavePool;
    /// @notice Address of the Morpho contract
    address public morpho;

    constructor(
        address initialOwner,
        address _aavePool,
        address _morpho
    ) Ownable(initialOwner) {
        aavePool = _aavePool;
        morpho = _morpho;
    }

    /**
     * @notice Supplies assets to a lending protocol.
     * @param asset The address of the asset to supply.
     * @param amount The amount to supply.
     * @param useMorpho Whether to use Morpho (true) or Aave (false).
     */
    function supply(
        address asset,
        uint256 amount,
        bool useMorpho
    ) external onlyOwner {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        if (useMorpho) {
            IERC20(asset).safeIncreaseAllowance(morpho, amount);
            IMorpho(morpho).supply(asset, amount, address(this));
        } else {
            IERC20(asset).safeIncreaseAllowance(aavePool, amount);
            IAavePool(aavePool).supply(asset, amount, address(this), 0);
        }
    }

    function withdraw(
        address asset,
        uint256 amount,
        address to,
        bool useMorpho
    ) external onlyOwner returns (uint256) {
        if (useMorpho) {
            return IMorpho(morpho).withdraw(asset, amount, to);
        } else {
            return IAavePool(aavePool).withdraw(asset, amount, to);
        }
    }

    function getBalance(
        address account,
        address asset,
        bool useMorpho
    ) external view returns (uint256) {
        if (useMorpho) {
            return IMorpho(morpho).balances(account, asset);
        } else {
            ReserveData memory data = IAavePool(aavePool).getReserveData(asset);
            return IERC20(data.aTokenAddress).balanceOf(account);
        }
    }
}
