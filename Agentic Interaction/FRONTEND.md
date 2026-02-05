# Jubilee Yield Stream Frontend

**The Immortal Agent Dashboard** — A Next.js web application for creating and managing perpetual yield streams.

## Overview

This frontend provides:
- **Agent/Human Mode Toggle** — Switch between AI agent funding and charitable giving use cases
- **Stream Creation Wizard** — Multi-step flow to create yield streams
- **Dashboard** — View and manage active streams, claim yield, top up principal
- **jUSDi Yield Explanation** — Interactive section explaining how yield is generated

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 | React framework with App Router |
| RainbowKit | Wallet connection UI |
| wagmi/viem | Ethereum interactions |
| Farcaster Mini App SDK | Base App / Warpcast integration |
| Tailwind CSS v4 | Styling |

## Live Endpoints

| Network | Frontend | Status |
|---------|----------|--------|
| Local Dev | http://localhost:3000 | ✅ Running |
| Base Sepolia | Netlify deployment pending | 🔄 Ready to Deploy |
| Base Mainnet | Production deployment | ⏳ After Testnet |

## Farcaster Mini App

The frontend is configured as a **Farcaster Mini App** for seamless integration with Base App and Warpcast:

- `public/manifest.json` — Mini app manifest
- Wallet auto-connect via `farcasterMiniApp()` connector
- Optimized for embedded frame experience

## Quick Start

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Contract Integration

The frontend connects to deployed JubileeYieldStream contracts:

| Network | Contract |
|---------|----------|
| Base Sepolia | `0x376dD533c197Fe3C18d4f311F94abbff2d83cfd3` |
| Mock USDC | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

## Key Components

| Component | File | Purpose |
|-----------|------|---------|
| Header | `src/components/Header.tsx` | Navigation with Jubilee logo |
| ModeContext | `src/context/ModeContext.tsx` | Agent/Human mode state |
| Dashboard | `src/app/dashboard/page.tsx` | Stream management |
| Create Stream | `src/app/create/page.tsx` | Stream creation wizard |

## Environment Variables

```env
NEXT_PUBLIC_WALLETCONNECT_ID=your_project_id
```

## Related Files

- [JubileeYieldStream.sol](./contracts/JubileeYieldStream.sol) — EVM contract
- [deployment-base-sepolia.json](./deployment-base-sepolia.json) — Deployment info
- [HACKATHON_SUBMISSION.md](./HACKATHON_SUBMISSION.md) — Full submission details
