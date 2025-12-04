import { ethers } from "ethers";
import * as dotenv from "dotenv";
import path from "path";

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
    const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
    const privateKey = process.env.MIDDLEMAN_WALLET_PRIVATE_KEY;
    const vaultAddress = process.env.MIDDLEMAN_VAULT_ADDRESS;

    console.log("--- Verifying Payout Setup ---");
    console.log(`RPC URL: ${rpcUrl}`);
    console.log(`Vault Address: ${vaultAddress}`);

    if (!privateKey) {
        console.error("❌ Missing MIDDLEMAN_WALLET_PRIVATE_KEY");
        return;
    }
    if (!vaultAddress) {
        console.error("❌ Missing MIDDLEMAN_VAULT_ADDRESS");
        return;
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log(`Backend Wallet Address: ${wallet.address}`);

    // 1. Check ETH Balance
    const ethBalance = await provider.getBalance(wallet.address);
    console.log(`Wallet ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);
    if (ethBalance === 0n) {
        console.warn("⚠️ Wallet has 0 ETH. Payouts will fail due to no gas.");
    }

    // 2. Check Vault Contract
    const vaultAbi = [
        "function usdc() view returns (address)",
        "function backendWallet() view returns (address)",
        "function owner() view returns (address)",
        "function payout(address recipient, uint256 amount)"
    ];
    const vault = new ethers.Contract(vaultAddress, vaultAbi, wallet);

    try {
        const authorizedWallet = await vault.backendWallet();
        console.log(`Vault Authorized Backend Wallet: ${authorizedWallet}`);

        if (authorizedWallet.toLowerCase() !== wallet.address.toLowerCase()) {
            console.error("❌ Backend Wallet is NOT authorized on the Vault!");
            console.log(`Expected: ${authorizedWallet}, Got: ${wallet.address}`);
        } else {
            console.log("✅ Backend Wallet is authorized.");
        }

        // 3. Check Vault USDC Balance
        const usdcAddress = await vault.usdc();
        console.log(`USDC Token Address: ${usdcAddress}`);

        const usdcAbi = [
            "function balanceOf(address owner) view returns (uint256)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)"
        ];
        const usdc = new ethers.Contract(usdcAddress, usdcAbi, provider);

        const vaultUsdcBalance = await usdc.balanceOf(vaultAddress);
        const decimals = await usdc.decimals();
        const symbol = await usdc.symbol();

        console.log(`Vault USDC Balance: ${ethers.formatUnits(vaultUsdcBalance, decimals)} ${symbol}`);

        if (vaultUsdcBalance === 0n) {
            console.warn("⚠️ Vault has 0 USDC. Payouts will fail.");
        }

    } catch (error) {
        console.error("❌ Error reading contract state:", error);
    }
}

main().catch(console.error);
