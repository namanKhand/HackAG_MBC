const hre = require("hardhat");
require("dotenv").config({ path: "../backend/.env" }); // Load from backend .env

async function main() {
    const recipient = process.env.RECIPIENT_ADDRESS;
    const amount = process.env.PAYOUT_AMOUNT || "0.1"; // Default 0.1 USDC

    if (!recipient) {
        console.error("Please set RECIPIENT_ADDRESS environment variable or pass it as argument");
        process.exit(1);
    }

    const vaultAddress = process.env.MIDDLEMAN_VAULT_ADDRESS;
    const privateKey = process.env.MIDDLEMAN_WALLET_PRIVATE_KEY;

    if (!vaultAddress || !privateKey) {
        console.error("Missing MIDDLEMAN_VAULT_ADDRESS or MIDDLEMAN_WALLET_PRIVATE_KEY in backend/.env");
        process.exit(1);
    }

    console.log(`Connecting to Vault at ${vaultAddress}...`);

    // Create wallet from private key
    const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
    console.log(`Using RPC URL: ${rpcUrl}`);
    const provider = new hre.ethers.JsonRpcProvider(rpcUrl);
    const wallet = new hre.ethers.Wallet(privateKey, provider);
    console.log(`Signer: ${wallet.address}`);

    const MiddlemanVault = await hre.ethers.getContractFactory("MiddlemanVault");
    const vault = MiddlemanVault.attach(vaultAddress).connect(wallet);

    // Amount is in 6 decimals for USDC
    const payoutAmount = hre.ethers.parseUnits(amount, 6);

    console.log(`Processing payout of ${amount} USDC to ${recipient}...`);

    const tx = await vault.payout(recipient, payoutAmount);
    console.log(`Payout tx sent: ${tx.hash}`);

    await tx.wait();
    console.log("Payout confirmed!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
