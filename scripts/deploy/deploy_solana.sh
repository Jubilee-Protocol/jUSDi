#!/bin/bash

# jUSDi Solana Deployment Script
set -e

NETWORK=${1:-devnet}
PROGRAM_ID=$(anchor keys list | grep jusdi_vault | awk '{print $2}')

echo "Deploying jUSDi to Solana $NETWORK..."
echo "Program ID: $PROGRAM_ID"

# 1. Build the program
anchor build

# 2. Deploy to the specified network
anchor deploy --provider.cluster $NETWORK

# 3. Initialize the vault (This would typically be a script using @coral-xyz/anchor)
echo "Initialization required via Anchor client."
echo "Deployment complete on $NETWORK!"
