const hre = require("hardhat");
require("dotenv").config({ path: "../backend/.env" });

const VAULT_ABI = [
    "event Deposited(address indexed user, uint256 amount)",
    "event PaidOut(address indexed recipient, uint256 amount)"
];

async function main() {
    const txHash = process.env.TX_HASH;
    if (!txHash) {
        console.error("Please set TX_HASH env var");
        process.exit(1);
    }

    const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";
    console.log(`Using RPC: ${rpcUrl}`);
    const provider = new hre.ethers.JsonRpcProvider(rpcUrl);

    console.log(`Checking tx: ${txHash}`);
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
        console.error("Transaction not found!");
        process.exit(1);
    }

    console.log(`Status: ${receipt.status} (1 = success, 0 = fail)`);
    console.log(`To: ${receipt.to}`);
    console.log(`From: ${receipt.from}`);

    const vaultAddress = process.env.MIDDLEMAN_VAULT_ADDRESS;
    console.log(`Expected Vault Address: ${vaultAddress}`);

    if (receipt.to.toLowerCase() !== vaultAddress.toLowerCase()) {
        console.warn(`WARNING: Tx 'to' address (${receipt.to}) does not match Vault address!`);
    }

    const iface = new hre.ethers.Interface(VAULT_ABI);

    console.log(`\nLogs (${receipt.logs.length}):`);
    for (const log of receipt.logs) {
        console.log(`- Log Address: ${log.address}`);
        if (log.address.toLowerCase() === vaultAddress.toLowerCase()) {
            try {
                const parsed = iface.parseLog(log);
                console.log(`  Parsed Event: ${parsed.name}`);
                console.log(`  Args:`, parsed.args);
            } catch (e) {
                console.log(`  Failed to parse log with Vault ABI`);
            }
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
