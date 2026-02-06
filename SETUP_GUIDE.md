# jUSDi Setup Guide: Chainlink Feeds & GitHub Actions Keeper

This guide walks through configuring Chainlink price feeds and the automated fee collection keeper.

---

## Part 1: Chainlink Price Feeds

### Why Needed
The `StablecoinOracle` uses Chainlink to:
- Detect if USDC/USDT depegs from $1.00
- Trigger circuit breakers if price deviation >2%
- Calculate accurate asset values for share pricing

### Base Mainnet Chainlink Feeds

| Asset | Feed Contract | Decimals |
|-------|---------------|----------|
| USDC/USD | `0x7e860098F58bBFC8648a4311b374B1D669a2bc6B` | 8 |
| USDT/USD | `0xf19d560eB8d2ADf07BD6D13ed03e1D11215721F9` | 8 |

### Configuration Steps

Run these transactions from the **owner wallet**:

```javascript
// Using ethers.js or wagmi
const oracle = new ethers.Contract(
    "0x081433E5DbfAeBffBdDc1F69B9AB372D7A00fA7a", // StablecoinOracle
    ["function setPriceFeed(address asset, address feed) external"],
    signer
);

// Set USDC price feed
await oracle.setPriceFeed(
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
    "0x7e860098F58bBFC8648a4311b374B1D669a2bc6B"  // Chainlink USDC/USD
);

// Set USDT price feed
await oracle.setPriceFeed(
    "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", // USDT
    "0xf19d560eB8d2ADf07BD6D13ed03e1D11215721F9"  // Chainlink USDT/USD
);
```

Or via Basescan "Write Contract":
1. Go to [StablecoinOracle](https://basescan.org/address/0x081433E5DbfAeBffBdDc1F69B9AB372D7A00fA7a#writeContract)
2. Connect wallet (owner)
3. Call `setPriceFeed` with above addresses

---

## Part 2: GitHub Actions Fee Collection Keeper

### How It Works

The keeper automatically calls `collectFees()` on the vault weekly to:
- Calculate management fee (1% annual, pro-rated)
- Calculate performance fee (10% of yield earned)
- Transfer fees to treasury wallet

### Setup Steps

#### 1. Create GitHub Secret

Go to your repo → Settings → Secrets → Actions → New Repository Secret:

| Secret Name | Value |
|-------------|-------|
| `KEEPER_PRIVATE_KEY` | Private key of wallet with gas for Base |
| `MAINNET_VAULT_ADDRESS` | `0x0B03463259d5041004290822444c4183aE936050` |

> ⚠️ Use a **dedicated keeper wallet** with minimal funds (~$20 ETH for gas)

#### 2. Fund the Keeper Wallet

The keeper needs ETH on Base for gas:
- Recommended: 0.01 ETH (~$25) covers ~100 transactions
- Wallet can be any address, doesn't need owner permissions
- `collectFees()` is callable by anyone (fees go to treasury)

#### 3. Enable the Workflow

The workflow is already created at `.github/workflows/fee_collector.yml`:

```yaml
name: Fee Collection Keeper
on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday at 00:00 UTC
  workflow_dispatch:      # Manual trigger
```

To test manually:
1. Go to Actions tab in GitHub
2. Select "Fee Collection Keeper"
3. Click "Run workflow"
4. Select network (baseSepolia for testing first)

### Monitoring

Check workflow runs at: `https://github.com/Jubilee-Protocol/jUSDi/actions`

Each run logs:
- Treasury address
- Total AUM
- Fees collected (management + performance)
- Transaction hash

---

## Part 3: RiskScoring Setup (Optional)

Initialize risk scores for circuit breaker thresholds:

```javascript
const riskScoring = new ethers.Contract(
    "0x79Bc0A789FC14919ee1698D115624600658efc4e",
    ["function updateScore(address asset, uint8 ps, uint8 ld, uint8 ph) external"],
    signer
);

// USDC: High quality stablecoin
await riskScoring.updateScore(
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
    95,  // Price Stability (0-100)
    90,  // Liquidity Depth (0-100)
    95   // Protocol Health (0-100)
);

// USDT: Slightly lower due to transparency concerns
await riskScoring.updateScore(
    "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2", // USDT
    90,  // Price Stability
    95,  // Liquidity Depth
    80   // Protocol Health
);
```

---

## Summary Checklist

| Step | Command/Action | Status |
|------|----------------|--------|
| 1 | `setPriceFeed(USDC, chainlink)` | ⬜ TODO |
| 2 | `setPriceFeed(USDT, chainlink)` | ⬜ TODO |
| 3 | Add `KEEPER_PRIVATE_KEY` secret | ⬜ TODO |
| 4 | Add `MAINNET_VAULT_ADDRESS` secret | ⬜ TODO |
| 5 | Fund keeper wallet with 0.01 ETH | ⬜ TODO |
| 6 | Test workflow manually | ⬜ TODO |

---

*"The plans of the diligent lead surely to abundance."* — Proverbs 21:5
