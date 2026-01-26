# jUSDi Audit Report

**Date:** 2026-01-25
**Auditor:** Antigravity (Mercenary Mode)
**Subject:** `jUSDi` Core Contracts

---

## 1. Executive Summary

| Contract | Score | Risk Level |
|----------|-------|------------|
| `JUSDi.sol` | 95/100 | Low |
| `JUSDiVault.sol` | 40/100 | **CRITICAL** |
| `AaveV3Strategy.sol` | 88/100 | Medium |

**Overall Score: 74/100 (FAIL)**
*Threshold: 92/100*

**Verdict:** 🛑 **DO NOT DEPLOY**

---

## 2. Findings

### 🚨 Critical Vulnerabilities (Must Fix)

#### [C-01] Vault Missing Withdraw Function (Rug Risk)
**Contract:** `JUSDiVault.sol`
**Description:** The `JUSDiVault` accepts deposits via `deposit()` but has **NO withdraw function**. Users can put money in, but they can **NEVER** get it out.
**Exploit:** Accidental permanent lock of user funds.
**Remediation:** Implement `withdraw()` and `redeem()` functions following ERC4626 standards.

#### [C-02] Vault Logic is Empty (State Desync)
**Contract:** `JUSDiVault.sol`
**Description:** The `deposit` function transfers assets to itself and increments `totalAssets`, but it **DOES NOT mint shares** or call the `JUSDi` token contract to mint anything.
**Exploit:** Users deposit funds and receive nothing in return. The `JUSDi` token supply remains 0.
**Remediation:** Call `JUSDi(token).mint(msg.sender, shares)` inside deposit.

### ⚠️ Medium Vulnerabilities

#### [M-01] Strategy Harvest Return Value
**Contract:** `AaveV3Strategy.sol`
**Description:** `harvest()` returns hardcoded `0`. While Aave V3 is auto-compounding (aTokens grow in balance), the strategy should calculate the profit (`currentBalance - depositedPrincipal`) so the Vault knows how much yield was generated for accounting/fees.
**Remediation:** Track `totalDeposited` and return `balance - totalDeposited`.

#### [M-02] Missing Slippage Protection
**Contract:** General
**Description:** No slippage protection on deposits or potential future swaps.
**Remediation:** Add `minSharesOut` to deposit functions.

---

## 3. Recommendations

1.  **Rewrite `JUSDiVault.sol`:** It is currently a placeholder. It needs to be a full **ERC4626** implementation.
2.  **Connect Token & Vault:** The Vault needs `MINTER_ROLE` on the `JUSDi` token.
3.  **Strategy Accounting:** Strategies need to track principal vs interest for accurate APY reporting.

---

*“Trust, but verify. Then verify again.”*
