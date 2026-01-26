// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./StablecoinOracle.sol";
import "./RiskScoring.sol";

/**
 * @title EmergencyManager
 * @notice Handles circuit breakers and emergency rebalancing triggers for jUSDi.
 */
contract EmergencyManager is Ownable {
    StablecoinOracle public oracle;
    RiskScoring public riskScoring;

    uint256 public constant DEPEG_THRESHOLD_BPS = 200; // 2%
    uint256 public constant CRITICAL_RISK_SCORE = 50;

    bool public isPaused;
    mapping(address => bool) public isBlacklisted;

    event EmergencyPaused(uint256 timestamp, string reason);
    event EmergencyUnpaused(uint256 timestamp);
    event AssetBlacklisted(address indexed asset, string reason);

    constructor(
        address initialOwner,
        address _oracle,
        address _riskScoring
    ) Ownable(initialOwner) {
        oracle = StablecoinOracle(_oracle);
        riskScoring = RiskScoring(_riskScoring);
    }

    /**
     * @notice Checks if any circuit breakers are triggered for a given asset.
     */
    function checkCircuitBreaker(address asset) external view returns (bool) {
        if (isPaused || isBlacklisted[asset]) return true;

        // Check if depegged
        if (oracle.isDepegged(asset, DEPEG_THRESHOLD_BPS)) return true;

        // Check if risk score is critical
        if (riskScoring.getTotalScore(asset) < CRITICAL_RISK_SCORE) return true;

        return false;
    }

    function setPaused(bool _paused, string memory reason) external onlyOwner {
        isPaused = _paused;
        if (_paused) {
            emit EmergencyPaused(block.timestamp, reason);
        } else {
            emit EmergencyUnpaused(block.timestamp);
        }
    }

    function blacklistAsset(
        address asset,
        string memory reason
    ) external onlyOwner {
        isBlacklisted[asset] = true;
        emit AssetBlacklisted(asset, reason);
    }

    function removeBlacklist(address asset) external onlyOwner {
        isBlacklisted[asset] = false;
    }
}
