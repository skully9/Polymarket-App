# Polymarket Paper Arb Bot

A simple Next.js (App Router) app that scans Polymarket public data for 2-leg YES/NO arbitrage and **paper trades only**. All data is pulled from public endpoints; no wallets, no signing, and no real orders.

## Features
- Market browser from Polymarket Gamma API with search + volume filter
- Live top-of-book snapshot (YES and NO) via CLOB read-only endpoints, with graceful fallback for auth/429
- Opportunity scanner (Top N by volume) with configurable edge, order size, poll interval
- Paper trading engine with atomic two-leg safety, localStorage persistence, activity logs, and manual close
- Minimal Tailwind UI; runs fully in the browser against local API routes to avoid CORS

## Getting started
```bash
npm install
npm run dev
# open http://localhost:3000
```

If your npm registry blocks older versions, the project now targets the latest patched Next.js 15.x toolchain to avoid the 14.x security advisory. If you still see registry or proxy errors, retry with:

```bash
npm install --registry=https://registry.npmjs.org
```

## Configuration
Environment variables (optional):
- `NEXT_PUBLIC_GAMMA_BASE` (default `https://gamma-api.polymarket.com`)
- `NEXT_PUBLIC_CLOB_BASE` (default `https://clob.polymarket.com`)

Endpoints used:
- `GET /api/markets` → proxies Gamma `GET /markets?limit=...&query=...&category=...`
- `GET /api/orderbook?marketId=...` → tries CLOB `orderbook?market=...&limit=1` then `markets/{id}/orderbook?limit=1`

## Paper fill simulation
- BUY fills at best ask if `limit_price >= ask` and size available; SELL fills at best bid if `limit_price <= bid`
- Fill price equals book price (not limit) to stay conservative
- Atomic two-leg safety: if only one leg fills, immediately try to unwind it at best bid and mark as `FAILED_ATOMIC`
- Positions track average cost per leg; cash and logs are stored in localStorage so refreshes persist

## Safety and limits
- Handles 429 by surfacing a rate-limit banner and slowing polling if desired
- If an orderbook endpoint requires auth (401/403), UI shows a warning but continues to show market list/last prices
- Everything is paper only; no private keys or real transactions
