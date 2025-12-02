import { ethers } from "ethers";
import { Server } from "socket.io";
import { db } from "./database";
import dotenv from "dotenv";

dotenv.config();

const MIDDLEMAN_VAULT_ADDRESS = process.env.MIDDLEMAN_VAULT_ADDRESS;
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545"; // Default to local hardhat

// MiddlemanVault ABI
const VAULT_ABI = [
    "event Deposited(address indexed user, uint256 amount)",
    "event PaidOut(address indexed recipient, uint256 amount)"
];

export class BlockchainListener {
    private provider: ethers.JsonRpcProvider;
    private vaultContract: ethers.Contract;
    private io: Server;
    private processedTxHashes: Set<string> = new Set();

    constructor(io: Server) {
        this.io = io;
        this.provider = new ethers.JsonRpcProvider(RPC_URL);

        if (!MIDDLEMAN_VAULT_ADDRESS) {
            console.error("Missing MIDDLEMAN_VAULT_ADDRESS in .env");
            // We must initialize it to satisfy TS, even if we return. 
            // Ideally we throw error, but to keep process alive we just don't start listening.
            this.vaultContract = new ethers.Contract(ethers.ZeroAddress, VAULT_ABI, this.provider);
            return;
        }

        this.vaultContract = new ethers.Contract(MIDDLEMAN_VAULT_ADDRESS, VAULT_ABI, this.provider);
        this.startListening();
    }

    startListening() {
        console.log(`Listening for deposits on Vault ${MIDDLEMAN_VAULT_ADDRESS}...`);

        this.vaultContract.on("Deposited", async (user, amount, event) => {
            const txHash = event.log.transactionHash;

            if (this.processedTxHashes.has(txHash)) return;
            this.processedTxHashes.add(txHash);

            console.log(`Deposit detected! User: ${user}, Amount: ${ethers.formatUnits(amount, 6)} USDC, Tx: ${txHash}`);

            // Notify frontend via socket
            this.io.emit("deposit_confirmed", {
                address: user,
                amount: Number(ethers.formatUnits(amount, 6)),
                txHash: txHash
            });
        });
    }
}
