# jUSDi Emergency Procedures Specification

Ensuring capital preservation during market volatility or protocol failures.

## Trigger Conditions

Emergency procedures are triggered if any of the following occur:
1. **Critical Depeg:** Any constituent stablecoin depegs >2% for >15 minutes.
2. **Low Risk Score:** Any constituent stablecoin risk score drops below 50.
3. **Contagion:** Multiple stablecoins show >1% deviation simultaneously.
4. **Black Swan:** Regulatory actions, bank failures, or protocol hacks affecting constituents.
5. **Circuit Breakers:**
    - Withdrawal volume >500% of 7-day average in 1 hour.
    - Oracle price feeds stale for >5 minutes.

## Emergency Actions

When triggered, the `EmergencyManager` executes the following sequence:

1. **Pause Activity:** Immediate circuit breaker pauses all new deposits.
2. **Flight to Quality:** Automatically rebalance 100% of affected or all funds into the highest-rated stablecoin (typically USDC).
3. **Event Emission:** Emit `EmergencyRebalance` and `VaultPaused` events.
4. **Notification:** Alert admin and integrations via off-chain monitoring.
5. **Lockdown:** Manual admin review is required to unpause or resume normal operations.

## Recovery Procedure

1. **Post-Mortem:** Admin reviews market conditions and root cause of the trigger.
2. **Target Definition:** Admin sets new safe rebalancing targets.
3. **Execution:** Gradual rebalancing back to normal allocations to minimize slippage.
4. **Monitoring:** Enhanced 24/7 monitoring for 7 days post-recovery.
