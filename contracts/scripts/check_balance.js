const { ethers } = require("ethers");

async function main() {
    const rpcUrl = "https://mainnet.base.org";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const vaultAddress = "0xe76891e4be5dB3AAD26a66211e150A392c488eF4";
    const usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

    const usdcAbi = [
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)"
    ];

    const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, provider);

    console.log(`Checking USDC balance for Vault: ${vaultAddress}`);

    try {
        const balance = await usdcContract.balanceOf(vaultAddress);
        const decimals = await usdcContract.decimals();
        const formattedBalance = ethers.formatUnits(balance, decimals);

        console.log(`Vault Balance: ${formattedBalance} USDC`);
    } catch (error) {
        console.error("Error fetching balance:", error);
    }
}

main();
