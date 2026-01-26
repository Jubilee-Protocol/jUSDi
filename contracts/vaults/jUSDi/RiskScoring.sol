// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RiskScoring
 * @notice Calculates risk scores for stablecoins based on price stability, liquidity, and protocol health.
 * @dev Follows the jUSDi Risk Scoring Specification.
 */
contract RiskScoring is Ownable {
    struct ScoreMetrics {
        uint8 priceStability; // 0-100
        uint8 liquidityDepth; // 0-100
        uint8 protocolHealth; // 0-100
        uint256 lastUpdate;
    }

    /// @notice mapping from asset address to its last recorded score metrics
    mapping(address => ScoreMetrics) public assetScores;

    // Weights in BPS (50%, 30%, 20%)
    uint256 public constant PS_WEIGHT = 5000;
    uint256 public constant LD_WEIGHT = 3000;
    uint256 public constant PH_WEIGHT = 2000;
    uint256 public constant BPS_DENOMINATOR = 10000;

    event ScoreUpdated(address indexed asset, uint256 totalScore);

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Updates the scores for a specific asset.
     * @param asset The address of the stablecoin.
     * @param ps Price Stability score (0-100).
     * @param ld Liquidity Depth score (0-100).
     * @param ph Protocol Health score (0-100).
     */
    function updateScore(
        address asset,
        uint8 ps,
        uint8 ld,
        uint8 ph
    ) external onlyOwner {
        require(ps <= 100 && ld <= 100 && ph <= 100, "Invalid score range");

        assetScores[asset] = ScoreMetrics({
            priceStability: ps,
            liquidityDepth: ld,
            protocolHealth: ph,
            lastUpdate: block.timestamp
        });

        emit ScoreUpdated(asset, getTotalScore(asset));
    }

    /**
     * @notice Returns the total risk score (0-100) for an asset.
     */
    function getTotalScore(address asset) public view returns (uint256) {
        ScoreMetrics memory metrics = assetScores[asset];
        if (metrics.lastUpdate == 0) return 0;

        uint256 total = (uint256(metrics.priceStability) * PS_WEIGHT) +
            (uint256(metrics.liquidityDepth) * LD_WEIGHT) +
            (uint256(metrics.protocolHealth) * PH_WEIGHT);

        return total / BPS_DENOMINATOR;
    }

    /**
     * @notice Returns the maximum allowed allocation (in BPS) for an asset based on its score.
     * @dev Based on the allocation rules in the specification.
     */
    function getMaxAllocation(address asset) external view returns (uint256) {
        uint256 score = getTotalScore(asset);

        if (score >= 90) return 4000; // 40%
        if (score >= 70) return 3000; // 30%
        if (score >= 50) return 2000; // 20%
        return 0; // Emergency Exit
    }
}
