const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base Mainnet USDC

    // Optional: Set this to your Smart Wallet address if you want it to control the vault
    const SMART_WALLET_ADDRESS = process.env.SMART_WALLET_ADDRESS || deployer.address;

    console.log("Deploying MiddlemanVault...");
    console.log("  - USDC:", USDC_ADDRESS);
    console.log("  - Initial Backend Wallet:", SMART_WALLET_ADDRESS);

    // Deploy MiddlemanVault
    const MiddlemanVault = await hre.ethers.getContractFactory("MiddlemanVault");
    // We set the initial backend wallet to the Smart Wallet (or deployer if not set)
    const middlemanVault = await MiddlemanVault.deploy(USDC_ADDRESS, SMART_WALLET_ADDRESS);
    await middlemanVault.waitForDeployment();

    const vaultAddress = await middlemanVault.getAddress();
    console.log("MiddlemanVault deployed to:", vaultAddress);

    // If a Smart Wallet is used, transfer ownership to it as well?
    // Usually yes, so the Smart Wallet can change the backend wallet later.
    if (SMART_WALLET_ADDRESS !== deployer.address) {
        console.log("Transferring ownership to Smart Wallet:", SMART_WALLET_ADDRESS);
        await middlemanVault.transferOwnership(SMART_WALLET_ADDRESS);
        console.log("Ownership transferred.");
    }

    console.log("----------------------------------------------------");
    console.log("Deployment Complete!");
    console.log("Vault Address:", vaultAddress);
    console.log("Backend Wallet:", SMART_WALLET_ADDRESS);
    console.log("Owner:", SMART_WALLET_ADDRESS);
    console.log("----------------------------------------------------");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
