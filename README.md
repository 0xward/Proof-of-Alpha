# Proof of Alpha Terminal

Proof of Alpha: Precision blockchain monitoring station providing live data streaming and forensic auditing for EVM networks. Features zero-latency transaction tracking and network health diagnostics in a high-fidelity dashboard.

## Features

- **Live Whale Tracker**: Real-time websocket integration with Ethereum nodes and Binance to track high-value asset transfers and trades ($50k+).
- **Universal EVM Support**: Paste any transaction hash (`0x...`) from Ethereum, Celo, Base, Avalanche, Optimism, or BNB Chain.
- **Forensic Scoring**: Analyze transaction footprint and evaluate the "Alpha" score.
- **SBT Minting**: Mint a Soulbound Token indicating the Alpha tier achieved.

## On-Chain Infrastructure

The application integrates with an autonomous AI agent registered on the Celo network to handle forensic verification and SBT distribution.

- **Agent Identity (ERC-8004):** `0xc4809E491b1Ea88FDAe63CfE9d7906F285b861c0`
- **SBT Smart Contract:** `0xb9083d595D7af4C1E969C7fDfA18d44738298A11`
- **Identity Registry TX:** [View on Celoscan](https://celoscan.io/tx/0xd35914a911f5ea6e0568b134249686356608ea490088a7b3f30457c35be744ef)


## Overview

The terminal provides an elite, syntax-highlighted interface for blockchain analysts to quickly investigate the merit of a target transaction. Integrating live websocket feeds, the application behaves dynamically and offers rapid contextual intelligence.

## Technical Details

- **Tech Stack**: React 18, Vite, Tailwind CSS, Motion.
- **Live Streams**: Ethereum Public Nodes (USDT Transfers), Binance Live Streams (Large Trades).
- **Styling**: Brutalist/hacker aesthetic with custom animations and responsive scaling.

## Setup

1. Install dependencies: `npm install`
2. Start dev server: `npm run dev`
3. Build for production: `npm run build`
