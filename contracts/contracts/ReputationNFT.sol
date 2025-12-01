// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ReputationNFT
 * @dev Soulbound NFT to track player reputation and stats.
 */
contract ReputationNFT is ERC721, Ownable {
    uint256 private _nextTokenId;

    struct PlayerStats {
        uint256 gamesPlayed;
        uint256 wins;
        uint256 totalWinnings; // In USDC units
        uint256 reputationScore;
    }

    // Mapping from tokenId to PlayerStats
    mapping(uint256 => PlayerStats) public playerStats;
    
    // Mapping from address to tokenId (0 if none)
    mapping(address => uint256) public addressToTokenId;

    event ReputationUpdated(address indexed player, uint256 newScore);
    event StatsUpdated(address indexed player, uint256 gamesPlayed, uint256 wins);

    constructor() ERC721("PokerReputation", "PREP") Ownable(msg.sender) {}

    /**
     * @dev Mint a new profile NFT for a player.
     * Only callable by owner (Game Manager).
     */
    function mintProfile(address player) external onlyOwner returns (uint256) {
        require(addressToTokenId[player] == 0, "Player already has a profile");
        
        uint256 tokenId = ++_nextTokenId;
        _safeMint(player, tokenId);
        addressToTokenId[player] = tokenId;
        
        // Initialize stats
        playerStats[tokenId] = PlayerStats(0, 0, 0, 100); // Start with 100 rep

        return tokenId;
    }

    /**
     * @dev Update player stats after a game.
     * Only callable by owner (Game Manager).
     */
    function updateStats(
        address player, 
        bool isWin, 
        uint256 winnings, 
        int256 repChange
    ) external onlyOwner {
        uint256 tokenId = addressToTokenId[player];
        require(tokenId != 0, "Player has no profile");

        PlayerStats storage stats = playerStats[tokenId];
        stats.gamesPlayed++;
        if (isWin) {
            stats.wins++;
        }
        stats.totalWinnings += winnings;

        if (repChange > 0) {
            stats.reputationScore += uint256(repChange);
        } else {
            uint256 decrease = uint256(-repChange);
            if (stats.reputationScore > decrease) {
                stats.reputationScore -= decrease;
            } else {
                stats.reputationScore = 0;
            }
        }

        emit StatsUpdated(player, stats.gamesPlayed, stats.wins);
        emit ReputationUpdated(player, stats.reputationScore);
    }

    /**
     * @dev Soulbound: Prevent transfers.
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) {
            revert("ReputationNFT: Soulbound, non-transferable");
        }
        return super._update(to, tokenId, auth);
    }
}
