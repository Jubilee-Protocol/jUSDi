// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IStrategy.sol";

// Compound V3 Interface
interface IComet {
    function supply(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title CompoundV3Strategy
 * @notice Adapter for generating yield via Compound V3 (Comet)
 */
contract CompoundV3Strategy is IStrategy, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable asset;
    IComet public immutable comet;
    address public vault;

    constructor(
        address _asset,
        address _comet,
        address _vault
    ) Ownable(msg.sender) {
        asset = IERC20(_asset);
        comet = IComet(_comet);
        vault = _vault;
    }

    modifier onlyVault() {
        require(msg.sender == vault, "Caller is not the Vault");
        _;
    }

    function deposit(uint256 amount) external onlyVault {
        asset.safeIncreaseAllowance(address(comet), amount);
        comet.supply(address(asset), amount);
    }

    function withdraw(uint256 amount) external onlyVault {
        comet.withdraw(address(asset), amount);
        asset.safeTransfer(vault, amount);
    }

    function harvest() external onlyVault returns (uint256) {
        // Compound V3 yield accrues in the principal if using base token,
        // or as COMP rewards.
        return 0;
    }

    function totalAssets() external view returns (uint256) {
        return comet.balanceOf(address(this));
    }
}
