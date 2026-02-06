# jUSDi Keeper

Automated rebalancing keeper for jUSDi vault.

## GitHub Actions

The keeper runs automatically via GitHub Actions every 6 hours. See `.github/workflows/keeper.yml`.

### Required Secrets

Configure in GitHub → Settings → Secrets → Actions:

| Secret | Description |
|--------|-------------|
| `BASE_RPC_URL` | Base mainnet RPC endpoint |
| `JUSDI_VAULT_ADDRESS` | Deployed vault contract address |
| `KEEPER_PRIVATE_KEY` | Private key for keeper wallet |

### Manual Trigger

You can manually trigger a rebalance via GitHub Actions:
1. Go to Actions → "jUSDi Keeper - Rebalancing"
2. Click "Run workflow"
3. Optionally check "Force rebalance regardless of drift"

## Gelato Migration

When ready to migrate to Gelato Web3 Functions:

1. Deploy the drift check logic as a Gelato Resolver
2. Create a Gelato Task pointing to `vault.rebalance()`
3. Gelato will call automatically when resolver returns true
4. Disable GitHub Actions workflow

The keeper scripts are standalone and compatible with Gelato's execution model.
