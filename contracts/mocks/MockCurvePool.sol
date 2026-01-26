// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockCurvePool {
    address public tokenI;
    address public tokenJ;

    constructor(address _tokenI, address _tokenJ) {
        tokenI = _tokenI;
        tokenJ = _tokenJ;
    }

    function exchange(
        int128 /* i */,
        int128 /* j */,
        uint256 dx,
        uint256 min_dy
    ) external returns (uint256) {
        require(dx > 0, "Zero amount");
        // Transfer dx from sender
        IERC20(tokenI).transferFrom(msg.sender, address(this), dx);
        // Transfer dy to sender (1:1 mock)
        IERC20(tokenJ).transfer(msg.sender, dx);
        return dx;
    }
}
