// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockLending {
    mapping(address => mapping(address => uint256)) public balances;

    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf,
        uint16 /* referralCode */
    ) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        balances[onBehalfOf][asset] += amount;
    }

    function supply(
        address asset,
        uint256 amount,
        address onBehalfOf
    ) external {
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        balances[onBehalfOf][asset] += amount;
    }

    function withdraw(
        address asset,
        uint256 amount,
        address to
    ) external returns (uint256) {
        balances[msg.sender][asset] -= amount;
        IERC20(asset).transfer(to, amount);
        return amount;
    }

    function drain(address asset, uint256 amount) external {
        IERC20(asset).transfer(msg.sender, amount);
    }
}
