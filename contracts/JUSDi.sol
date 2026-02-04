// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OFT} from "@layerzerolabs/oft-evm/contracts/OFT.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Jubilee USD Index (jUSDi)
 * @author Hundredfold Foundation
 * @notice A cross-chain yield-optimizing stablecoin index (OFT)
 */
contract JUSDi is OFT, ERC20Permit, Pausable {
    constructor(
        address _lzEndpoint,
        address _delegate
    )
        OFT("Jubilee USD Index", "jUSDi", _lzEndpoint, _delegate)
        ERC20Permit("Jubilee USD Index")
        Ownable(_delegate)
    {
        _pause(); // Start paused
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    // Minting only allowed by specific Strategies or Vaults
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) public onlyOwner {
        _burn(from, amount);
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20) whenNotPaused {
        super._update(from, to, value);
    }

    // OFT inherits Context via OApp -> Context
    // ERC20 inherits Context
    // We might need to override _msgSender() or _msgData() if there is conflict?
    // Usually standard OFT + OZ ERC20 works fine.
}
