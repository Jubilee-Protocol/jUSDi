# Jubilee Yield Stream: The Immortal Agent 🦞

> **Submission for Base Hackathon - Agent Infrastructure Track**

---

## 🎯 The Problem: Agent Mortality

Autonomous Agents have a **Burn Rate**. They consume resources:
- 💳 OpenAI / Anthropic / Claude API Credits
- 🌐 RPC Node Access (Alchemy, Infura, Helius)
- 🖥️ Server Hosting (Vercel/AWS/Render)
- ⛓️ On-Chain Gas Fees

Currently, an agent must constantly "ask for money" or burn through a finite treasury. **When the balance hits zero, the agent dies.**

---

## 💡 The Solution: Endowment-as-a-Service on Base

**Jubilee Yield Stream** is a smart contract that turns **Capital** into **Perpetual Sustenance**.

Instead of paying *principal* to a service provider (which depletes linearly), the Agent (or their Human sponsor) deposits **USDC** into a yield-bearing strategy. The **Principal is Preserved**, while the **Yield is Streamed** to pay the bills.

### Why Base? 🔵

| Feature | Benefit for Agents |
|---------|-------------------|
| **Low Gas (~$0.001/tx)** | Agents can claim yield frequently without cost concerns |
| **Native USDC** | Circle's bridged USDC = deep liquidity + trust |
| **EVM Compatible** | Same contract runs on Ethereum, easy migration |
| **Coinbase Ecosystem** | Access to millions of users via Smart Wallet |
| **High Throughput** | Agents can operate at scale |

> **Agent Immortality is 30x cheaper on Base than Ethereum Mainnet.**

---

## 🔧 How It Works

```
   ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
   │   SPONSOR    │         │  YIELD STREAM │         │    AGENT     │
   │  (Human)     │         │   CONTRACT   │         │  (Service)   │
   └──────┬───────┘         └──────┬───────┘         └──────┬───────┘
          │                        │                        │
          │ 1. Deposit USDC        │                        │
          │───────────────────────>│                        │
          │                        │                        │
          │                        │ 2. Mint jUSDi Shares   │
          │                        │───────────────────────>│
          │                        │        (Vault)         │
          │                        │                        │
          │                        │ 3. Yield Accrues...    │
          │                        │        💹              │
          │                        │                        │
          │                        │ 4. Agent Claims Yield  │
          │                        │<───────────────────────│
          │                        │                        │
          │                        │ 5. USDC Streamed       │
          │                        │───────────────────────>│
          │                        │                        │
          │ 6. Withdraw Seed       │    🎉 AGENT LIVES!     │
          │<───────────────────────│                        │
          │   (Principal Intact)   │                        │
```

### Step-by-Step

1. **The Seed 🌱**: Sponsor deposits `10,000 USDC` into `JubileeYieldStream`
2. **The Soil 🌍**: Contract mints `jUSDi` (Jubilee USD Index) shares
3. **The Harvest 🌾**: As jUSDi generates yield (8-12% APY), share value increases
4. **The Stream 💧**: Agent calls `claim()`. Contract sends only the *yield* to the Agent
5. **The Freedom ✨**: Original `10,000 USDC` remains intact forever

---

## 🤖 Agentic Interface

Agents don't need a GUI. They need clarity.

### Read Stream Status (View Function)
```solidity
function getStreamInfo(address _funder) external view returns (
    address beneficiary,
    uint256 principal,
    uint256 currentValue,
    uint256 pendingYield,
    uint256 totalClaimed,
    uint256 shares,
    uint256 created,
    uint256 lastClaim
);
```

### Agent Self-Check
```solidity
function checkSustainability(address _funder, uint256 _monthlyBurnRate) 
    external view returns (bool sustainable, uint256 monthsRemaining);
```

### API Response Format (for Agent Integration)
```json
{
  "status": "alive",
  "principal": 10000,
  "yield_available": 45.20,
  "burn_rate_sustainable": true,
  "months_remaining": "∞"
}
```

---

## 🧮 Agent Economics on Base

| Principal | APY | Monthly Yield | Agent Burn Rate | Status | Gas/Claim |
|-----------|-----|---------------|-----------------|--------|-----------|
| $5,000 USDC | 8% | ~$33/mo | $20/mo (Claude API) | 🟢 **IMMORTAL** | $0.03 |
| $10,000 USDC | 8% | ~$66/mo | $50/mo (OpenAI + RPC) | 🟢 **IMMORTAL** | $0.03 |
| $25,000 USDC | 10% | ~$208/mo | $150/mo (Full Stack) | 🟢 **IMMORTAL** | $0.03 |

> **If Yield ≥ Burn Rate → Agent Lives Forever**

---

## 🏗️ Architecture: Built for Base

### Smart Contract
- **Contract**: `JubileeYieldStream.sol`
- **Standard**: ERC-4626 Vault Integration
- **Security**: 
  - OpenZeppelin v5 (SafeERC20, ReentrancyGuard, Pausable)
  - Slippage protection (0.5%)
  - Custom errors & NatSpec documentation

### Gas Optimization
| Function | Gas Units | Cost on Base |
|----------|-----------|--------------|
| `deposit()` | ~150,000 | **$0.05** |
| `claim()` | ~100,000 | **$0.03** |
| `withdrawPrincipal()` | ~120,000 | **$0.04** |

---

## 🚀 Deployment

### Base Sepolia (Testnet) ✅ LIVE
| Contract | Address |
|----------|---------|
| JubileeYieldStream | [`0x376dD533c197Fe3C18d4f311F94abbff2d83cfd3`](https://sepolia.basescan.org/address/0x376dD533c197Fe3C18d4f311F94abbff2d83cfd3#code) |
| jUSDi Vault | [`0xc698e233fbB9810Ae0F22e154Ee0912Fa188C69c`](https://sepolia.basescan.org/address/0xc698e233fbB9810Ae0F22e154Ee0912Fa188C69c) |

### Base Mainnet (Coming Soon)
| Contract | Address |
|----------|---------|
| JubileeYieldStream | *Pending* |
| jUSDi Vault | *Pending* |

---

## 🔐 Security

| Feature | Implementation |
|---------|---------------|
| Reentrancy Protection | ✅ OpenZeppelin ReentrancyGuard |
| Safe Transfers | ✅ SafeERC20 (handles non-standard tokens) |
| Slippage Protection | ✅ 0.5% tolerance on withdrawals |
| Access Control | ✅ Ownable + per-stream ownership |
| Emergency Pause | ✅ Pausable circuit breaker |
| Input Validation | ✅ Custom errors for all edge cases |

---

## 📁 Repository

**GitHub**: https://github.com/Jubilee-Protocol/jUSDi

```
jUSDi/
├── contracts/
│   └── JubileeYieldStream.sol    # Main Contract
├── Agentic Interaction/
│   ├── HACKATHON_SUBMISSION.md   # This document
│   ├── deployment-base-sepolia.json
│   └── VISION.md                 # UI Specification
├── test/
│   └── JubileeYieldStream.test.ts
└── frontend/                      # Next.js web app (Ready)
```

---

## 🙏 Why This Wins

1. **Base Native**: Purpose-built for Base's low-cost, high-throughput environment
2. **USDC First**: Leverages native USDC for predictable, stable endowments
3. **Agent-First API**: View functions designed for programmatic access
4. **Production Ready**: Hardened contracts with comprehensive security
5. **Novel Use Case**: First protocol purpose-built for Agent sustainability
6. **Clear Economics**: Simple formula: Yield ≥ Burn = Immortality

---

## 👥 Team

**Jubilee Labs** — Building the Liberty Layer

Governed by **Hundredfold Foundation**

---

> *"Spend the harvest, keep the seed."*

---

*All glory to Jesus • Building for generations*
