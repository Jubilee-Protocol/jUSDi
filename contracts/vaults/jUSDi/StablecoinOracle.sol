// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IChainlinkAggregator {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );
    function decimals() external view returns (uint8);
}

/**
 * @title StablecoinOracle
 * @notice Aggregates price feeds for stablecoins and checks for staleness.
 */
contract StablecoinOracle is Ownable {
    /// @notice mapping from asset address to Chainlink price feed address
    mapping(address => address) public priceFeeds;
    /// @notice Time threshold for considering a price feed stale
    uint256 public constant STALE_THRESHOLD = 1 hours;

    event PriceFeedUpdated(address indexed asset, address indexed feed);

    constructor(address initialOwner) Ownable(initialOwner) {}

    function setPriceFeed(address asset, address feed) external onlyOwner {
        priceFeeds[asset] = feed;
        emit PriceFeedUpdated(asset, feed);
    }

    /**
     * @notice Gets the price of an asset in USD with 8 decimals.
     */
    function getPrice(address asset) public view returns (uint256) {
        address feed = priceFeeds[asset];
        require(feed != address(0), "No price feed");

        (, int256 price, , uint256 updatedAt, ) = IChainlinkAggregator(feed)
            .latestRoundData();
        require(price > 0, "Invalid price");
        require(block.timestamp - updatedAt <= STALE_THRESHOLD, "Stale price");

        uint8 decimals = IChainlinkAggregator(feed).decimals();
        if (decimals == 8) {
            return uint256(price);
        } else if (decimals < 8) {
            return uint256(price) * (10 ** (8 - decimals));
        } else {
            return uint256(price) / (10 ** (decimals - 8));
        }
    }

    /**
     * @notice Checks if an asset has depegged beyond a certain threshold.
     * @param threshold BPS (e.g., 200 = 2%)
     */
    function isDepegged(
        address asset,
        uint256 threshold
    ) external view returns (bool) {
        uint256 price = getPrice(asset);
        uint256 targetPrice = 1e8; // $1.00 with 8 decimals

        uint256 diff;
        if (price > targetPrice) {
            diff = price - targetPrice;
        } else {
            diff = targetPrice - price;
        }

        return (diff * 10000) / targetPrice > threshold;
    }
}
