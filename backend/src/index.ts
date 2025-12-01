import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { setupSocketHandlers } from "./socketHandlers";

dotenv.config();

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

const PORT = process.env.PORT || 3001;

app.get("/", (req, res) => {
    res.send("Poker Game Server Running");
});

setupSocketHandlers(io);

httpServer.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
