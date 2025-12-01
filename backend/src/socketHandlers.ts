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
                hasActed: false
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

        socket.on("player_action", async ({ tableId, action, amount }: { tableId: string, action: any, amount?: number }) => {
            const table = tables[tableId];
            if (table) {
                if (table.handleAction(socket.id, action, amount)) {
                    const sockets = await io.in(tableId).fetchSockets();
                    for (const s of sockets) {
                        s.emit("table_state", table.getForPlayer(s.id));
                    }
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
