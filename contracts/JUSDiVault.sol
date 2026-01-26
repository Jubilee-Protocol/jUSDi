// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IStrategy.sol";

/**
 * @title JUSDiVault
 * @notice Production-grade ERC4626 Vault for jUSDi
 * @dev Manages underlying assets, strategies, and share minting
 */
contract JUSDiVault is ERC4626, Ownable, Pausable {
    IStrategy public strategy;
    
    event StrategyUpdated(address indexed newStrategy);
    event Harvested(uint256 yield);

    constructor(
        IERC20 _asset,
        string memory _name,
        string memory _symbol,
        address _initialOwner
    ) ERC4626(_asset) ERC20(_name, _symbol) Ownable(_initialOwner) {}

    /**
     * @notice Set the yield strategy
     * @dev Withdraws all funds from old strategy and deposits to new one
     */
    function setStrategy(address _strategy) external onlyOwner {
        if (address(strategy) != address(0)) {
            strategy.withdraw(strategy.totalAssets());
        }
        strategy = IStrategy(_strategy);
        
        // Deposit idle assets into new strategy
        uint256 idle = totalAssets();
        if (idle > 0) {
            IERC20(asset()).approve(address(strategy), idle);
            strategy.deposit(idle);
        }
        
        emit StrategyUpdated(_strategy);
    }

    /**
     * @notice Total assets managed by the vault
     * @dev Includes idle cash + assets invested in strategy
     */
    function totalAssets() public view override returns (uint256) {
        uint256 strategyAssets = address(strategy) != address(0) ? strategy.totalAssets() : 0;
        return super.totalAssets() + strategyAssets;
    }

    /**
     * @notice Harvest yield from the strategy
     */
    function harvest() external onlyOwner {
        require(address(strategy) != address(0), "No strategy");
        uint256 harvested = strategy.harvest();
        emit Harvested(harvested);
    }

    // Overrides for Deposit/Withdraw to route funds via Strategy

    function _deposit(
        address caller,
        address receiver,
        uint256 assets,
        uint256 shares
    ) internal override whenNotPaused {
        super._deposit(caller, receiver, assets, shares);
        
        // Move funds to strategy if active
        if (address(strategy) != address(0)) {
            IERC20(asset()).approve(address(strategy), assets);
            strategy.deposit(assets);
        }
    }

    function _withdraw(
        address caller,
        address receiver,
        address owner,
        uint256 assets,
        uint256 shares
    ) internal override whenNotPaused {
        // Check if we need to pull from strategy
        uint256 float = IERC20(asset()).balanceOf(address(this));
        if (assets > float && address(strategy) != address(0)) {
            uint256 shortage = assets - float;
            strategy.withdraw(shortage);
        }
        
        super._withdraw(caller, receiver, owner, assets, shares);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
