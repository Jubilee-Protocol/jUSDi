// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IStrategy.sol";
import "../vaults/jUSDi/LendingRouter.sol";

/**
 * @title LendingRouterAdapter
 * @notice Adapts the LendingRouter to the IStrategy interface for the simplified JUSDiVault.
 * @dev This allows the deployed vault to use our hardened yield infrastructure.
 */
contract LendingRouterAdapter is IStrategy, Ownable {
    using SafeERC20 for IERC20;

    /// @notice The underlying asset (e.g., USDC)
    IERC20 public immutable override asset;

    /// @notice The LendingRouter for Aave/Morpho
    LendingRouter public immutable lendingRouter;

    /// @notice The vault that can call this strategy
    address public vault;

    /// @notice Track deposited amounts for accurate accounting
    uint256 private _depositedAssets;

    /// @notice Use Aave (false) or Morpho (true)
    bool public useMorpho;

    event VaultUpdated(address indexed newVault);
    event ProtocolToggled(bool useMorpho);

    constructor(
        address _asset,
        address _lendingRouter,
        address _vault
    ) Ownable(msg.sender) {
        asset = IERC20(_asset);
        lendingRouter = LendingRouter(_lendingRouter);
        vault = _vault;
        useMorpho = false; // Default to Aave
    }

    modifier onlyVault() {
        require(msg.sender == vault, "Caller is not the Vault");
        _;
    }

    /**
     * @notice Set the vault address
     */
    function setVault(address _vault) external onlyOwner {
        vault = _vault;
        emit VaultUpdated(_vault);
    }

    /**
     * @notice Toggle between Aave and Morpho
     */
    function setUseMorpho(bool _useMorpho) external onlyOwner {
        useMorpho = _useMorpho;
        emit ProtocolToggled(_useMorpho);
    }

    /**
     * @notice Deposit assets into the lending protocol
     */
    function deposit(uint256 amount) external override onlyVault {
        // Transfer from vault to this adapter
        asset.safeTransferFrom(msg.sender, address(this), amount);

        // Approve and supply to lending router
        asset.safeIncreaseAllowance(address(lendingRouter), amount);
        lendingRouter.supply(address(asset), amount, useMorpho);

        _depositedAssets += amount;
    }

    /**
     * @notice Withdraw assets from the lending protocol
     */
    function withdraw(uint256 amount) external override onlyVault {
        // Withdraw from lending router to vault
        lendingRouter.withdraw(address(asset), amount, vault, useMorpho);

        if (amount > _depositedAssets) {
            _depositedAssets = 0;
        } else {
            _depositedAssets -= amount;
        }
    }

    /**
     * @notice Harvest yield (for Aave, yield accrues automatically)
     * @return harvested The amount of yield harvested (0 for Aave auto-compound)
     */
    function harvest() external override onlyVault returns (uint256 harvested) {
        // Aave auto-compounds, so we just update our tracking
        uint256 current = totalAssets();
        if (current > _depositedAssets) {
            harvested = current - _depositedAssets;
            _depositedAssets = current;
        }
        return harvested;
    }

    /**
     * @notice Get total assets in the lending protocol
     * @dev Uses internal tracking instead of external call for reliability
     */
    function totalAssets() public view override returns (uint256) {
        // Use internal tracking - external call to Aave/Morpho may fail
        // on non-standard networks or when pools are paused
        return _depositedAssets;
    }
}
