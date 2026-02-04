// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockAToken is ERC20, Ownable {
    address public underlyingAsset;

    constructor(
        string memory name,
        string memory symbol,
        address _asset,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {
        underlyingAsset = _asset;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}
