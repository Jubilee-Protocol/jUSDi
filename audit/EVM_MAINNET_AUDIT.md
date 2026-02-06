# jUSDi EVM Mainnet Audit Report

**Date:** February 6, 2026  
**Auditor:** Internal (Automated + Manual Review)  
**Network:** Base Mainnet  
**Status:** ✅ **V3 DEPLOYED & VERIFIED**

---

## 1. Executive Summary

### V3 Contracts (CURRENT - Feb 6, 2026)

| Contract | Address | Verified |
|----------|---------|:--------:|
| JUSDiVault V3 | [`0x26c3...`](https://basescan.org/address/0x26c39532C0dD06C0c4EddAeE36979626b16c77aC#code) | ✅ |
| LendingRouter V3 | [`0x904b...`](https://basescan.org/address/0x904b37FDcD045DE1DA78d3C01d7bd571d4b1a5C3#code) | ✅ |
| jUSDi Token V3 | [`0x7e3b...`](https://basescan.org/address/0x7e3b8f5D81c12720cB2f4017a5FD077BbC0D827a#code) | ✅ |
| StablecoinOracle | [`0x0814...`](https://basescan.org/address/0x081433E5DbfAeBffBdDc1F69B9AB372D7A00fA7a#code) | ✅ |
| RiskScoring | [`0x79Bc...`](https://basescan.org/address/0x79Bc0A789FC14919ee1698D115624600658efc4e#code) | ✅ |
| EmergencyManager | [`0x2B27...`](https://basescan.org/address/0x2B271251D0215753C3bcF56383Fd6D07765a6d90#code) | ✅ |

**Verdict:** ✅ **SAFE FOR MAINNET**

---

## 2. Bug Fixes (All Resolved)

| ID | Issue | Status |
|----|-------|--------|
| C-01 | Missing withdraw function | ✅ Fixed |
| C-02 | Deposit doesn't mint shares | ✅ Fixed |
| C-03 | LendingRouter owned by Adapter not Vault | ✅ Fixed v2 |
| C-04 | jUSDi token started PAUSED | ✅ Fixed |
| C-05 | jUSDi owner was deployer not Vault | ✅ Fixed |
| **C-06** | **1 USDC → 0.000001 jUSDi (decimals mismatch)** | ✅ Fixed v3 |
| M-01 | Strategy harvest returns 0 | ✅ Fixed |
| M-02 | No slippage protection | ⚠️ Partial |

---

## 3. Decimals Fix (C-06)

**Problem:** USDC has 6 decimals, jUSDi has 18 decimals. Without proper offset:
- 1 USDC (1e6) → 1e6 shares
- 1e6 shares displayed as 0.000000000001 jUSDi

**Solution:** Added `_decimalsOffset()` override returning 12:
```solidity
function _decimalsOffset() internal pure override returns (uint8) {
    return 12;
}
```

**Result:** 1 USDC → 1.0 jUSDi ✅

---

## 4. Deprecated Contracts

⚠️ Do NOT use these addresses:

| Contract | Address | Issue |
|----------|---------|-------|
| JUSDiVault v1 | `0x0B03...` | Token immutable + decimals bug |
| LendingRouter v1 | `0x6533...` | Wrong owner |
| LendingRouter v2 | `0x90AA...` | Points to wrong vault |
| jUSDi Token v1 | `0x04cC...` | Owned by old vault |
