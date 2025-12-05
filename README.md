# HackAG MBC - Base Poker DApp

**HackAG MBC** is a web-first, multiplayer Texas Hold’em poker platform built on the **Base L2 blockchain**, designed to bring transparency and trust to online poker. It features a dual-mode system: a **Real-Money Mode** where players compete with USDC on Base (Sepolia/Mainnet) and a **Play-Money Mode** for casual, off-chain practice.

The platform ensures game integrity through a decentralized architecture, securing funds and logic with Solidity smart contracts while delivering a seamless, real-time experience via a Socket.io-powered backend. Uniquely, it incorporates a **Reputation System** using Soulbound NFTs to track and display player stats permanently on-chain.

With an intuitive interface built on Next.js and TailwindCSS, and seamless onboarding via Coinbase Smart Wallet and Metamask, HackAG MBC bridges the gap between traditional gaming usability and Web3 security.

---

## Table of Contents

- [HackAG MBC - Base Poker DApp](#hackag-mbc---base-poker-dapp)
  - [Table of Contents](#table-of-contents)
  - [Technical Summary](#technical-summary)
    - [Architecture](#architecture)
    - [Hosting \& Deployment](#hosting--deployment)
  - [Features](#features)
  - [Tech Stack](#tech-stack)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Running Locally](#running-locally)
  - [Testing](#testing)
  - [License](#license)

---

## Technical Summary

HackAG MBC employs a hybrid architecture combining the security of smart contracts with the speed of a centralized game server for real-time play.

### Architecture

1.  **Smart Contracts (Base L2)**
    *   **Layer**: Base (EVM L2).
    *   **Management**: `PokerGameManager.sol` handles table creation, USDC escrow, and secure payouts.
    *   **Identity**: `ReputationNFT.sol` (Soulbound Token) tracks player statistics on-chain.
    *   **Currency**: Uses USDC (and MockUSDC for testing).

2.  **Backend (Game Engine)**
    *   **Runtime**: Node.js with TypeScript (`/backend`).
    *   **Logic**: Centralized game engine handles poker rules (hand evaluation, pot calculation, turn management) to ensure instant finality and smooth UX.
    *   **Real-time Interaction**: `Socket.io` server manages bi-directional communication (dealing cards, player actions).
    *   **Verifiable**: Listens to on-chain events (`GameCreated`, `PlayerJoined`) to sync state.

3.  **Frontend (Client)**
    *   **Framework**: Next.js (React) (`/frontend`).
    *   **Web3 Integration**: `wagmi` and `viem` for wallet connection (Coinbase Smart Wallet, Metamask) and contract interactions.
    *   **Styling**: TailwindCSS for a responsive, modern UI.

### Hosting & Deployment

*   **Frontend**: Deployed on **Vercel** (recommended) or Netlify. It requires build-time environment variables for strict typing and public client keys.
*   **Backend**: Hosted on a persistent Node.js server (e.g., **Render**, **Heroku**, or **AWS EC2**). It requires a persistent `Socket.io` connection.
*   **Smart Contracts**: Deployed on **Base Sepolia** (Testnet) or **Base Mainnet**.
*   **Database**: Uses **SQLite** for lightweight persistence of game history and user sessions (can be swapped for PostgreSQL for scale).

---

## Features

*   **Real-Money Mode**: Play with USDC on Base (Sepolia/Mainnet).
*   **Play-Money Mode**: Free play with off-chain chips.
*   **Reputation System**: Soulbound NFT tracking player stats.
*   **Real-Time Gameplay**: Socket.io based game engine.
*   **Wallet Auth**: Connect with Metamask/Coinbase Wallet.

## Tech Stack

**Languages & Frameworks:**
*   TypeScript
*   Solidity (0.8.24)
*   Next.js
*   Express
*   Hardhat

**Libraries & Tools:**
*   React
*   Socket.io
*   TailwindCSS
*   RainbowKit
*   wagmi / viem
*   Ethers.js
*   SQLite

**Blockchain:**
*   Base (L2)

---

## Prerequisites

*   Node.js v18+
*   Git

## Setup

1.  **Install Dependencies**
    ```bash
    # Root directory
    npm install

    # Install subproject dependencies
    cd contracts && npm install
    cd ../backend && npm install
    cd ../frontend && npm install
    ```

2.  **Environment Variables**
    *   Create `.env` in `contracts` and `backend` based on `.env.example`.
    *   **Backend**: Needs `PRIVATE_KEY` for contract interaction (optional for play-money only) and providing the `PORT` (default 3001).
    *   **Frontend**: Configure `NEXT_PUBLIC_API_URL` to point to your backend.

## Running Locally

You can run the full stack with the provided PowerShell script:

```powershell
./start-dev.ps1
```

Or manually:

1.  **Contracts (Local Node)**
    ```bash
    cd contracts
    npx hardhat node
    # In another terminal:
    npx hardhat run scripts/deploy.js --network localhost
    ```

2.  **Backend**
    ```bash
    cd backend
    npm run dev
    # Server runs on http://localhost:3001
    ```

3.  **Frontend**
    ```bash
    cd frontend
    npm run dev
    # App runs on http://localhost:3000
    ```

## Testing

*   **Contracts**: `cd contracts && npx hardhat test`
*   **Backend**: `cd backend && npm test`

## License

ISC