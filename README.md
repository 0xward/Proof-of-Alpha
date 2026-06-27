<div align="center">

```
██████╗ ██████╗  ██████╗  ██████╗ ███████╗     ██████╗ ███████╗     █████╗ ██╗     ██████╗ ██╗  ██╗ █████╗
██╔══██╗██╔══██╗██╔═══██╗██╔═══██╗██╔════╝    ██╔═══██╗██╔════╝    ██╔══██╗██║     ██╔══██╗██║  ██║██╔══██╗
██████╔╝██████╔╝██║   ██║██║   ██║█████╗      ██║   ██║█████╗      ███████║██║     ██████╔╝███████║███████║
██╔═══╝ ██╔══██╗██║   ██║██║   ██║██╔══╝      ██║   ██║██╔══╝      ██╔══██║██║     ██╔═══╝ ██╔══██║██╔══██║
██║     ██║  ██║╚██████╔╝╚██████╔╝██║         ╚██████╔╝██║         ██║  ██║███████╗██║     ██║  ██║██║  ██║
╚═╝     ╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚═╝          ╚═════╝ ╚═╝         ╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝
```

**ANALYZE. COMPETE. EARN. PROVE YOUR ALPHA ON-CHAIN.**

[![Celo](https://img.shields.io/badge/Celo-Mainnet-FCFF52?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiNGQ0ZGNTIiLz48L3N2Zz4=)](https://celo.org)
[![Aave V3](https://img.shields.io/badge/Aave-V3-B6509E?style=flat-square)](https://aave.com)
[![MiniPay](https://img.shields.io/badge/MiniPay-Compatible-00D4AA?style=flat-square)](https://www.opera.com/mini/minipay)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](./LICENSE)
[![Version](https://img.shields.io/badge/version-3.0.0-FFB800?style=flat-square)](#)

> Built for [Proof of Ship](https://talent.protocol) · Powered by Celo Mainnet · Optimized for MiniPay

</div>

---

## What is Proof of Alpha?

Proof of Alpha is an on-chain intelligence terminal for EVM analysts, traders, and DeFi participants — built natively on Celo and optimized for MiniPay.

It combines three core features into a single app:

| Module | Description |
|--------|-------------|
| 🔍 **Forensic Terminal** | Paste any EVM transaction hash. AI scores it 0–100, breaks down value flows, gas behavior, and contract interactions. Mint a Soulbound Token with your tier. |
| ⚔ **Alpha Arena** | Daily 24h competition. A new whale wallet is revealed each day. Find their best transaction, submit it, earn points, climb the leaderboard. |
| ◈ **Alpha Vault** | Supply USDm, USDT, CELO, USDC, or WETH to Aave V3 on Celo. Earn real DeFi yield + daily `$PROOF` points. Withdraw anytime. |

---

## On-Chain Infrastructure

| Contract | Address | Network |
|----------|---------|---------|
| **SBT (ProofOfAlpha.sol)** | [`0x80E98C8...`](https://celoscan.io/address/0x80E98C8a0d4aeF4b800E861298Eca15C97Cf1c6E) | Celo Mainnet |
| **Claim Manager** | Configured via `CLAIM_CONTRACT_ADDRESS` env | Celo Mainnet |
| **AI Agent (ERC-8004)** | [`0xc4809E4...`](https://celoscan.io/address/0xc4809E491b1Ea88FDAe63CfE9d7906F285b861c0) | Celo Mainnet |
| **Aave V3 Pool** | Celo Mainnet | Integrated via Aave SDK |

---

## New in v3.0.0

- 🟢 **USDm (Mento Dollar)** replaces cUSD display name — same contract, updated logo and branding
- 📱 **MiniPay Onboarding** — 3-step modal for first-time users, shown once
- 📊 **Mini Activity Feed** — wallet stats visible on landing after connect
- 🔥 **Daily Streak Bonus** — earn bonus points at 3 / 7 / 14 / 30 day milestones
- 🔗 **Referral System** — `?ref=0x...` link gives +50 pts to referee, +100 pts to referrer
- 🃏 **Share Card Generator** — visual 1200×630 card shareable to Twitter/X or via Web Share API
- 🧠 **Wallet Intelligence Report** — SBT-gated AI deep analysis on any EVM wallet
- ◈ **cUSD / USDm banner** — highlighted at top of vault for MiniPay stablecoin holders
- 🐛 **Fixes** — email, version consistency, metadata permissions cleaned

---

## Tech Stack

```
Frontend    React 18 · Vite · Tailwind CSS · Motion (Framer) · Wagmi · Viem
Backend     Express (TypeScript) · Firebase Admin SDK · Groq AI (LLaMA 3.3 70B)
Blockchain  Celo Mainnet · Aave V3 · ERC-5484 Soulbound Token
Auth        Wallet-based (Reown / WalletConnect) · MiniPay auto-detect
Storage     Firebase Firestore · localStorage (onboarding state)
Deploy      Vercel (frontend + serverless) · GitHub Actions (cron jobs)
```

---

## Quick Start

### Prerequisites

- Node.js 18+
- A Celo wallet (MetaMask, MiniPay, or any WalletConnect-compatible wallet)
- Firebase project with Firestore enabled
- Groq API key (free at [console.groq.com](https://console.groq.com))

### 1. Clone & Install

```bash
git clone https://github.com/your-username/proof-of-alpha.git
cd proof-of-alpha
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Reown (WalletConnect)
VITE_REOWN_PROJECT_ID=your_project_id_from_cloud.reown.com

# AI Engine
GROQ_API_KEY=your_groq_api_key

# Firebase Admin
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Contracts
ADMIN_PRIVATE_KEY=0x_your_admin_wallet_private_key
CLAIM_CONTRACT_ADDRESS=0x_deployed_claim_manager_address
VITE_CLAIM_CONTRACT_ADDRESS=0x_same_as_above

# Cron protection
ADMIN_CRON_KEY=run_openssl_rand_hex_32

# Optional (for Wallet Intelligence Report)
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 3. Run Locally

```bash
npm run dev
# → http://localhost:3000
```

### 4. Build & Deploy

```bash
npm run build
npm run start

# Or deploy to Vercel
vercel --prod
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | — | Health check |
| POST | `/api/forensic` | — | AI TX analysis (rate-limited) |
| GET | `/api/hunt/target` | — | Today's hunt target wallet |
| POST | `/api/hunt/submit-v2` | — | Submit a hunt TX |
| GET | `/api/hunt/round` | — | Current leaderboard + round |
| POST | `/api/hunt/judge` | `x-admin-key` | Judge today's round |
| GET | `/api/vault/apy` | — | Live Aave V3 APYs (5 assets) |
| POST | `/api/vault/deposit-record` | — | Record deposit, start point accrual |
| POST | `/api/vault/withdraw-record` | — | Record withdrawal, calc earned pts |
| POST | `/api/vault/snapshot` | `x-admin-key` | Daily point snapshot (cron) |
| POST | `/api/weekly/settle` | `x-admin-key` | Sunday `$PROOF` settlement (cron) |
| GET | `/api/profile/:wallet` | — | Full user profile |
| PUT | `/api/profile/display-name` | — | Update display name |
| GET | `/api/claim/:wallet` | — | Claimable `$PROOF` data |
| POST | `/api/claim/mark-claimed` | — | Mark claim complete |
| POST | `/api/referral/attribute` | — | Attribute referral (on wallet connect) |
| GET | `/api/referral/stats/:wallet` | — | Referral stats for wallet |
| POST | `/api/wallet-intelligence` | SBT | AI wallet deep analysis (SBT-gated) |
| POST | `/api/streak/check` | — | Check and award streak bonus |

---

## Points System

| Source | Rate | Trigger |
|--------|------|---------|
| Alpha Hunt win | +100 pts | Daily UTC round |
| CELO vault | +2 pts / token / day | Daily snapshot |
| USDC vault | +1 pt / token / day | Daily snapshot |
| USDT vault | +1 pt / token / day | Daily snapshot |
| USDm vault | +1 pt / token / day | Daily snapshot |
| WETH vault | +5 pts / token / day | Daily snapshot |
| Referral sent | +100 pts | When referee mints SBT |
| Referral received | +50 pts | On first wallet connect |
| 3-day streak | +50 pts | Automatic |
| 7-day streak | +100 pts | Automatic |
| 14-day streak | +150 pts | Automatic |
| 30-day streak | +200 pts | Automatic |
| Conversion | 100 pts → 50 `$PROOF` | Every Sunday UTC |

---

## Cron Jobs

Set up via Vercel Cron or GitHub Actions:

```bash
# Daily 00:00 UTC — Vault snapshot
POST /api/vault/snapshot  (x-admin-key header)

# Daily 23:59 UTC — Judge Hunt round
POST /api/hunt/judge  (x-admin-key header)

# Sunday 01:00 UTC — Weekly $PROOF settlement
POST /api/weekly/settle  (x-admin-key header)
```

See `SETUP.md` for full cron configuration with GitHub Actions.

---

## Supported Networks (Forensic Terminal)

Ethereum · Celo · Base · Arbitrum · Optimism · Polygon · BNB Chain · Avalanche

---

## MiniPay Integration

Proof of Alpha is built for MiniPay first:

- Auto-detects MiniPay environment via `isMiniPay()` check
- USDm and USDT surfaced first in vault (primary MiniPay stablecoins)  
- First-time onboarding modal (3 steps, shown once)
- Full Web Share API support for share cards
- Zero `camera`, `microphone`, or `geolocation` permissions required

---

## Smart Contracts (Key Functions)

```solidity
// ProofClaimManager.sol
setClaimable(address[] wallets, uint256[] amounts)  // owner — called by /api/weekly/settle
claim()                                              // user — receive $PROOF
fundContract(uint256 amount)                         // owner — fund before settlement
contractBalance() → uint256
getClaimable(address wallet) → uint256

// ProofOfAlpha.sol (SBT — ERC-5484)
mint(address to, string tokenURI)   // owner — called after forensic analysis
balanceOf(address owner) → uint256
tokenURI(uint256 tokenId) → string
```

---

## License

MIT — see [LICENSE](./LICENSE)

---

## Built With

- [Celo](https://celo.org) — Mobile-first L2 blockchain
- [Aave V3](https://aave.com) — DeFi yield on Celo
- [Groq](https://groq.com) — Ultra-fast LLaMA inference
- [Firebase](https://firebase.google.com) — Firestore + Admin SDK
- [Wagmi](https://wagmi.sh) + [Viem](https://viem.sh) — Ethereum toolkit
- [Reown](https://reown.com) — WalletConnect v2
- [Mento](https://mento.org) — USDm (formerly cUSD) stablecoin

---

<div align="center">
<sub>PROOF OF ALPHA // TERMINAL_V3.0.0 // CELO_MAINNET // AAVE_V3</sub>
</div>
