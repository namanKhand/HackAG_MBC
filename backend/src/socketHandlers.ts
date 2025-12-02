import { Server, Socket } from "socket.io";
import { Table, Player } from "./game/Table";
import { ethers } from "ethers";

const tables: Record<string, Table> = {};

// Create a default table
tables["default"] = new Table("default");

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

        socket.on("join_table", async ({ tableId, name, address, buyInAmount, txHash }: { tableId: string; name: string; address?: string; buyInAmount?: number, txHash?: string }) => {
            const table = tables[tableId] || tables["default"];

            const player: Player = {
                id: socket.id,
                address,
                name: name || `Player ${socket.id.substr(0, 4)}`,
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
            if (txHash && address) {
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
            }

            if (table.addPlayer(player)) {
                socket.join(tableId);

                // Emit state to everyone (masked)
                const sockets = await io.in(tableId).fetchSockets();
                for (const s of sockets) {
                    s.emit("table_state", table.getForPlayer(s.id));
                }
                console.log(`${name} joined table ${tableId}`);
            } else {
                socket.emit("error", "Table full");
            }
        });

        socket.on("start_game", async ({ tableId }) => {
            const table = tables[tableId];
            if (table) {
                table.startGame();

                const sockets = await io.in(tableId).fetchSockets();
                for (const s of sockets) {
                    s.emit("table_state", table.getForPlayer(s.id));
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
            const table = tables[tableId];
            if (table) {
                if (table.handleAction(socket.id, action, amount)) {
                    await broadcastAndCheck(tableId, table);
                }
            }
        });

        socket.on("sit_out", async ({ tableId }) => {
            const table = tables[tableId];
            if (table) {
                table.setPlayerStatus(socket.id, 'sitting_out');
                const sockets = await io.in(tableId).fetchSockets();
                for (const s of sockets) {
                    s.emit("table_state", table.getForPlayer(s.id));
                }
            }
        });

        socket.on("back_in", async ({ tableId }) => {
            const table = tables[tableId];
            if (table) {
                table.setPlayerStatus(socket.id, 'active');
                const sockets = await io.in(tableId).fetchSockets();
                for (const s of sockets) {
                    s.emit("table_state", table.getForPlayer(s.id));
                }
            }
        });

        socket.on("leave_table", async ({ tableId }) => {
            const table = tables[tableId];
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
