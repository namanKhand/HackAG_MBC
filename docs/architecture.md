# Architecture Overview

## Components

### 1. Smart Contracts (`/contracts`)
- **PokerGameManager**: Handles game creation, USDC escrow, and payouts.
- **ReputationNFT**: ERC-721 Soulbound token tracking player stats.
- **MockUSDC**: For testing on local/testnet chains.

### 2. Backend (`/backend`)
- **Game Engine**: TypeScript-based poker logic (Deck, Hand Eval, Pot).
- **Socket.io Server**: Handles real-time events (join, bet, fold, deal).
- **API**: Express server for REST endpoints (if needed).
- **Blockchain Listener**: Listens for `GameCreated` and `PlayerJoined` events (planned).

### 3. Frontend (`/frontend`)
- **Next.js**: React framework for UI.
- **Wagmi/Viem**: Web3 hooks for wallet connection and contract interaction.
- **Socket.io Client**: Real-time communication with backend.
- **Tailwind CSS**: Styling.

## Data Flow

1. **Game Creation**:
   - User creates table on Frontend -> Backend creates in-memory table.
   - (Real-money) Backend/User calls `createGame` on Contract.

2. **Joining**:
   - (Play-money) User connects socket -> Backend adds player.
   - (Real-money) User approves USDC -> Calls `joinGame` on Contract -> Contract emits event -> Backend verifies and adds player.

3. **Gameplay**:
   - User Action (Bet/Fold) -> Socket Event -> Backend validates & updates state -> Broadcasts new state.

4. **Settlement**:
   - Game ends -> Backend calculates winners -> Calls `finalizeGame` on Contract -> Contract transfers USDC.
