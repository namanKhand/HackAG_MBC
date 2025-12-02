import { Server, Socket } from "socket.io";
import { Table, Player } from "./game/Table";

const tables: Record<string, Table> = {};

// Create a default table
tables["default"] = new Table("default");

export function setupSocketHandlers(io: Server) {
    io.on("connection", (socket: Socket) => {
        console.log("Client connected:", socket.id);

        socket.on("join_table", async ({ tableId, name, address }: { tableId: string; name: string; address?: string }) => {
            const table = tables[tableId] || tables["default"];

            const player: Player = {
                id: socket.id,
                address,
                name: name || `Player ${socket.id.substr(0, 4)}`,
                chips: 1000, // Default chips for play money
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

        socket.on("disconnect", async () => {
            // Find player and remove
            for (const tableId in tables) {
                const table = tables[tableId];
                table.removePlayer(socket.id);

                const sockets = await io.in(tableId).fetchSockets();
                for (const s of sockets) {
                    s.emit("table_state", table.getForPlayer(s.id));
                }
            }
            console.log("Client disconnected:", socket.id);
        });
    });
}
