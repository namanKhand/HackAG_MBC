import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { setupSocketHandlers } from "./socketHandlers";
import { BlockchainListener } from "./BlockchainListener";
import { db } from "./database";
import { generateToken, verifyToken, hashPassword, comparePassword } from "./auth";

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

// Auth Routes
app.post("/api/auth/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            res.status(400).json({ error: "Missing fields" });
            return;
        }

        // Check if exists
        const existingEmail = await db.getAccountByEmail(email);
        if (existingEmail) {
            res.status(400).json({ error: "Email already exists" });
            return;
        }
        const existingUser = await db.getAccountByUsername(username);
        if (existingUser) {
            res.status(400).json({ error: "Username already exists" });
            return;
        }

        const hashedPassword = await hashPassword(password);
        const id = await db.createAccount(username, email, hashedPassword);
        const token = generateToken({ id, username, isGuest: false });

        res.json({ token, user: { id, username, email, isGuest: false } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Registration failed" });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { login, password } = req.body; // login can be email or username
        if (!login || !password) {
            res.status(400).json({ error: "Missing fields" });
            return;
        }

        let user = await db.getAccountByEmail(login);
        if (!user) {
            user = await db.getAccountByUsername(login);
        }

        if (!user) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }

        const match = await comparePassword(password, user.password_hash);
        if (!match) {
            res.status(401).json({ error: "Invalid credentials" });
            return;
        }

        const token = generateToken({ id: user.id, username: user.username, isGuest: !!user.is_guest });
        res.json({ token, user: { id: user.id, username: user.username, email: user.email, isGuest: !!user.is_guest } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Login failed" });
    }
});

app.post("/api/auth/guest", async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) {
            res.status(400).json({ error: "Username required" });
            return;
        }

        // Create a guest account
        // We might want to append random numbers to ensure uniqueness or handle collisions
        const randomSuffix = Math.floor(Math.random() * 10000);
        const uniqueUsername = `${username}_${randomSuffix}`;

        const id = await db.createAccount(uniqueUsername, `guest_${uniqueUsername}@temp.com`, "", true);
        const token = generateToken({ id, username: uniqueUsername, isGuest: true });

        res.json({ token, user: { id, username: uniqueUsername, isGuest: true } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Guest login failed" });
    }
});

app.get("/api/auth/me", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ error: "No token" });
            return;
        }
        const token = authHeader.split(" ")[1];
        const payload: any = verifyToken(token);
        if (!payload) {
            res.status(401).json({ error: "Invalid token" });
            return;
        }

        const user = await db.getAccountById(payload.id);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        // Get linked wallets
        const wallets = await db.getWalletsForAccount(user.id);

        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isGuest: !!user.is_guest,
                wallets
            }
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Auth check failed" });
    }
});

app.post("/api/account/wallet", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ error: "No token" });
            return;
        }
        const token = authHeader.split(" ")[1];
        const payload: any = verifyToken(token);
        if (!payload) {
            res.status(401).json({ error: "Invalid token" });
            return;
        }

        const { address } = req.body;
        if (!address) {
            res.status(400).json({ error: "Address required" });
            return;
        }

        await db.linkWallet(payload.id, address);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Link wallet failed" });
    }
});

app.get("/api/account/stats", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ error: "No token" });
            return;
        }
        const token = authHeader.split(" ")[1];
        const payload: any = verifyToken(token);
        if (!payload) {
            res.status(401).json({ error: "Invalid token" });
            return;
        }

        const mode = (req.query.mode as 'real' | 'play') || 'real';
        const stats = await db.getAccountStats(payload.id, mode);
        res.json(stats);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
});

app.get("/api/account/history", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ error: "No token" });
            return;
        }
        const token = authHeader.split(" ")[1];
        const payload: any = verifyToken(token);
        if (!payload) {
            res.status(401).json({ error: "Invalid token" });
            return;
        }

        const mode = (req.query.mode as 'real' | 'play') || 'real';
        const history = await db.getAccountHistory(payload.id, mode);
        res.json(history);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to fetch history" });
    }
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
