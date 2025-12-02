const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deploy MockUSDC (only for dev/testnets without USDC)
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    const usdcAddress = await mockUSDC.getAddress();
    console.log("MockUSDC deployed to:", usdcAddress);

    // Deploy ReputationNFT
    const ReputationNFT = await hre.ethers.getContractFactory("ReputationNFT");
    const reputationNFT = await ReputationNFT.deploy();
    await reputationNFT.waitForDeployment();
    const reputationAddress = await reputationNFT.getAddress();
    console.log("ReputationNFT deployed to:", reputationAddress);

    // Deploy PokerGameManager
    const PokerGameManager = await hre.ethers.getContractFactory("PokerGameManager");
    const pokerGameManager = await PokerGameManager.deploy(usdcAddress, reputationAddress);
    await pokerGameManager.waitForDeployment();
    const managerAddress = await pokerGameManager.getAddress();
    console.log("PokerGameManager deployed to:", managerAddress);

    // Transfer ownership of ReputationNFT to Manager
    await reputationNFT.transferOwnership(managerAddress);
    console.log("ReputationNFT ownership transferred to PokerGameManager");

    // Deploy MiddlemanVault
    // For local dev, we use the deployer as the backend wallet
    const MiddlemanVault = await hre.ethers.getContractFactory("MiddlemanVault");
    const middlemanVault = await MiddlemanVault.deploy(usdcAddress, deployer.address);
    await middlemanVault.waitForDeployment();
    const vaultAddress = await middlemanVault.getAddress();
    console.log("MiddlemanVault deployed to:", vaultAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
