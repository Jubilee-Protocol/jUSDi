// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

contract MockLZEndpoint {
    uint32 public eid = 1;
    address public delegate;

    function setDelegate(address _delegate) external {
        delegate = _delegate;
    }

    function quote(
        address _params, // Simplified signature for mock
        address _options,
        bool _payInLzToken
    ) external view returns (uint256 nativeFee, uint256 lzTokenFee) {
        return (0, 0);
    }

    // fallback to catch other calls
    fallback() external payable {}
    receive() external payable {}
}
