# jUSDi Risk Scoring Specification

The risk scoring algorithm dynamically adjusts allocations based on the health of underlying stablecoins (USDC, USDT, DAI, USDS).

## Metrics and Weights

| Metric | Weight | Measurement |
| :--- | :--- | :--- |
| **Price Stability** | 50% | Deviation from $1.00 over 24h rolling window |
| **Liquidity Depth** | 30% | On-chain liquidity for quick exits |
| **Protocol Health**| 20% | Collateralization, transparency, regulatory status |

### Price Stability Scoring
- **Excellent (<0.1%):** 100 points
- **Good (0.1-0.5%):** 80 points
- **Fair (0.5-1.0%):** 50 points
- **Poor (>1.0%):** 0 points

### Liquidity Depth Scoring
- **Excellent (>$100M):** 100 points
- **Good ($50M-$100M):** 80 points
- **Fair ($10M-$50M):** 50 points
- **Poor (<$10M):** 0 points

### Protocol Health Factors
- **Collateralization Ratio:** >100% for decentralized stables (DAI).
- **Reserve Transparency:** Regular audits/attestations (USDC, USDT).
- **Regulatory Status:** Compliance with major jurisdictions.
- **Audit History:** Recency and quality of smart contract audits.

## Allocation Rules

The final risk score (0-100) determines the maximum allowed allocation:

| Risk Score | Max Allocation |
| :--- | :--- |
| **90 - 100** | 40% |
| **70 - 89** | 30% |
| **50 - 69** | 20% |
| **< 50** | 0% (Emergency Exit) |

## Implementation Details

- **Oracle Integration:** Use Chainlink for price feeds and potentially proof-of-reserve.
- **Frequency:** Re-calculate scores daily or upon 0.5% price deviation.
- **Safe Asset:** In case of systemic risk, move funds to the highest-rated asset (default: USDC).
