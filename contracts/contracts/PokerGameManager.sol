// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ReputationNFT.sol";

/**
 * @title PokerGameManager
 * @dev Manages poker tables, escrows USDC, and handles payouts.
 */
contract PokerGameManager is Ownable, ReentrancyGuard {
    IERC20 public usdc;
    ReputationNFT public reputationNFT;

    struct Game {
        uint256 id;
        uint256 buyIn;
        uint256 totalPot;
        bool isActive;
        address[] players;
    }

    mapping(uint256 => Game) public games;
    mapping(uint256 => mapping(address => bool)) public hasJoined;

    event GameCreated(uint256 indexed gameId, uint256 buyIn);
    event PlayerJoined(uint256 indexed gameId, address indexed player);
    event GameFinalized(uint256 indexed gameId, address[] winners, uint256[] payouts);

    constructor(address _usdc, address _reputationNFT) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        reputationNFT = ReputationNFT(_reputationNFT);
    }

    /**
     * @dev Create a new game session.
     * Can be called by backend or anyone (if we want decentralized table creation).
     * For MVP, let's allow anyone to create a table, but backend manages the ID.
     */
    function createGame(uint256 gameId, uint256 buyIn) external {
        require(games[gameId].id == 0, "Game already exists");
        
        Game storage game = games[gameId];
        game.id = gameId;
        game.buyIn = buyIn;
        game.isActive = true;

        emit GameCreated(gameId, buyIn);
    }

    /**
     * @dev Join a game by depositing USDC.
     */
    function joinGame(uint256 gameId) external nonReentrant {
        Game storage game = games[gameId];
        require(game.isActive, "Game not active");
        require(!hasJoined[gameId][msg.sender], "Already joined");

        // Transfer USDC from player to contract
        require(usdc.transferFrom(msg.sender, address(this), game.buyIn), "Transfer failed");

        game.players.push(msg.sender);
        game.totalPot += game.buyIn;
        hasJoined[gameId][msg.sender] = true;

        // Ensure player has a profile
        if (reputationNFT.addressToTokenId(msg.sender) == 0) {
             // Only owner can mint, so we might need to auto-mint or require pre-mint.
             // For MVP, if the contract is owner of NFT, it can mint.
             // Or we just skip this check here and let backend handle it.
        }

        emit PlayerJoined(gameId, msg.sender);
    }

    /**
     * @dev Finalize game and distribute payouts.
     * Only callable by backend (owner).
     */
    function finalizeGame(
        uint256 gameId, 
        address[] calldata winners, 
        uint256[] calldata payouts
    ) external onlyOwner nonReentrant {
        Game storage game = games[gameId];
        require(game.isActive, "Game not active");
        require(winners.length == payouts.length, "Length mismatch");

        uint256 totalPayout = 0;
        for (uint256 i = 0; i < payouts.length; i++) {
            totalPayout += payouts[i];
        }
        require(totalPayout <= game.totalPot, "Payout exceeds pot");

        game.isActive = false;

        for (uint256 i = 0; i < winners.length; i++) {
            require(usdc.transfer(winners[i], payouts[i]), "Payout transfer failed");
            
            // Update reputation (simplified logic)
            // In real app, backend calculates exact rep change
            try reputationNFT.updateStats(winners[i], true, payouts[i], 10) {} catch {}
        }

        emit GameFinalized(gameId, winners, payouts);
    }

    /**
     * @dev Emergency withdraw in case of stuck funds (only owner).
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
}
