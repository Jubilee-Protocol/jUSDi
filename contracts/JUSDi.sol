// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title Jubilee USD Index (jUSDi)
 * @author Hundredfold Foundation
 * @notice A cross-chain yield-optimizing stablecoin index
 */
contract JUSDi is ERC20, ERC20Permit, Ownable, Pausable {
    constructor(address initialOwner)
        ERC20("Jubilee USD Index", "jUSDi")
        ERC20Permit("Jubilee USD Index")
        Ownable(initialOwner)
    {
        _pause(); // Start paused
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    // Minting only allowed by specific Strategies or Vaults (to be implemented)
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20)
        whenNotPaused
    {
        super._update(from, to, value);
    }
}
