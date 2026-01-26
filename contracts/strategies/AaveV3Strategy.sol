// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IStrategy.sol";

// Aave V3 Interfaces
interface IPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

interface IPoolAddressesProvider {
    function getPool() external view returns (address);
}

interface IaToken is IERC20 {
    function scaledBalanceOf(address user) external view returns (uint256);
}

/**
 * @title AaveV3Strategy
 * @notice Adapter for generating yield via Aave V3
 */
contract AaveV3Strategy is IStrategy, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable asset;
    IPoolAddressesProvider public immutable poolProvider;
    IaToken public immutable aToken;
    address public vault;

    constructor(
        address _asset,
        address _poolProvider,
        address _aToken,
        address _vault
    ) Ownable(msg.sender) {
        asset = IERC20(_asset);
        poolProvider = IPoolAddressesProvider(_poolProvider);
        aToken = IaToken(_aToken);
        vault = _vault;
    }

    modifier onlyVault() {
        require(msg.sender == vault, "Caller is not the Vault");
        _;
    }

    function deposit(uint256 amount) external onlyVault {
        IPool pool = IPool(poolProvider.getPool());
        asset.safeIncreaseAllowance(address(pool), amount);
        pool.supply(address(asset), amount, address(this), 0);
    }

    function withdraw(uint256 amount) external onlyVault {
        IPool pool = IPool(poolProvider.getPool());
        pool.withdraw(address(asset), amount, vault);
    }

    function harvest() external onlyVault returns (uint256) {
        // Aave yield accrues automatically in the aToken balance.
        return 0; 
    }

    function totalAssets() external view returns (uint256) {
        return aToken.balanceOf(address(this));
    }
}
