# jUSDi Admin Guide

## Overview

This guide covers administration of the jUSDi protocol on both Base (EVM) and Solana.

---

## EVM Administration (Base)

### Contract Addresses

**Ethereum Mainnet**
| Contract | Address |
|----------|---------|
| JUSDiVault | `TBD` |
| LendingRouter | `TBD` |
| LendingRouterAdapter | `TBD` |

**Base Mainnet**
| Contract | Address |
|----------|---------|
| JUSDiVault | `TBD` |
| LendingRouter | `TBD` |
| LendingRouterAdapter | `TBD` |

**Testnet (Base Sepolia)**
| Contract | Address |
|----------|---------|
| JUSDiVault | `0xc698e233fbB9810Ae0F22e154Ee0912Fa188C69c` |
| LendingRouter | `0xDa4e9bfdb2602A4EABbA57ffd874F339DF41A904` |
| LendingRouterAdapter | `0x29aE63D196933Ca378875dc3Db7adef450ADd869` |

**Testnet (Ethereum Sepolia)**
| Contract | Address |
|----------|---------|
| JUSDiVault | `0xfec8eB399bee253fF121bdA2289A5e666CD3Aa6d` |
| LendingRouter | `0x9f3b7b5D1Cf672545F3dC1e037c9978D9eC90876` |
| LendingRouterAdapter | `0xa294aFBCCF8466d8dCfA45516F4b70FA714fCb79` |

**Mainnet (Base)**
> Deploy using `npx hardhat run scripts/deploy/deploy_mainnet.js --network base`

### Admin Functions

#### Pause/Unpause Vault
```solidity
// Pause all deposits/withdrawals
vault.pause();

// Resume operations
vault.unpause();
```

#### Change Strategy
```solidity
// Replace yield strategy (withdraws all assets first)
vault.setStrategy(newStrategyAddress);
```

#### Toggle Aave/Morpho
```solidity
// On the LendingRouterAdapter
adapter.setUseMorpho(true);  // Switch to Morpho
adapter.setUseMorpho(false); // Switch to Aave
```

### Emergency Procedures

1. **Security Incident**: Call `vault.pause()` immediately
2. **Strategy Failure**: Deploy new adapter, call `vault.setStrategy()`
3. **Oracle Issues**: Pause and wait for oracle recovery

---

## Solana Administration

### Program ID
```
Es3R4iMtdc3yHyKj9WxuK9imtSkDRw17816pRSbeVHsp
```

### Admin Instructions

#### Initialize Vault
```typescript
await program.methods
  .initializeVault(1000) // 10% liquid buffer
  .accounts({
    admin: wallet.publicKey,
    vault: vaultPDA,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

#### Add Stablecoin
```typescript
await program.methods
  .addStablecoin(pythFeed, riskScore, maxAllocationBps)
  .accounts({
    admin: wallet.publicKey,
    vault: vaultPDA,
    stableMint: usdcMint,
    metadata: metadataPDA,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

#### Rebalance via Jupiter
```typescript
await program.methods
  .rebalanceJupiter(amountIn, minAmountOut)
  .accounts({
    admin: wallet.publicKey,
    vault: vaultPDA,
    jupiterProgram: JUPITER_PROGRAM_ID,
    pythPriceIn: pythUsdcFeed,
    pythPriceOut: pythUsdtFeed,
    // ... remaining accounts
  })
  .remainingAccounts(jupiterSwapAccounts)
  .rpc();
```

### Emergency Procedures

1. **Pause Vault**: Set `is_paused = true` via admin instruction
2. **Upgrade Program**: Use `anchor upgrade` with upgrade authority

---

## Monitoring

### Key Metrics to Track
- Total Value Locked (TVL)
- Share price changes
- Large deposit/withdrawal events
- Strategy health (Aave/Kamino status)

### Recommended Tools
- **EVM**: Tenderly, OpenZeppelin Defender
- **Solana**: Helius, Shyft

---

*Last Updated: January 25, 2026*
