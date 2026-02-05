// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

/**
 * @title MockVault
 * @notice ERC4626 vault for testing JubileeYieldStream with realistic yield simulation
 * @dev Tracks total assets properly to simulate yield accumulation
 */
contract MockVault is ERC4626 {
    using Math for uint256;

    constructor(IERC20 _asset) ERC4626(_asset) ERC20("Mock Vault", "mVAULT") {}

    /**
     * @notice Returns total assets including any "yield" that was minted directly to vault
     * @dev Simply returns the actual token balance, which increases when tokens are minted to vault
     */
    function totalAssets() public view override returns (uint256) {
        return IERC20(asset()).balanceOf(address(this));
    }

    // Preview functions remain default - shares based on totalAssets
}
