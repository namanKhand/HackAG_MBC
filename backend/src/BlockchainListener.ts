import { ethers } from "ethers";
import { Server } from "socket.io";
import { db } from "./database";
import dotenv from "dotenv";

dotenv.config();

const MIDDLEMAN_ADDRESS = process.env.MIDDLEMAN_WALLET_ADDRESS;
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545"; // Default to local hardhat
const USDC_ADDRESS = process.env.USDC_ADDRESS; // Need to set this in .env

// Minimal ABI for ERC20 Transfer event
const ERC20_ABI = [
    "event Transfer(address indexed from, address indexed to, uint256 value)",
    "function transfer(address to, uint256 amount) returns (bool)",
    "function balanceOf(address owner) view returns (uint256)"
];

export class BlockchainListener {
    private provider: ethers.JsonRpcProvider;
    private usdcContract: ethers.Contract;
    private io: Server;
    private processedTxHashes: Set<string> = new Set();

    constructor(io: Server) {
        this.io = io;
        this.provider = new ethers.JsonRpcProvider(RPC_URL);

        if (!USDC_ADDRESS || !MIDDLEMAN_ADDRESS) {
            console.error("Missing USDC_ADDRESS or MIDDLEMAN_WALLET_ADDRESS in .env");
            return;
        }

        this.usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, this.provider);
        this.startListening();
    }

    startListening() {
        console.log(`Listening for USDC deposits to ${MIDDLEMAN_ADDRESS} on ${USDC_ADDRESS}...`);

        // Filter for Transfer events TO the middleman address
        const filter = this.usdcContract.filters.Transfer(null, MIDDLEMAN_ADDRESS);

        this.usdcContract.on(filter, async (from, to, value, event) => {
            const txHash = event.log.transactionHash;

            if (this.processedTxHashes.has(txHash)) return;
            this.processedTxHashes.add(txHash);

            console.log(`Deposit detected! From: ${from}, Amount: ${ethers.formatUnits(value, 6)} USDC, Tx: ${txHash}`);

            // Notify frontend via socket
            // We broadcast to all sockets connected with this address
            // In a real app, we'd map address -> socketId
            this.io.emit("deposit_confirmed", {
                address: from,
                amount: Number(ethers.formatUnits(value, 6)),
                txHash: txHash
            });
        });
    }
}
