// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockLending {
    mapping(address => mapping(address => uint256)) public balances;

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

    mapping(address => address) public aTokens;

    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 /* referralCode */
    ) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);

        address aToken = aTokens[asset];
        if (aToken == address(0)) {
            // Deploy new MockAToken if not exists
            // This requires MockAToken to be in scope or importable.
            // Since we are in mocks/MockLending.sol, we can import MockAToken.sol if explicit.
            // But simplify: we can't deploy easily here without import.
            // Assuming setup calls createAToken first?
            // Or revert?
            revert("Asset not init");
        }

        // Mint aTokens to user
        // We need interface to call mint. MockAToken has mint.
        // We cast to a generic interface with mint.
        (bool success, ) = aToken.call(
            abi.encodeWithSignature("mint(address,uint256)", onBehalfOf, amount)
        );
        require(success, "Mint failed");

        balances[onBehalfOf][asset] += amount;
    }

    // Helper to init asset
    function initAsset(address asset, address aToken) external {
        aTokens[asset] = aToken;
    }

    function getReserveData(
        address asset
    ) external view returns (ReserveData memory) {
        ReserveData memory data;
        data.aTokenAddress = aTokens[asset];
        return data;
    }

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        address aToken = aTokens[asset];
        require(aToken != address(0), "Asset not init");

        // Burn aTokens
        (bool success, ) = aToken.call(
            abi.encodeWithSignature("burn(address,uint256)", msg.sender, amount)
        );
        require(success, "Burn failed");

        balances[msg.sender][asset] -= amount;
        IERC20(asset).transfer(to, amount);
        return amount;
    }

    function drain(address asset, uint256 amount) external {
        IERC20(asset).transfer(msg.sender, amount);
    }
}
