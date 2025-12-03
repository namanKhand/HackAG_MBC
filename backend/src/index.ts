import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { setupSocketHandlers } from "./socketHandlers";
import { BlockchainListener } from "./BlockchainListener";
import { db } from "./database";


const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all for dev
        methods: ["GET", "POST"],
    },
});

// Initialize Blockchain Listener
new BlockchainListener(io);

const PORT = process.env.PORT || 3001;

// Initialize Database
db.init().then(() => {
    console.log("Database initialized");
}).catch(err => {
    console.error("Failed to initialize database", err);
});

app.get("/", (req, res) => {
    res.send("Poker Game Server Running");
});



app.get("/api/user/:address", async (req, res) => {
    try {
        const user = await db.getUser(req.params.address);
        res.json(user);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch user" });
    }
});

app.get("/api/history/:address", async (req, res) => {
    try {
        const history = await db.getGameHistory(req.params.address);
        res.json(history);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

setupSocketHandlers(io);

httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
