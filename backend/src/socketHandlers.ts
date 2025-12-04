import { Server, Socket } from "socket.io";
import { Table, Player } from "./game/Table";
import { ethers } from "ethers";
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
];

PUBLIC_TABLES.forEach(config => {
    tables[config.id] = new Table({
        id: config.id,
        name: config.name,
        smallBlind: config.smallBlind,
        bigBlind: config.bigBlind,
        isPublic: true,
        isRealMoney: config.isRealMoney
    });
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
export async function verifyDeposit(txHash: string, userAddress: string): Promise<number | null> {
    const MIDDLEMAN_VAULT_ADDRESS = process.env.MIDDLEMAN_VAULT_ADDRESS;
    const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

    if (!MIDDLEMAN_VAULT_ADDRESS) {
        console.log("VerifyDeposit: Missing MIDDLEMAN_VAULT_ADDRESS");
        return null;
    }

    try {
        console.log(`VerifyDeposit: Checking tx ${txHash} for user ${userAddress}`);
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const receipt = await provider.getTransactionReceipt(txHash);

        if (!receipt) {
            console.log(`VerifyDeposit: Tx ${txHash} not found`);
            return null;
        }
        if (receipt.status !== 1) {
            console.log(`VerifyDeposit: Tx ${txHash} status is ${receipt.status}`);
            return null;
        }

        const vaultInterface = new ethers.Interface(VAULT_ABI);
        console.log(`VerifyDeposit: Found ${receipt.logs.length} logs. Vault Address: ${MIDDLEMAN_VAULT_ADDRESS}`);

        for (const log of receipt.logs) {
            console.log(`VerifyDeposit: Checking log from ${log.address}`);
            if (log.address.toLowerCase() === MIDDLEMAN_VAULT_ADDRESS.toLowerCase()) {
                try {
                    const parsed = vaultInterface.parseLog(log);
                    console.log(`VerifyDeposit: Parsed log: ${parsed?.name}, Args: ${parsed?.args}`);
                    if (parsed && parsed.name === 'Deposited') {
                        const depositor = parsed.args[0];
                        const amount = parsed.args[1];
                        console.log(`VerifyDeposit: Depositor: ${depositor}, Amount: ${amount}`);

                        if (depositor.toLowerCase() === userAddress.toLowerCase()) {
                            // Return amount in chips (assuming 6 decimals for USDC)
                            return Number(ethers.formatUnits(amount, 6));
                        } else {
                            console.log(`VerifyDeposit: Depositor mismatch. Expected ${userAddress}, got ${depositor}`);
                        }
                    }
                } catch (e) {
                    console.log(`VerifyDeposit: Failed to parse log: ${e}`);
                }
            } else {
                console.log(`VerifyDeposit: Log address mismatch. Expected ${MIDDLEMAN_VAULT_ADDRESS}, got ${log.address}`);
            }
        }
        console.log("VerifyDeposit: No matching Deposited event found");
        return null;
    } catch (err) {
        console.error("Error verifying deposit:", err);
        return null;
    }
}

// Helper to process payout
export async function processPayout(address: string, amount: number) {
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
        const payoutAmount = ethers.parseUnits(amount.toFixed(6), 6);

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

        socket.on("join_table", async ({ tableId, name, address, buyInAmount, txHash }: { tableId: string; name: string; address?: string; buyInAmount?: number, txHash?: string }) => {
            const table = tables[tableId];

            if (!table) {
                socket.emit("error", "Table not found");
                return;
            }

            // Authentication Check (Simplified: Require address)
            if (!address) {
                socket.emit("error", "Wallet connection required");
                return;
            }

            // Get or create user by address
            const user = await db.getUser(address);
            if (!user) {
                // Should be created by getUser if not exists
                socket.emit("error", "User initialization failed");
                return;
            }

            // @ts-ignore
            const isRealMoney = table.isRealMoney;

            // @ts-ignore
            const isRealMoney = table.isRealMoney;

            if (isRealMoney) {
                // 1. Handle Deposit (if txHash provided)
                if (txHash) {
                    console.log(`Verifying deposit for ${name} (Tx: ${txHash})...`);
                    const verifiedAmount = await verifyDeposit(txHash, address);
                    if (verifiedAmount) {
                        console.log(`Deposit verified: ${verifiedAmount} chips. Adding to balance.`);
                        await db.updateUserBalance(address, verifiedAmount);
                        socket.emit("deposit_success", { amount: verifiedAmount });
                    } else {
                        console.error(`Invalid deposit for ${name} (Tx: ${txHash})`);
                        socket.emit("error", "Invalid deposit transaction. Please contact support if funds were deducted.");
                        return;
                    }
                }

                // 2. Check Balance & Deduct Buy-in
                const currentBalance = await db.getUserBalance(address);
                const buyIn = buyInAmount || 1000; // Default or requested

                if (currentBalance >= buyIn) {
                    await db.updateUserBalance(address, -buyIn); // Deduct buy-in

                    // Create Session
                    const sessionId = await db.createTableSession(tableId, user.id, buyIn);

                    const player: Player = {
                        id: socket.id,
                        address,
                        accountId: user.id,
                        sessionId,
                        name: user.username || address.slice(0, 6),
                        chips: buyIn,
                        startHandChips: buyIn,
                        bet: 0,
                        handContribution: 0,
                        totalBuyIn: buyIn,
                        folded: false,
                        cards: [],
                        seat: -1,
                        isTurn: false,
                        hasActed: false,
                        status: 'active',
                        stats: { pfr: false, vpip: false, threeBet: false, threeBetOpp: false }
                    };

                    if (table.addPlayer(player)) {
                        socket.join(tableId);
                        const sockets = await io.in(tableId).fetchSockets();
                        for (const s of sockets) {
                            s.emit("table_state", table.getForPlayer(s.id));
                        }
                        console.log(`${player.name} joined table ${tableId} with ${buyIn} chips`);
                    } else {
                        // Refund if table full
                        await db.updateUserBalance(address, buyIn);
                        socket.emit("error", "Table full");
                    }
                    return; // Done for Real Money
                } else {
                    socket.emit("error", `Insufficient chip balance. You have ${currentBalance}, need ${buyIn}. Please deposit funds.`);
                    return;
                }
            }

            // Play Money Logic (Fallthrough)
            const player: Player = {
                id: socket.id,
                address,
                accountId: user.id, // Store account ID for stats
                sessionId: undefined, // No session for play money for now? Or maybe yes.
                name: user.username || `${address.slice(0, 6)}...`,
                chips: buyInAmount || 1000,
                startHandChips: buyInAmount || 1000,
                totalBuyIn: buyInAmount || 1000,
                bet: 0,
                handContribution: 0,
                folded: false,
                cards: [],
                seat: -1,
                isTurn: false,
                hasActed: false,
                status: 'active',
                stats: { pfr: false, vpip: false, threeBet: false, threeBetOpp: false }
            };

            if (table.addPlayer(player)) {
                console.log(`[JoinTable] Added player ${player.name} to table ${tableId}`);
                socket.join(tableId);

                // Emit state to everyone (masked)
                const sockets = await io.in(tableId).fetchSockets();
                console.log(`[JoinTable] Broadcasting state to ${sockets.length} sockets`);
                for (const s of sockets) {
                    s.emit("table_state", table.getForPlayer(s.id));
                }
                console.log(`${player.name} joined table ${tableId}`);
            } else {
                console.error(`[JoinTable] Failed to add player - Table full?`);
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
                if (player) {
                    // Update Session
                    if (player.sessionId) {
                        await db.updateTableSession(player.sessionId, player.chips);
                    }

                    console.log(`[LeaveTable] Player ${player.name} (${socket.id}) leaving table ${tableId}`);

                    if (player.chips > 0 && player.address && table.config.isRealMoney) {
                        await db.updateUserBalance(player.address, player.chips);
                        console.log(`Saved ${player.chips} chips to balance for ${player.name}`);
                        player.chips = 0;
                    }
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
                    // Update Session
                    if (player.sessionId) {
                        await db.updateTableSession(player.sessionId, player.chips);
                    }

                    // Save chips to DB on disconnect
                    if (player.chips > 0 && player.address && (table as any).isRealMoney) {
                        await db.updateUserBalance(player.address, player.chips);
                        console.log(`Saved ${player.chips} chips to balance for disconnected user ${player.name}`);
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
