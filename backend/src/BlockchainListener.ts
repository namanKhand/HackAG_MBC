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

        // Poll for events every 5 seconds instead of using .on() to avoid "filter not found" errors
        setInterval(async () => {
            try {
                const currentBlock = await this.provider.getBlockNumber();
                // Look back 100 blocks to be safe, or track last checked block
                const fromBlock = currentBlock - 100;

                const events = await this.vaultContract.queryFilter("Deposited", fromBlock, currentBlock);

                for (const event of events) {
                    if (event instanceof ethers.EventLog) {
                        const txHash = event.transactionHash;
                        if (this.processedTxHashes.has(txHash)) continue;

                        this.processedTxHashes.add(txHash);
                        const user = event.args[0];
                        const amount = event.args[1];

                        console.log(`Deposit detected! User: ${user}, Amount: ${ethers.formatUnits(amount, 6)} USDC, Tx: ${txHash}`);

                        this.io.emit("deposit_confirmed", {
                            address: user,
                            amount: Number(ethers.formatUnits(amount, 6)),
                            txHash: txHash
                        });
                    }
                }
            } catch (e) {
                console.error("Error polling for deposits:", e);
            }
        }, 5000);
    }
}
