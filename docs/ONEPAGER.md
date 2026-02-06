# jUSDi: The Stablecoin Index on Base

## What is jUSDi?

**jUSDi** (Jubilee USD Index) is a **yield-generating stablecoin vault** that diversifies your USDC and USDT across Aave V3 on Base to earn **4-8% APY** while maintaining maximum safety.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER                                    │
│                      Deposits USDC                               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       JUSDiVault                                 │
│                    (ERC4626 Vault)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ 10% Liquid  │  │ 90% Yield   │  │ Receives jUSDi shares   │  │
│  │ Buffer      │  │ Earning     │  │ (proportional to USDC)  │  │
│  └─────────────┘  └──────┬──────┘  └─────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AAVE V3 (Base)                              │
│                                                                  │
│   USDC deposited → aUSDC received → Earns 4-8% APY              │
│   Interest auto-compounds daily                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| **🛡️ Risk Protection** | Circuit breakers pause operations if stablecoin depegs >2% |
| **💰 Yield** | 4-8% APY from Aave V3 lending |
| **📊 Transparent** | ERC4626 standard — track value in any wallet |
| **⚡ Instant Withdraws** | 10% liquid buffer for immediate redemptions |
| **🔒 Verified** | All contracts verified on Basescan |

---

## Deployed Contracts (Base Mainnet)

| Contract | Address |
|----------|---------|
| JUSDiVault | `0x0B03463259d5041004290822444c4183aE936050` |
| jUSDi Token | `0x04cC650F6dB0B91Ef910a4a54F22232771988432` |
| LendingRouter | `0x6533715ccd0fdDe359baB156080DD38D5C85FfF9` |

---

## How to Use

### Deposit
1. Approve USDC to vault address
2. Call `deposit(amount, yourAddress)`
3. Receive jUSDi vault shares

### Withdraw
1. Call `withdraw(amount, yourAddress, yourAddress)`
2. Receive USDC back (plus earned yield)

---

## Fee Structure

| Fee | Rate | Goes To |
|-----|------|---------|
| Management | 1% annual | Treasury |
| Performance | 10% of yield | Treasury |

Fees are collected weekly via automated keeper.

---

## Architecture vs jBTCi

| | jBTCi | jUSDi |
|---|-------|-------|
| **Assets** | cbBTC, WBTC | USDC, USDT |
| **Yield Source** | Yearn V3 | Aave V3 |
| **Target APY** | 6-10% | 4-8% |
| **Volatility** | High (BTC) | Low (Stables) |

---

## Links

- **Frontend**: [mint.jusdi.xyz](https://mint.jusdi.xyz) *(coming soon)*
- **GitHub**: [github.com/Jubilee-Protocol/jUSDi](https://github.com/Jubilee-Protocol/jUSDi)
- **Basescan**: [View Contracts](https://basescan.org/address/0x0B03463259d5041004290822444c4183aE936050#code)

---

**Built by [Jubilee Labs](https://jubileelabs.xyz)** • *All glory to Jesus*
