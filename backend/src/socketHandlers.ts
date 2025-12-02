import { Server, Socket } from "socket.io";
import { Table, Player } from "./game/Table";
import { ethers } from "ethers";
import { verifyToken } from "./auth";
import { db } from "./database";

const tables: Record<string, Table> = {};

// Create a default table
tables["default"] = new Table("default");

// Initialize Public Tables
const PUBLIC_TABLES = [
    { id: 'micro', name: 'Micro Stakes', smallBlind: 0.01, bigBlind: 0.02, isRealMoney: true },
    { id: 'low', name: 'Low Stakes', smallBlind: 1, bigBlind: 2, isRealMoney: true },
    { id: 'mid', name: 'Mid Stakes', smallBlind: 5, bigBlind: 10, isRealMoney: true },
    { id: 'high', name: 'High Stakes', smallBlind: 50, bigBlind: 100, isRealMoney: true },
    { id: 'play_micro', name: 'Play Money Micro', smallBlind: 1, bigBlind: 2, isRealMoney: false },
    { id: 'play_high', name: 'Play Money High', smallBlind: 50, bigBlind: 100, isRealMoney: false },
];

PUBLIC_TABLES.forEach(config => {
    tables[config.id] = new Table({
        id: config.id,
        name: config.name,
        smallBlind: config.smallBlind,
        bigBlind: config.bigBlind,
        isPublic: true
    });
    // @ts-ignore - attaching extra prop for now
    tables[config.id].isRealMoney = config.isRealMoney;
    console.log(`Initialized public table: ${config.name} (${config.id}) - RealMoney: ${config.isRealMoney}`);
});

const MIDDLEMAN_PRIVATE_KEY = process.env.MIDDLEMAN_WALLET_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
const MIDDLEMAN_VAULT_ADDRESS = process.env.MIDDLEMAN_VAULT_ADDRESS;

// Vault ABI for event parsing
const VAULT_ABI = [
    "event Deposited(address indexed user, uint256 amount)",
    "event PaidOut(address indexed recipient, uint256 amount)"
];

// Helper to verify deposit on-chain
async function verifyDeposit(txHash: string, userAddress: string): Promise<number | null> {
    if (!MIDDLEMAN_VAULT_ADDRESS) return null;

    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const receipt = await provider.getTransactionReceipt(txHash);

        if (!receipt || receipt.status !== 1) {
            console.log(`Tx ${txHash} failed or not found`);
            return null;
        }

        const vaultInterface = new ethers.Interface(VAULT_ABI);

        for (const log of receipt.logs) {
            if (log.address.toLowerCase() === MIDDLEMAN_VAULT_ADDRESS.toLowerCase()) {
                try {
                    const parsed = vaultInterface.parseLog(log);
                    if (parsed && parsed.name === 'Deposited') {
                        const depositor = parsed.args[0];
                        const amount = parsed.args[1];

                        if (depositor.toLowerCase() === userAddress.toLowerCase()) {
                            // Return amount in chips (assuming 6 decimals for USDC)
                            return Number(ethers.formatUnits(amount, 6));
                        }
                    }
                } catch (e) {
                    // Ignore logs that don't match ABI
                }
            }
        }
        return null;
    } catch (err) {
        console.error("Error verifying deposit:", err);
        return null;
    }
}

// Helper to process payout
async function processPayout(address: string, amount: number) {
    if (!MIDDLEMAN_PRIVATE_KEY || !MIDDLEMAN_VAULT_ADDRESS) {
        console.error("Missing env vars for payout");
        return;
    }

    try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const wallet = new ethers.Wallet(MIDDLEMAN_PRIVATE_KEY, provider);

        const vault = new ethers.Contract(MIDDLEMAN_VAULT_ADDRESS, [
            "function payout(address recipient, uint256 amount)"
        ], wallet);

        // Amount is in chips (assumed 1 chip = 1 USDC for now, or scaled)
        // If chips are 1:1 with USDC (6 decimals)
        const payoutAmount = ethers.parseUnits(amount.toString(), 6);

        console.log(`Processing payout of ${amount} USDC to ${address} via Vault...`);
        const tx = await vault.payout(address, payoutAmount);
        console.log(`Payout sent! Tx: ${tx.hash}`);
        await tx.wait();
        console.log(`Payout confirmed: ${tx.hash}`);
    } catch (err) {
        console.error("Payout failed:", err);
    }
}

export function setupSocketHandlers(io: Server) {
    io.on("connection", (socket: Socket) => {
        console.log("Client connected:", socket.id);

        socket.on("create_table", ({ tableId }: { tableId: string }) => {
            if (!tables[tableId]) {
                tables[tableId] = new Table(tableId);
                // Private tables are play money by default for now, or we can add a flag
                // @ts-ignore
                tables[tableId].isRealMoney = false;
                console.log(`Created new table: ${tableId}`);
                socket.emit("table_created", { tableId });
            } else {
                socket.emit("error", "Table already exists");
            }
        });

        socket.on("join_table", async ({ tableId, name, address, buyInAmount, txHash, token }: { tableId: string; name: string; address?: string; buyInAmount?: number, txHash?: string, token?: string }) => {
            const table = tables[tableId];

            if (!table) {
                socket.emit("error", "Table not found");
                return;
            }

            // Authentication Check
            if (!token) {
                socket.emit("error", "Authentication required");
                return;
            }

            const payload: any = verifyToken(token);
            if (!payload) {
                socket.emit("error", "Invalid token");
                return;
            }

            const user = await db.getAccountById(payload.id);
            if (!user) {
                socket.emit("error", "User not found");
                return;
            }

            // @ts-ignore
            const isRealMoney = table.isRealMoney;

            if (isRealMoney) {
                if (user.is_guest) {
                    socket.emit("error", "Guests cannot play real money games");
                    return;
                }

                // Check if wallet is linked
                const linkedWallets = await db.getWalletsForAccount(user.id);
                if (!address || !linkedWallets.includes(address)) {
                    socket.emit("error", "Wallet not linked to account");
                    return;
                }

                // Verify deposit
                if (!txHash) {
                    socket.emit("error", "Deposit transaction required");
                    return;
                }
            }

            const player: Player = {
                id: socket.id,
                address,
                name: user.username, // Use account username
                chips: buyInAmount || 1000,
                startHandChips: buyInAmount || 1000,
                bet: 0,
                folded: false,
                cards: [],
                seat: -1,
                isTurn: false,
                hasActed: false,
                status: 'active',
                stats: {
                    pfr: false,
                    vpip: false,
                    threeBet: false,
                    threeBetOpp: false
                }
            };

            // Verify deposit if txHash is provided (Real Money Mode)
            if (isRealMoney && txHash && address) {
                console.log(`Verifying deposit for ${name}...`);
                const verifiedAmount = await verifyDeposit(txHash, address);
                if (verifiedAmount) {
                    console.log(`Deposit verified: ${verifiedAmount} chips`);
                    player.chips = verifiedAmount;
                    player.startHandChips = verifiedAmount;
                } else {
                    console.error(`Invalid deposit for ${name}`);
                    socket.emit("error", "Invalid deposit transaction");
                    return;
                }
            } else if (!isRealMoney) {
                // Play money - give free chips if needed or use buyInAmount
                player.chips = buyInAmount || 1000;
                player.startHandChips = player.chips;
            }

            if (table.addPlayer(player)) {
                socket.join(tableId);

                // Emit state to everyone (masked)
                const sockets = await io.in(tableId).fetchSockets();
                for (const s of sockets) {
                    s.emit("table_state", table.getForPlayer(s.id));
                }
                console.log(`${player.name} joined table ${tableId}`);
            } else {
                socket.emit("error", "Table full");
            }
        });

        socket.on("start_game", async ({ tableId }) => {
            console.log(`Received start_game request for table ${tableId} from ${socket.id}`);
            const table = tables[tableId] || tables["default"];
            if (table) {
                const result = table.startGame();
                console.log(`Start game result:`, result);
                if (result.success) {
                    await broadcastAndCheck(tableId, table);
                } else {
                    socket.emit("error", result.error || "Failed to start game");
                }
            }
        });

        // Helper to broadcast state and check for game end / auto-runout
        const broadcastAndCheck = async (tableId: string, table: Table) => {
            const sockets = await io.in(tableId).fetchSockets();
            for (const s of sockets) {
                s.emit("table_state", table.getForPlayer(s.id));
            }

            // Check if game ended
            if (!table.gameActive) {
                console.log(`Game ended on table ${tableId}. Restarting in 5s...`);
                setTimeout(async () => {
                    console.log(`Restarting game on table ${tableId}`);
                    table.startGame();
                    const sockets = await io.in(tableId).fetchSockets();
                    for (const s of sockets) {
                        s.emit("table_state", table.getForPlayer(s.id));
                    }
                }, 5000);
            } else if (table.turnIndex === -1) {
                // Auto-runout (all-in)
                console.log(`Auto-runout on table ${tableId}. Stage: ${table.stage}. Next street in 2s...`);
                setTimeout(async () => {
                    table.nextStreet();
                    console.log(`Executed nextStreet. New Stage: ${table.stage}, TurnIndex: ${table.turnIndex}`);
                    await broadcastAndCheck(tableId, table);
                }, 2000);
            }
        };

        socket.on("player_action", async ({ tableId, action, amount }: { tableId: string, action: any, amount?: number }) => {
            const table = tables[tableId] || tables["default"];
            if (table) {
                if (table.handleAction(socket.id, action, amount)) {
                    await broadcastAndCheck(tableId, table);
                }
            }
        });

        socket.on("sit_out", async ({ tableId }) => {
            const table = tables[tableId] || tables["default"];
            if (table) {
                table.setPlayerStatus(socket.id, 'sitting_out');
                const sockets = await io.in(tableId).fetchSockets();
                for (const s of sockets) {
                    s.emit("table_state", table.getForPlayer(s.id));
                }
            }
        });

        socket.on("back_in", async ({ tableId }) => {
            const table = tables[tableId] || tables["default"];
            if (table) {
                table.setPlayerStatus(socket.id, 'active');
                const sockets = await io.in(tableId).fetchSockets();
                for (const s of sockets) {
                    s.emit("table_state", table.getForPlayer(s.id));
                }
            }
        });

        socket.on("leave_table", async ({ tableId }) => {
            const table = tables[tableId] || tables["default"];
            if (table) {
                const player = table.players.find(p => p?.id === socket.id);
                if (player && player.chips > 0 && player.address) {
                    await processPayout(player.address, player.chips);
                    player.chips = 0; // Reset chips after payout
                }
                table.removePlayer(socket.id);

                // Broadcast update
                const sockets = await io.in(tableId).fetchSockets();
                for (const s of sockets) {
                    s.emit("table_state", table.getForPlayer(s.id));
                }
            }
        });

        socket.on("disconnect", async () => {
            // Find player and remove
            for (const tableId in tables) {
                const table = tables[tableId];
                const player = table.players.find(p => p?.id === socket.id);

                if (player) {
                    // Auto-payout on disconnect
                    if (player.chips > 0 && player.address) {
                        await processPayout(player.address, player.chips);
                    }
                    table.removePlayer(socket.id);

                    const sockets = await io.in(tableId).fetchSockets();
                    for (const s of sockets) {
                        s.emit("table_state", table.getForPlayer(s.id));
                    }
                }
            }
            console.log("Client disconnected:", socket.id);
        });
    });
}
