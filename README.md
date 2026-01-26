# jUSDi - The Stablecoin Index Fund

![Jubilee Protocol](https://img.shields.io/badge/Jubilee-Protocol-pink)
![License](https://img.shields.io/badge/license-MIT-blue)
![Ethereum](https://img.shields.io/badge/Ethereum-Sepolia-blue)
![Base](https://img.shields.io/badge/Base-Testnet-blue)
![Solana](https://img.shields.io/badge/Solana-Devnet-purple)

**jUSDi** is a diversified stablecoin index vault that manages exposure across USDC, USDT, DAI, and USDS with automated risk-based rebalancing and yield optimization. Earn **12-15% target APY** while maintaining maximum stablecoin safety.

**Testnets available on**: Ethereum Sepolia • Base Sepolia • Solana Devnet

---

## Overview

jUSDi maintains a risk-weighted allocation across top stablecoins, automatically rebalancing when any asset's risk score changes or allocation drifts beyond thresholds. The strategy captures yield from Aave V3 (Base) and Kamino (Solana) while protecting against depeg events.

### Key Features

- **🛡️ Risk-Based Rebalancing**: Automated allocation based on real-time risk scores
- **💰 Yield Optimization**: Aave V3 (EVM) and Kamino (Solana) integration
- **🔒 Depeg Protection**: Circuit breakers trigger "flight to quality" on price deviation
- **📊 ERC4626 Compliant**: Standard vault interface for easy integration
- **🌐 Multi-Chain**: Testnets live on Base and Solana

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

### Base Mainnet (Coming Soon)
| Contract | Address |
|----------|---------|
| jUSDi Vault | `TBD` |
| LendingRouter | `TBD` |
| Adapter | `TBD` |

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
