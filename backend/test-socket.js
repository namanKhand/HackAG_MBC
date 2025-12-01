const io = require("socket.io-client");

const socket = io("http://localhost:3001");

socket.on("connect", () => {
    console.log("Connected to server with ID:", socket.id);
    socket.emit("join_table", { tableId: "default", name: "TestBot" });
});

socket.on("table_state", (table) => {
    console.log("Received table state:", table.id);
    console.log("Players:", table.players.map(p => p ? p.name : "Empty"));
    socket.disconnect();
});

socket.on("connect_error", (err) => {
    console.log("Connection error:", err.message);
});

socket.on("error", (err) => {
    console.log("Socket error:", err);
});

setTimeout(() => {
    console.log("Timeout reached, exiting.");
    process.exit(1);
}, 5000);
