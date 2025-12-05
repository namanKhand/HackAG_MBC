# Technical Context: HackAG MBC

This document provides a detailed technical overview of the **HackAG MBC** project, focusing on the Vault architecture, Base L2 integration, and Hosting infrastructure. It is intended to provide context for other AI assistants or developers joining the project.

## 1. The Vault & Smart Contract Architecture

The project uses a hybrid on-chain/off-chain architecture to secure funds while maintaining fast gameplay.

### PokerGameManager (The Game Vault)
The primary "Vault" for managing table funds is the `PokerGameManager.sol` contract.
*   **Role**: Acts as a decentralized escrow for individual game sessions.
*   **Fund Flow**:
    1.  **Join**: When a player joins a table (Real-Money Mode), they approve USDC and call `joinGame(gameId)`. The contract transfers USDC from the user's wallet to itself (`address(this)`).
    2.  **Escrow**: Funds are locked in the contract during gameplay.
    3.  **Finalization**: When the game ends users leave, the trusted Backend verifies the final state and calls `finalizeGame(gameId, winners, payouts)`.
    4.  **Payout**: The contract verifies `totalPayout <= totalPot` and transfers USDC directly to the winners.
*   **Security**: Uses `ReentrancyGuard` and `Ownable`. Only the backend (Owner) can trigger payouts, preventing users from arbitrarily withdrawing funds during a hand.

### MiddlemanVault (Platform Vault)
A secondary contract, `MiddlemanVault.sol`, exists for more generalized fund management.
*   **Role**: A general-purpose wallet for deposits and authorized withdrawals.
*   **Usage**: Designed for scenarios where users deposit into a platform balance rather than a specific table, or for handling "House" funds.
*   **Functionality**: Users `deposit()`, and the backend can `payout()` to any address.

## 2. Base L2 Integration

The project is built on **Base**, an Ethereum Layer 2 solution incubated by Coinbase.

*   **Network**:
    *   **Mainnet**: Chain ID `8453`.
    *   **RPC**: Configured in `hardhat.config.js` (uses public Base RPC or private keys).
*   **Currency**: **USDC** (Circle's Stablecoin) is the primary token for gameplay, not ETH.
    *   **Address**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (Base Mainnet).
    *   **MockUSDC**: Deployed for local/testnet development (`MockUSDC.sol`).
*   **Gasless Transactions** (In-Progress/Planned): Integration with **Coinbase Smart Wallet** and **Circle** APIs to subsidize gas fees for a seamless "Web2-like" verification experience.
*   **Reputation**: `ReputationNFT.sol` is a Soulbound Token (SBT) on Base that tracks player stats (hands played, wins). `PokerGameManager` updates this contract upon game finalization.

## 3. Hosting & Infrastructure

The application serves a real-time multiplayer experience using a centralized backend and decentralized settlement.

### Backend (Game Engine)
*   **Tech**: Node.js, TypeScript, Express, Socket.io.
*   **Hosting**: Requires a **Persistent Server** (not serverless) due to stateful Socket.io connections.
    *   **Providers**: Render, AWS EC2, or Heroku.
*   **Responsibilities**:
    *   Runs the `pokersolver` logic for hand evaluation.
    *   Manages the "Game Loop" (Dealing, Betting, Turn Timers).
    *   Authorizes smart contract transactions (Owner of `PokerGameManager`).
    *   Listens to Blockchain events (`GameCreated`, `PlayerJoined`) via `ethers.js` / `viem` to sync on-chain deposits with off-chain game state.

### Frontend (Client)
*   **Tech**: Next.js (React), TailwindCSS, RainbowKit, Wagmi.
*   **Hosting**: **Vercel** (Serverless).
*   **Role**:
    *   Connects to Backend via WebSocket (`socket.io-client`).
    *   Connects to Blockchain via `wagmi` hooks.
    *   Handles wallet signatures and approval for USDC spending.

### Database
*   **Tech**: SQLite (Local/Dev) / PostgreSQL (Prod).
*   **Role**: Stores ephemeral game history, user session logs, and replay data. Critical game state is primarily in-memory (RAM) during play for speed, settled on-chain for trust.
