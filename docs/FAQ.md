# jUSDi Frequently Asked Questions

## 📊 About jUSDi

### What is jUSDi?
jUSDi is the **Jubilee USD Index** — a yield-bearing stablecoin index token on Base. When you deposit USDC, you receive jUSDi tokens that automatically earn yield through Aave V3 lending.

### How does jUSDi generate yield?
90% of deposits are automatically deployed to **Aave V3** on Base mainnet. The vault maintains a 10% liquid buffer for instant withdrawals while the rest earns interest in real-time via Aave's aUSDC token.

### What's the expected APY?
**3-6% APY**, depending on Aave V3's lending rates. Rates fluctuate based on market demand for borrowing USDC.

### Is there a deposit cap?
**No.** There is no maximum deposit limit.

---

## 💰 Deposits & Withdrawals

### What's the minimum deposit?
While the contract has no enforced minimum, we recommend **at least $1 USDC** to make the gas costs worthwhile. Gas on Base is typically $0.01-0.05.

### How do I deposit?
1. Connect your wallet
2. Approve USDC spending (one-time)
3. Enter the amount you want to deposit
4. Click "Deposit"
5. Receive jUSDi tokens representing your share

### When does yield start accruing?
**Immediately!** As soon as your deposit is confirmed, 90% is deployed to Aave and starts earning interest.

### How do I withdraw?
1. Enter the amount you want to withdraw
2. Click "Withdraw"
3. Receive USDC back to your wallet

### What if there's not enough liquid funds?
The vault automatically pulls from Aave V3 to cover withdrawals. If Aave is temporarily illiquid (very rare), the transaction will use available liquid reserves.

---

## 🔐 Security & Fees

### Is jUSDi audited?
Yes! jUSDi has undergone internal security reviews including Red Team testing. The contracts are verified on Basescan and follow OpenZeppelin standards.

### What are the fees?
- **Management fee**: 1% annual (pro-rated)
- **Performance fee**: 10% of yield earned

Fees are collected weekly by an automated keeper.

### Who controls the treasury?
The deployer address currently controls the treasury. For production, we recommend transitioning to a **Safe multisig** for enhanced accountability.

### Is the code open source?
Yes! The full codebase is available on GitHub at [Jubilee-Protocol/jUSDi](https://github.com/Jubilee-Protocol/jUSDi).

---

## 🔧 Technical Details

### What network is jUSDi on?
**Base Mainnet** (Chain ID: 8453). Make sure you're connected to Base, not Base Sepolia testnet.

### What tokens does the vault hold?
- **USDC** (Native USDC on Base)
- **USDT** (Bridged USDT on Base)

The vault maintains a 50/50 target allocation with automated rebalancing.

### What's the share ratio?
Initially 1 jUSDi = 1 USDC. As yield accrues, the ratio increases (your jUSDi becomes worth more USDC over time).

### How does rebalancing work?
The vault uses a RebalancingEngine that swaps between USDC and USDT to maintain the target allocation. Rebalancing triggers when the allocation drifts beyond tolerance thresholds.

---

## 🏛️ Treasury Mode (Safe Wallet)

### What is Treasury Mode?
Treasury Mode allows organizations (churches, nonprofits, DAOs) to use jUSDi with **multi-signature accountability**. Multiple approvers must sign before funds move.

### How do I set up Treasury Mode?
1. Create a Safe wallet at [app.safe.global](https://app.safe.global)
2. Select Base as your network
3. Add signers (e.g., Pastor, Treasurer, Deacon)
4. Set approval threshold (e.g., 2 of 3)
5. Add jUSDi as a custom app in Safe

---

## 📞 Support

### Where can I get help?
- **GitHub Issues**: [jUSDi Repository](https://github.com/Jubilee-Protocol/jUSDi/issues)
- **Documentation**: [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- **One-Pager**: [ONEPAGER.md](./ONEPAGER.md)

### Contract Addresses (Base Mainnet)
| Contract | Address |
|----------|---------|
| JUSDiVault | `0x0B03463259d5041004290822444c4183aE936050` |
| jUSDi Token | `0x04cC650F6dB0B91Ef910a4a54F22232771988432` |
| LendingRouter | `0x6533715ccd0fdDe359baB156080DD38D5C85FfF9` |
| StablecoinOracle | `0x081433E5DbfAeBffBdDc1F69B9AB372D7A00fA7a` |
