# Base Poker DApp

A web-first, multiplayer Texas Hold’em poker platform on Base L2.

## Features
- **Real-Money Mode**: Play with USDC on Base (Sepolia/Mainnet).
- **Play-Money Mode**: Free play with off-chain chips.
- **Reputation System**: Soulbound NFT tracking player stats.
- **Real-Time Gameplay**: Socket.io based game engine.
- **Wallet Auth**: Connect with Metamask/Coinbase Wallet.

## Prerequisites
- Node.js v18+
- Git

## Setup

1. **Install Dependencies**
   ```powershell
   # Root directory
   npm install

   # Install subproject dependencies
   cd contracts && npm install
   cd ../backend && npm install
   cd ../frontend && npm install
   ```

2. **Environment Variables**
   - Create `.env` in `contracts` and `backend` based on `.env.example` (if provided) or just use defaults for local dev.
   - Backend needs `PRIVATE_KEY` for contract interaction (optional for play-money).

## Running Locally

You can run the full stack with the provided PowerShell script:

```powershell
./start-dev.ps1
```

Or manually:

1. **Contracts (Local Node)**
   ```bash
   cd contracts
   npx hardhat node
   # In another terminal:
   npx hardhat run scripts/deploy.js --network localhost
   ```

2. **Backend**
   ```bash
   cd backend
   npm run dev
   # Server runs on http://localhost:3001
   ```

3. **Frontend**
   ```bash
   cd frontend
   npm run dev
   # App runs on http://localhost:3000
   ```

## Architecture
See [docs/architecture.md](docs/architecture.md) for details.

## Testing
- Contracts: `cd contracts && npx hardhat test`
- Backend: `cd backend && npm test`