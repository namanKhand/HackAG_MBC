const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Interacting with Vault using account:", deployer.address);

    const VAULT_ADDRESS = "0xe76891e4be5dB3AAD26a66211e150A392c488eF4";
    const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

    // The address to send money TO (e.g., the user you want to refund)
    // REPLACE THIS WITH THE RECIPIENT ADDRESS
    const RECIPIENT = "0xREPLACE_WITH_RECIPIENT_ADDRESS";
    const AMOUNT = "0.1"; // Amount in USDC

    if (RECIPIENT.includes("REPLACE")) {
        console.error("Please edit the script and set the RECIPIENT address.");
        process.exit(1);
    }

    const MiddlemanVault = await hre.ethers.getContractFactory("MiddlemanVault");
    const vault = MiddlemanVault.attach(VAULT_ADDRESS);

    // Check Vault Balance
    const IERC20 = await hre.ethers.getContractAt("IERC20", USDC_ADDRESS);
    const balance = await IERC20.balanceOf(VAULT_ADDRESS);
    console.log(`Vault Balance: ${hre.ethers.formatUnits(balance, 6)} USDC`);

    // Payout
    console.log(`Sending ${AMOUNT} USDC to ${RECIPIENT}...`);
    const amountUnits = hre.ethers.parseUnits(AMOUNT, 6);

    // Since deployer is the Backend Wallet (and Owner), we can use 'payout' or 'emergencyWithdraw'
    // 'payout' is safer as it emits the PaidOut event
    const tx = await vault.payout(RECIPIENT, amountUnits);
    await tx.wait();

    console.log("Payout successful!");

    const newBalance = await IERC20.balanceOf(VAULT_ADDRESS);
    console.log(`New Vault Balance: ${hre.ethers.formatUnits(newBalance, 6)} USDC`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
