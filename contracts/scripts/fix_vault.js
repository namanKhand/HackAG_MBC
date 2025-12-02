const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Fixing Vault with account:", deployer.address);

    const VAULT_ADDRESS = "0xe76891e4be5dB3AAD26a66211e150A392c488eF4";
    const SMART_WALLET_ADDRESS = "0x53949F6E653D9934A38a76D53aA3002ebF784213";

    const MiddlemanVault = await hre.ethers.getContractFactory("MiddlemanVault");
    const vault = MiddlemanVault.attach(VAULT_ADDRESS);

    // 1. Set Backend Wallet to Deployer (so the backend can sign payouts)
    console.log("Setting Backend Wallet to Deployer...");
    const tx1 = await vault.setBackendWallet(deployer.address);
    await tx1.wait();
    console.log("Backend Wallet set to:", deployer.address);

    // 2. Transfer Ownership to Smart Wallet (so user controls funds)
    console.log("Transferring Ownership to Smart Wallet...");
    const tx2 = await vault.transferOwnership(SMART_WALLET_ADDRESS);
    await tx2.wait();
    console.log("Ownership transferred to:", SMART_WALLET_ADDRESS);

    console.log("Vault Fixed!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
