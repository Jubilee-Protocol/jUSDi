# jUSDi Red Team Security Audit (EVM - Base Mainnet)

## Overview
> **Date**: February 6, 2026
> **Status**: 🟢 **VERIFIED**
> **Target**: jUSDi Vault on Base Mainnet
> **Contracts Verified**: 6/6 on Basescan

This document outlines the "Red Team" security assessment for the jUSDi EVM vault deployed to Base Mainnet.

---

## Attack Vectors & Stress Tests

### 1. Reentrancy Attack
*   **Vector**: Calling `withdraw()` recursively via malicious token callback
*   **Test**: Simulated reentrant call during ERC20 transfer
*   **Result**: ✅ **PASSED**. OpenZeppelin `ReentrancyGuard` blocks reentrant calls with `ReentrancyGuard: reentrant call` error.

### 2. Donation Attack (Vault Inflation)
*   **Vector**: Attacker donates tokens directly to vault to manipulate share price
*   **Test**: Direct transfer of 1M USDC to vault address
*   **Result**: ✅ **PASSED**. Vault uses internal `_managedBalances` tracking, not `balanceOf(this)`. Donations don't affect share calculations.

### 3. Oracle Price Manipulation
*   **Vector**: Flash loan to manipulate Chainlink oracle prices
*   **Test**: Code review of oracle consumption
*   **Result**: ✅ **PASSED**. Chainlink oracles are off-chain aggregated and resistant to in-block manipulation. Staleness check (1 hour threshold) prevents stale price attacks.

### 4. Share Price Sandwich Attack
*   **Vector**: Front-run large deposit to steal yield
*   **Test**: Simulated sandwich on deposit transaction
*   **Result**: ⚠️ **PARTIAL**. No explicit slippage parameter on `deposit()`, but ERC4626 uses pro-rata shares which limits attack profitability. **Recommendation**: Add `minSharesOut` parameter.

### 5. Fee Drain Attack
*   **Vector**: Malicious owner drains vault via excessive fees
*   **Test**: Attempted to set fees above maximum
*   **Result**: ✅ **PASSED**. `setFees()` enforces `managementFeeBps <= 500` (5%) and `performanceFeeBps <= 2000` (20%). Hardcoded caps prevent abuse.

### 6. Privilege Escalation
*   **Vector**: Unauthorized caller accesses `onlyOwner` functions
*   **Test**: Call `setTreasury()` from non-owner address
*   **Result**: ✅ **PASSED**. OpenZeppelin `Ownable` correctly reverts with `OwnableUnauthorizedAccount` error.

### 7. Emergency Pause Bypass
*   **Vector**: Operations continue during emergency pause
*   **Test**: Attempted deposit while `EmergencyManager.isPaused = true`
*   **Result**: ✅ **PASSED**. `checkCircuitBreaker()` correctly returns `true` during pause, blocking risky operations.

---

## Critical Risk Assessment

| Risk Area | Status | Mitigation |
| :--- | :--- | :--- |
| **Reentrancy** | **LOW** | ReentrancyGuard on all state-changing functions |
| **Price Manipulation** | **LOW** | Chainlink oracle with staleness checks |
| **Share Inflation** | **LOW** | Internal balance tracking |
| **Fee Abuse** | **LOW** | Hardcoded maximums (5%, 20%) |
| **Owner Key Compromise** | **MEDIUM** | Use multisig (Safe/Squads) for owner |
| **Oracle Failure** | **MEDIUM** | Configure backup or emergency mode |

---

## Deployed & Verified Contracts

| Contract | Address | Basescan |
|----------|---------|----------|
| JUSDiVault | `0x0B03463259d5041004290822444c4183aE936050` | [✅ Verified](https://basescan.org/address/0x0B03463259d5041004290822444c4183aE936050#code) |
| LendingRouter | `0x6533715ccd0fdDe359baB156080DD38D5C85FfF9` | [✅ Verified](https://basescan.org/address/0x6533715ccd0fdDe359baB156080DD38D5C85FfF9#code) |
| LendingRouterAdapter | `0x15f0Eb7f49E3d35B37F9B606b966a684Ce7ebc03` | [✅ Verified](https://basescan.org/address/0x15f0Eb7f49E3d35B37F9B606b966a684Ce7ebc03#code) |
| StablecoinOracle | `0x081433E5DbfAeBffBdDc1F69B9AB372D7A00fA7a` | [✅ Verified](https://basescan.org/address/0x081433E5DbfAeBffBdDc1F69B9AB372D7A00fA7a#code) |
| RiskScoring | `0x79Bc0A789FC14919ee1698D115624600658efc4e` | [✅ Verified](https://basescan.org/address/0x79Bc0A789FC14919ee1698D115624600658efc4e#code) |
| EmergencyManager | `0x2B271251D0215753C3bcF56383Fd6D07765a6d90` | [✅ Verified](https://basescan.org/address/0x2B271251D0215753C3bcF56383Fd6D07765a6d90#code) |

---

## Recommendations

1. **Multisig Owner**: Transfer ownership to a Safe multisig for production
2. **Configure Price Feeds**: Set Chainlink USDC/USD and USDT/USD feeds
3. **Set Risk Scores**: Initialize USDC/USDT scores in RiskScoring contract
4. **External Audit**: Consider OpenZeppelin or Trail of Bits for formal audit

---

*"Trust in the LORD with all your heart and lean not on your own understanding."* — Proverbs 3:5
