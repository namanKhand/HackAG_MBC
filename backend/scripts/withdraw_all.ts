import { ethers } from "ethers";
import * as dotenv from "dotenv";
import path from "path";

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    const privateKey = process.env.MIDDLEMAN_WALLET_PRIVATE_KEY;
    const vaultAddress = process.env.MIDDLEMAN_VAULT_ADDRESS;
    const recipient = "0x1CeFDfaF4911B213387266Adc00625E4103aFd3f";

    console.log("--- Withdrawing All Funds from Vault ---");
    console.log(`RPC URL: ${rpcUrl}`);
    console.log(`Vault Address: ${vaultAddress}`);
    console.log(`Recipient: ${recipient}`);

    if (!privateKey || !vaultAddress) {
        console.error("❌ Missing env vars");
        return;
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const vaultAbi = [
        "function usdc() view returns (address)",
        "function payout(address recipient, uint256 amount)"
    ];
    const vault = new ethers.Contract(vaultAddress, vaultAbi, wallet);

    try {
        // 1. Get USDC Address
        const usdcAddress = await vault.usdc();
        console.log(`USDC Address: ${usdcAddress}`);

        const usdcAbi = [
            "function balanceOf(address owner) view returns (uint256)",
            "function decimals() view returns (uint8)",
            "function symbol() view returns (string)"
        ];
        const usdc = new ethers.Contract(usdcAddress, usdcAbi, provider);

        // 2. Get Vault Balance
        const balance = await usdc.balanceOf(vaultAddress);
        const decimals = await usdc.decimals();
        const symbol = await usdc.symbol();

        console.log(`Vault Balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);

        if (balance === 0n) {
            console.log("Vault is empty. Nothing to withdraw.");
            return;
        }

        // 3. Withdraw
        console.log(`Withdrawing ${ethers.formatUnits(balance, decimals)} ${symbol}...`);
        const tx = await vault.payout(recipient, balance);
        console.log(`Transaction sent: ${tx.hash}`);
        await tx.wait();
        console.log("✅ Withdrawal successful!");

    } catch (error) {
        console.error("❌ Withdrawal failed:", error);
    }
}

main().catch(console.error);
