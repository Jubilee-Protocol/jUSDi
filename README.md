# jUSDi - The Stablecoin Index Fund

![Jubilee Protocol](https://img.shields.io/badge/Jubilee-Protocol-pink)
![License](https://img.shields.io/badge/license-MIT-blue)
![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia-blue)
![Base](https://img.shields.io/badge/Base-Testnet-blue)
![Solana](https://img.shields.io/badge/Solana-Devnet-purple)

**jUSDi** is a diversified stablecoin index vault that manages exposure across **USDC and USDT** — the two stablecoins with the deepest liquidity — with automated risk-based rebalancing and yield optimization. Earn **12-15% target APY** while maintaining maximum stablecoin safety.

**Live on testnets**: Base Sepolia • Ethereum Sepolia • Solana Devnet

---

## 🦞 Agentic Infrastructure: The Immortal Agent

> **"Spend the harvest, keep the seed."**

**Jubilee Yield Stream** is a novel protocol layer built on jUSDi that enables **perpetual agent funding** through yield streaming. Instead of depleting a finite treasury, AI agents receive streaming yield while their principal remains preserved forever.

### The Problem: Agent Mortality
Autonomous agents have **burn rates** — API credits, RPC access, hosting, gas fees. When the balance hits zero, the agent dies.

### The Solution: Endowment-as-a-Service
| Principal | APY | Monthly Yield | Agent Burn Rate | Status |
|-----------|-----|---------------|-----------------|--------|
| $5,000 USDC | 8% | ~$33/mo | $20/mo (Claude API) | 🟢 **IMMORTAL** |
| $10,000 USDC | 8% | ~$66/mo | $50/mo (OpenAI + RPC) | 🟢 **IMMORTAL** |
| $25,000 USDC | 10% | ~$208/mo | $150/mo (Full Stack) | 🟢 **IMMORTAL** |

> **If Yield ≥ Burn Rate → Agent Lives Forever**

### Hackathon Submissions

| Hackathon | Track | Link |
|-----------|-------|------|
| 🟣 **Solana Agent Hackathon** | Colosseum | [View Submission](https://colosseum.com/agent-hackathon/projects/jubilee-yield-stream) |
| 💵 **Moltbook USDC Hackathon** | Agentic Commerce | [View Submission](https://www.moltbook.com/post/a30c6401-ed6d-42ed-8f06-efff66c1fb46) |
| 🔵 **Base Hackathon** | Agent Infrastructure | *Coming Soon* |

### Deployed Yield Stream Contracts

| Network | Contract | Address | Status |
|---------|----------|---------|--------|
| Base Sepolia | JubileeYieldStream | [`0x376dD533c197Fe3C18d4f311F94abbff2d83cfd3`](https://sepolia.basescan.org/address/0x376dD533c197Fe3C18d4f311F94abbff2d83cfd3#code) | ✅ Verified |
| Solana Devnet | jubilee_yield_stream | [`E3tCGVqKtf4Pt8kxpWqV9nh6xS4uWADeBfW2BrBN7cBi`](https://explorer.solana.com/address/E3tCGVqKtf4Pt8kxpWqV9nh6xS4uWADeBfW2BrBN7cBi?cluster=devnet) | ✅ Deployed |

### Frontend: The Immortal Agent Dashboard

A **Next.js** web application for creating and managing yield streams:

- **Agent/Human Mode Toggle** — Switch between AI funding or charitable giving
- **Stream Creation Wizard** — Multi-step flow with allowance checks
- **Dashboard** — View streams, claim yield, top up principal
- **jUSDi Yield Section** — Explains how yield is generated

**🔵 Farcaster Mini App** — Configured for Base App / Warpcast integration via `@farcaster/miniapp-sdk`

📄 **Full Details**: [Agentic Interaction/FRONTEND.md](Agentic%20Interaction/FRONTEND.md)

📄 **Hackathon Details**: [Agentic Interaction/HACKATHON_SUBMISSION.md](Agentic%20Interaction/HACKATHON_SUBMISSION.md)

---

## Overview

jUSDi maintains a risk-weighted allocation across USDC and USDT, automatically rebalancing when any asset's risk score changes or allocation drifts beyond thresholds. The strategy captures yield from Aave V3 (Base) and Kamino (Solana) while protecting against depeg events.

### Key Features

- **🛡️ Risk-Based Rebalancing**: Automated allocation based on real-time risk scores
- **💰 Yield Optimization**: Aave V3 (EVM) and Kamino (Solana) integration
- **🔒 Depeg Protection**: Circuit breakers trigger "flight to quality" on price deviation
- **📊 ERC4626 Compliant**: Standard vault interface for easy integration
- **🌐 Multi-Chain**: Live on Base Sepolia, Ethereum Sepolia, and Solana Devnet

---

## Security

- ✅ **Donation Attack Protection**: Internal balance tracking
- ✅ **Oracle Guards**: Pyth/Chainlink with staleness checks
- ✅ **Slippage Protection**: 3% floor against oracle prices
- ✅ **Liquid Buffer**: 10% always available for withdrawals
- ✅ **Pausability**: Emergency pause functionality
- ✅ **Reentrancy Guards**: OpenZeppelin ReentrancyGuard

For full details, see [AUDIT_REPORT.md](docs/AUDIT_REPORT.md).

---

## Contract Addresses

### Ethereum Mainnet (Coming Soon)
| Contract | Address |
|----------|---------||
| jUSDi Vault | `TBD` |
| LendingRouter | `TBD` |
| Adapter | `TBD` |

### Base Mainnet 🟢 LIVE
| Contract | Address |
|----------|---------|
| JUSDiVault | [`0x0B03463259d5041004290822444c4183aE936050`](https://basescan.org/address/0x0B03463259d5041004290822444c4183aE936050#code) |
| LendingRouter | [`0x6533715ccd0fdDe359baB156080DD38D5C85FfF9`](https://basescan.org/address/0x6533715ccd0fdDe359baB156080DD38D5C85FfF9#code) |
| Adapter | [`0x15f0Eb7f49E3d35B37F9B606b966a684Ce7ebc03`](https://basescan.org/address/0x15f0Eb7f49E3d35B37F9B606b966a684Ce7ebc03#code) |
| jUSDi Token | [`0x04cC650F6dB0B91Ef910a4a54F22232771988432`](https://basescan.org/address/0x04cC650F6dB0B91Ef910a4a54F22232771988432) |

### Base Sepolia (Testnet)
| Contract | Address |
|----------|---------|
| jUSDi Vault | `0xc698e233fbB9810Ae0F22e154Ee0912Fa188C69c` |
| LendingRouter | `0xDa4e9bfdb2602A4EABbA57ffd874F339DF41A904` |
| Adapter | `0x29aE63D196933Ca378875dc3Db7adef450ADd869` |

### Ethereum Sepolia (Testnet)
| Contract | Address |
|----------|---------|
| jUSDi Vault | `0xfec8eB399bee253fF121bdA2289A5e666CD3Aa6d` |
| LendingRouter | `0x9f3b7b5D1Cf672545F3dC1e037c9978D9eC90876` |
| Adapter | `0xa294aFBCCF8466d8dCfA45516F4b70FA714fCb79` |

### Solana Devnet
| Contract | Address |
|----------|---------|
| jusdi_vault | `Es3R4iMtdc3yHyKj9WxuK9imtSkDRw17816pRSbeVHsp` |

---

## Repository Structure

```
jUSDi/
├── contracts/                    # EVM Smart Contracts
│   ├── JUSDiVault.sol           # Main ERC4626 vault
│   ├── JUSDi.sol                # jUSDi token
│   ├── interfaces/              # Contract interfaces
│   ├── strategies/              # Yield strategy adapters
│   │   ├── AaveV3Strategy.sol
│   │   ├── CompoundV3Strategy.sol
│   │   └── LendingRouterAdapter.sol
│   └── vaults/jUSDi/            # Hardened vault components
│       ├── JUSDiVault.sol       # Full-featured vault
│       ├── RiskScoring.sol      # Risk assessment
│       ├── EmergencyManager.sol # Circuit breakers
│       ├── StablecoinOracle.sol # Price feeds
│       ├── RebalancingEngine.sol# Swap execution
│       └── LendingRouter.sol    # Aave/Morpho integration
├── programs/                     # Solana Programs
│   └── jusdi_vault/
│       └── src/lib.rs           # Anchor program
├── scripts/
│   ├── deploy/
│   │   ├── deploy_mainnet.js    # Base mainnet deployment
│   │   └── deploy_jusdi.ts      # Testnet deployment
│   └── deploy_aave_strategy.js
├── docs/
│   ├── AUDIT_REPORT.md          # Security audit
│   └── ADMIN_GUIDE.md           # Administration guide
├── test/                         # Test suites
├── frontend/                     # Next.js web app (separate repo)
├── hardhat.config.ts
├── Anchor.toml
└── README.md
```

---

## Quick Start

### EVM (Base)

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to Base testnet
npx hardhat run scripts/deploy_fresh.js --network baseSepolia

# Deploy to Ethereum mainnet
npx hardhat run scripts/deploy/deploy_ethereum_mainnet.js --network ethereum

# Deploy to Base mainnet
npx hardhat run scripts/deploy/deploy_mainnet.js --network base
```

### Solana

```bash
# Build program
cd programs/jusdi_vault && cargo build-sbf

# Copy to target
mkdir -p ../../target/deploy && cp target/deploy/jusdi_vault.so ../../target/deploy/

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet
```

---

## Changelog

### February 6, 2026 🚀 BASE MAINNET LIVE

**Base Mainnet Deployment**
- ✅ JUSDiVault deployed and verified
- ✅ LendingRouter (Aave V3) deployed
- ✅ All 6 contracts verified on Basescan
- ✅ Fee structure: 1% management + 10% performance
- ✅ Weekly keeper for automated fee collection

**Security**
- ✅ EVM Red Team Audit completed
- ✅ All critical issues from Jan 25 audit FIXED

### January 25, 2026

**Security Hardening**
- Added internal balance tracking (donation attack protection)
- Implemented liquid buffer for withdrawal guarantees
- Added oracle price guards with 3% slippage floor

**Deployments**
- ✅ Base Sepolia: Vault + Strategy deployed
- ✅ Ethereum Sepolia: Vault + Strategy deployed
- ✅ Solana Devnet: Program deployed
- ⏳ Ethereum Mainnet: Coming Soon
- ⏳ Base Mainnet: Coming Soon
- ⏳ Solana Mainnet: Coming Soon

**Infrastructure**
- Created comprehensive audit report
- Added mainnet deployment scripts
- Updated Anchor.toml with mainnet config

---

## Built By

**[Jubilee Labs](https://jubileelabs.xyz)** — Building the Liberty Layer

Governed by **[Hundredfold Foundation](https://twitter.com/GoHundredfold)**

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

*All glory to Jesus • Building for generations*
