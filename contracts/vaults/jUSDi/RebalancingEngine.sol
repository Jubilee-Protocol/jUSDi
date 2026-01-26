// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

interface IStablecoinOracle {
    function getPrice(address asset) external view returns (uint256);
}

interface ICurvePool {
    function exchange(
        int128 i,
        int128 j,
        uint256 dx,
        uint256 min_dy
    ) external returns (uint256);
}

/**
 * @title RebalancingEngine
 * @notice Executes optimal stablecoin swaps for jUSDi using Curve Pools.
 */
contract RebalancingEngine is Ownable {
    using SafeERC20 for IERC20;

    struct PoolInfo {
        address pool;
        int128 i; // token index to swap from
        int128 j; // token index to swap to
    }

    // assetFrom => assetTo => PoolInfo
    mapping(address => mapping(address => PoolInfo)) public swapRoutes;

    /// @notice Address of the stablecoin oracle for price validation
    address public oracle;

    event OracleUpdated(address indexed oracle);

    event SwapRouteUpdated(
        address indexed from,
        address indexed to,
        address pool
    );
    event Swapped(
        address indexed from,
        address indexed to,
        uint256 amountIn,
        uint256 amountOut
    );

    constructor(address initialOwner, address _oracle) Ownable(initialOwner) {
        oracle = _oracle;
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = _oracle;
        emit OracleUpdated(_oracle);
    }

    function setSwapRoute(
        address from,
        address to,
        address pool,
        int128 i,
        int128 j
    ) external onlyOwner {
        swapRoutes[from][to] = PoolInfo({pool: pool, i: i, j: j});
        emit SwapRouteUpdated(from, to, pool);
    }

    /**
     * @notice Swaps one stablecoin for another using pre-configured Curve routes.
     */
    function swap(
        address from,
        address to,
        uint256 amount,
        uint256 minAmountOut
    ) external returns (uint256) {
        PoolInfo memory route = swapRoutes[from][to];
        require(route.pool != address(0), "No swap route configured");

        IERC20(from).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(from).safeIncreaseAllowance(route.pool, amount);

        // Price Validation: minAmountOut cannot be less than 97% of Oracle value
        // (unless it's an emergency, but the engine should enforce a floor)
        if (oracle != address(0)) {
            uint256 priceFrom = IStablecoinOracle(oracle).getPrice(from);
            uint256 priceTo = IStablecoinOracle(oracle).getPrice(to);
            uint8 decsFrom = IERC20Metadata(from).decimals();
            uint8 decsTo = IERC20Metadata(to).decimals();

            uint256 normalized;
            if (decsTo >= decsFrom) {
                normalized = amount * (10 ** (decsTo - decsFrom));
            } else {
                normalized = amount / (10 ** (decsFrom - decsTo));
            }

            uint256 expectedOut = (normalized * priceFrom) / priceTo;
            uint256 floorOut = (expectedOut * 97) / 100; // 3% absolute floor
            require(
                minAmountOut >= floorOut,
                "Slippage too high against oracle"
            );
        }

        uint256 received = ICurvePool(route.pool).exchange(
            route.i,
            route.j,
            amount,
            minAmountOut
        );

        IERC20(to).safeTransfer(msg.sender, received);

        emit Swapped(from, to, amount, received);
        return received;
    }
}
