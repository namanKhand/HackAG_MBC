import { Deck, Card } from './Deck';
// @ts-ignore
import { Hand } from 'pokersolver';
import { db } from '../database';

export interface Player {
    id: string; // Socket ID
    address?: string; // Wallet address
    accountId?: number; // Account ID for stats
    sessionId?: number; // Table session ID
    name: string;
    chips: number;
    startHandChips: number; // Snapshot of chips at start of hand
    totalBuyIn: number; // Total chips bought in this session
    bet: number; // Current street bet
    handContribution: number; // Total contribution to the pot in this hand
    folded: boolean;
    cards: Card[];
    seat: number;
    isTurn: boolean;
    hasActed: boolean;
    status: 'active' | 'sitting_out';

    // Stats for current hand
    stats: {
        pfr: boolean;
        vpip: boolean;
        threeBet: boolean;
        threeBetOpp: boolean;
    };
}

export interface TableConfig {
    id: string;
    name?: string;
    smallBlind: number;
    bigBlind: number;
    isPublic: boolean;
    isRealMoney?: boolean;
    hostId?: string;
}

export class Table {
    id: string;
    config: TableConfig;
    players: (Player | null)[];
    deck: Deck;
    communityCards: Card[];
    pot: number;
    currentBet: number;
    minRaise: number;
    dealerIndex: number;
    turnIndex: number;
    gameActive: boolean;
    stage: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
    smallBlind: number = 10;
    bigBlind: number = 20;
    winners: string[] = [];
    ledger: Record<string, number> = {};

    constructor(configOrId: string | TableConfig) {
        if (typeof configOrId === 'string') {
            this.id = configOrId;
            this.config = {
                id: configOrId,
                smallBlind: 10,
                bigBlind: 20,
                isPublic: true,
                isRealMoney: false
            };
        } else {
            this.id = configOrId.id;
            this.config = configOrId;
            this.smallBlind = configOrId.smallBlind;
            this.bigBlind = configOrId.bigBlind;
        }

        this.players = new Array(6).fill(null); // 6-max table
        this.deck = new Deck();
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.minRaise = 0;
        this.dealerIndex = 0;
        this.turnIndex = 0;
        this.gameActive = false;
        this.stage = 'preflop';
        this.winners = [];
        this.ledger = {};
    }

    // Helper for 2-decimal rounding
    floor(num: number): number {
        return Math.floor(num * 100) / 100;
    }

    addPlayer(player: Player): boolean {
        const seat = this.players.findIndex(p => p === null);
        if (seat === -1) return false;

        // Restore totalBuyIn from persistent ledger
        const uniqueId = this.config.isRealMoney ? player.address : player.name;
        if (uniqueId && this.ledger[uniqueId]) {
            player.totalBuyIn = this.ledger[uniqueId];
        } else {
            // Initialize if new
            if (uniqueId) this.ledger[uniqueId] = player.totalBuyIn;
        }

        player.seat = seat;
        player.handContribution = 0; // Initialize
        player.chips = this.floor(player.chips); // Round chips
        this.players[seat] = player;
        return true;
    }

    removePlayer(id: string) {
        const index = this.players.findIndex(p => p?.id === id);
        if (index !== -1) {
            this.players[index] = null;
        }
    }

    // Helper to find next active player from a starting index
    nextActivePlayer(startIndex: number): number {
        let i = (startIndex + 1) % 6;
        let loops = 0;
        while (loops < 6) {
            const p = this.players[i];
            if (p && !p.folded && p.chips > 0) return i;
            i = (i + 1) % 6;
            loops++;
        }
        return -1; // Should not happen if game is active
    }

    startGame(): { success: boolean, error?: string } {
        const activePlayers = this.players.filter(p => p !== null && p.status === 'active' && p.chips > 0);
        console.log(`[Table ${this.id}] Attempting to start game. Active players: ${activePlayers.length}`);
        this.players.forEach((p, i) => {
            if (p) console.log(`[Table ${this.id}] Seat ${i}: ${p.name} (${p.id}) - Status: ${p.status}, Chips: ${p.chips}`);
        });

        if (activePlayers.length < 2) {
            this.gameActive = false;
            return { success: false, error: `Not enough players (min 2). Active: ${activePlayers.length}` };
        }

        this.gameActive = true;
        this.deck.reset();
        this.deck.shuffle();
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.minRaise = this.bigBlind;
        this.stage = 'preflop';
        this.winners = [];

        // Move Dealer Button
        this.dealerIndex = this.nextActivePlayer(this.dealerIndex);

        // Deal cards
        this.players.forEach(p => {
            if (p && p.status === 'active' && p.chips > 0) {
                p.startHandChips = p.chips; // Snapshot chips
                p.cards = [this.deck.deal()!, this.deck.deal()!];
                p.folded = false;
                p.bet = 0;
                p.handContribution = 0; // Reset contribution
                p.isTurn = false;
                p.hasActed = false;
                p.stats = { pfr: false, vpip: false, threeBet: false, threeBetOpp: false };

                // Update hands played
                console.log(`[Table ${this.id}] Updating hands_played for ${p.name} (RealMoney: ${this.config.isRealMoney})`);
                if (this.config.isRealMoney && p.address) {
                    db.updateUserStats(p.address, { hands_played: 1 }, 'real');
                } else if (!this.config.isRealMoney && p.accountId) {
                    console.log(`[Table ${this.id}] Updating Play Money stats for account ${p.accountId}`);
                    db.updateUserStats(p.accountId, { hands_played: 1 }, 'play');
                } else {
                    console.warn(`[Table ${this.id}] Could not update stats for ${p.name} - Missing address/accountId`);
                }
            } else if (p) {
                p.cards = [];
                p.folded = true;
                p.bet = 0;
                p.handContribution = 0;
                p.isTurn = false;
                p.hasActed = false;
                p.stats = { pfr: false, vpip: false, threeBet: false, threeBetOpp: false };
            }
        });

        // Post Blinds
        const sbIndex = this.nextActivePlayer(this.dealerIndex);
        const bbIndex = this.nextActivePlayer(sbIndex);

        // SB
        const sbPlayer = this.players[sbIndex]!;
        const sbAmount = Math.min(sbPlayer.chips, this.smallBlind);
        sbPlayer.chips = this.floor(sbPlayer.chips - sbAmount);
        sbPlayer.bet = sbAmount;
        sbPlayer.handContribution += sbAmount;
        this.pot += sbAmount;

        // BB
        const bbPlayer = this.players[bbIndex]!;
        const bbAmount = Math.min(bbPlayer.chips, this.bigBlind);
        bbPlayer.chips = this.floor(bbPlayer.chips - bbAmount);
        bbPlayer.bet = bbAmount;
        bbPlayer.handContribution += bbAmount;
        this.pot += bbAmount;
        this.currentBet = this.bigBlind;
        this.minRaise = this.bigBlind;

        // Set turn to UTG (player after BB)
        this.turnIndex = this.nextActivePlayer(bbIndex);
        if (this.players[this.turnIndex]) {
            this.players[this.turnIndex]!.isTurn = true;
        }
        return { success: true };
    }

    advanceTurn() {
        // Check for Early Win (everyone else folded)
        const activePlayers = this.players.filter(p => p && !p.folded);
        if (activePlayers.length === 1) {
            this.endGameEarly(activePlayers[0]!);
            return;
        }

        // Check if round is complete
        if (this.isRoundComplete()) {
            this.nextStreet();
            return;
        }

        let loops = 0;
        let nextIndex = (this.turnIndex + 1) % 6;

        while (loops < 6) {
            const p = this.players[nextIndex];
            if (p && !p.folded && p.chips > 0) {
                this.turnIndex = nextIndex;
                p.isTurn = true;
                return;
            }
            nextIndex = (nextIndex + 1) % 6;
            loops++;
        }
        // If no one else to act, next street
        this.nextStreet();
    }

    isRoundComplete(): boolean {
        const activePlayers = this.players.filter(p => p && !p.folded && p.chips > 0);
        if (activePlayers.length === 0) return true;

        const allActed = activePlayers.every(p => p!.hasActed);
        const allMatched = activePlayers.every(p => p!.bet === this.currentBet);

        return allActed && allMatched;
    }

    handleAction(playerId: string, action: 'fold' | 'check' | 'call' | 'raise', amount?: number): boolean {
        const player = this.players.find(p => p?.id === playerId);
        if (!player || !player.isTurn) return false;

        if (action === 'fold') {
            player.folded = true;
            player.hasActed = true;
        } else if (action === 'call') {
            const toCall = this.currentBet - player.bet;
            let contribution = 0;
            if (player.chips >= toCall) {
                contribution = toCall;
                player.chips = this.floor(player.chips - toCall);
                player.bet += toCall;
            } else {
                // All-in call
                contribution = player.chips;
                player.bet += player.chips;
                player.chips = 0;
            }
            player.handContribution += contribution;
            this.pot += contribution;
            player.hasActed = true;
        } else if (action === 'raise' && amount) {
            const totalBet = amount;
            const diff = totalBet - player.bet;
            let contribution = 0;
            // Check for "effective" all-in (within dust threshold)
            const maxFunds = player.chips + player.bet;
            if (Math.abs(totalBet - maxFunds) < 0.0001) {
                // Treat as exact all-in
                contribution = player.chips;
                player.bet += player.chips;
                player.chips = 0;
            } else if (player.chips >= diff) {
                // Normal raise or exact all-in
                contribution = diff;
                player.chips = this.floor(player.chips - diff);
                player.bet = totalBet;
                if (totalBet > this.currentBet) {
                    const raiseAmount = totalBet - this.currentBet;
                    if (raiseAmount > this.minRaise) {
                        this.minRaise = raiseAmount;
                    }
                    this.currentBet = totalBet;
                    // Reset hasActed for everyone else
                    this.players.forEach(p => {
                        if (p && p.id !== playerId) p.hasActed = false;
                    });
                }
            } else {
                // All-in Raise (Partial)
                contribution = player.chips;
                player.bet += player.chips;
                player.chips = 0;
                if (player.bet > this.currentBet) {
                    const raiseAmount = player.bet - this.currentBet;
                    if (raiseAmount > this.minRaise) {
                        this.minRaise = raiseAmount;
                    }
                    this.currentBet = player.bet;
                    this.players.forEach(p => {
                        if (p && p.id !== playerId) p.hasActed = false;
                    });
                }
            }
            player.handContribution += contribution;
            this.pot += contribution;
            player.hasActed = true;
        } else if (action === 'check') {
            if (player.bet < this.currentBet) return false;
            player.hasActed = true;
        }

        // Fix floating point dust (Double check)
        if (player.chips > 0 && player.chips < 0.0001) {
            console.log(`[Table ${this.id}] Cleaning up dust for ${player.name}: ${player.chips} -> 0`);
            player.chips = 0;
        }

        if (action === 'call') {
            player.stats.vpip = true;
        } else if (action === 'raise') {
            player.stats.vpip = true;
            if (this.stage === 'preflop') {
                player.stats.pfr = true;
                if (this.currentBet > this.bigBlind) {
                    player.stats.threeBet = true;
                }
            }
        }

        // Track 3-bet opportunity
        if (this.stage === 'preflop' && this.currentBet > this.bigBlind && player.isTurn) {
            player.stats.threeBetOpp = true;
        }

        player.isTurn = false;
        this.advanceTurn();
        return true;
    }

    nextStreet() {
        this.currentBet = 0;
        this.minRaise = this.bigBlind;
        this.players.forEach(p => {
            if (p) {
                p.bet = 0;
                p.hasActed = false;
            }
        });

        if (this.stage === 'preflop') {
            this.stage = 'flop';
            this.communityCards.push(this.deck.deal()!, this.deck.deal()!, this.deck.deal()!);
        } else if (this.stage === 'flop') {
            this.stage = 'turn';
            this.communityCards.push(this.deck.deal()!);
        } else if (this.stage === 'turn') {
            this.stage = 'river';
            this.communityCards.push(this.deck.deal()!);
        } else if (this.stage === 'river') {
            this.evaluateWinner();
            return; // Don't advance turn after showdown
        }

        // Set turn to SB (or first active after dealer)
        this.turnIndex = this.dealerIndex; // Will be incremented by nextActivePlayer

        // Check if we should auto-runout (0 or 1 player with chips)
        const playersWithChips = this.players.filter(p => p && !p.folded && p.status === 'active' && p.chips > 0).length;
        if (playersWithChips < 2) {
            this.turnIndex = -1;
            return;
        }

        const next = this.nextActivePlayer(this.turnIndex);
        this.turnIndex = next;
        if (this.players[next]) this.players[next]!.isTurn = true;
    }

    endGameEarly(winner: Player) {
        console.log(`[Table ${this.id}] Early Win for ${winner.name}. Pot: ${this.pot}`);

        // Give entire pot to winner
        const winAmount = this.floor(this.pot);
        winner.chips = this.floor(winner.chips + winAmount);
        this.ledger[winner.id] = (this.ledger[winner.id] || 0) + winAmount;

        this.winners = [winner.id];

        // Persist Stats
        if (winner.address) {
            db.updateUserStats(winner.address, { hands_won: 1, chips_won: winAmount });
        }

        // Game History
        if (winner.address) {
            db.addGameHistory({
                table_id: this.id,
                winner_address: winner.address,
                pot_size: this.pot,
                hand_description: "Winner (Fold)"
            }).then(gameId => {
                this.players.forEach(p => {
                    if (p && p.address && !p.status.includes('sitting_out')) {
                        const netProfit = p.chips - p.startHandChips;
                        db.addPlayerGameHistory({
                            game_id: gameId,
                            address: p.address,
                            net_profit: netProfit,
                            hand_description: p.folded ? "Folded" : "Winner",
                            is_real_money: !!this.config.isRealMoney
                        });
                    }
                });
            });
        }

        this.pot = 0;
        this.gameActive = false;
    }

    evaluateWinner() {
        // 1. Identify active players (not folded)
        const activePlayers = this.players.filter(p => p && !p.folded);
        if (activePlayers.length === 0) return;

        // 2. Calculate Hand Strength for all active players
        const playerHands = activePlayers.map(p => {
            const cards = [...p!.cards, ...this.communityCards].map(c => c.toString());
            const hand = Hand.solve(cards);
            // @ts-ignore
            hand.player = p;
            return hand;
        });

        // 3. Side Pot Logic
        // Sort hands best first
        playerHands.sort((a: any, b: any) => {
            return a.compare(b); // Descending order (best first)
        });
        // Sort descending: b.compare(a)
        // If b > a, returns 1 -> b comes first. Correct.

        let remainingPot = this.pot;
        const winners: string[] = [];

        // Distribute pot
        // We need to iterate through contribution levels
        const allContributors = this.players.filter(p => p && p.handContribution > 0) as Player[];
        const levels = Array.from(new Set(allContributors.map(p => p.handContribution))).sort((a, b) => a - b);

        let prevLevel = 0;

        for (const level of levels) {
            const diff = level - prevLevel;
            if (diff <= 0) continue;

            // Calculate pot chunk for this level
            // Chunk = diff * (number of players who contributed at least this level)
            const contributorsAtLevel = allContributors.filter(p => p.handContribution >= level);
            const chunk = diff * contributorsAtLevel.length;

            if (chunk > remainingPot) {
                // Should not happen if math is perfect, but safety check
                // remainingPot = chunk; // No, cap it
            }

            // Who is eligible to win this chunk?
            // Active players who contributed at least this level.
            const eligiblePlayers = activePlayers.filter(p => p!.handContribution >= level);

            if (eligiblePlayers.length > 0) {
                // Find best hand among eligible
                // Filter playerHands to only include eligible
                const eligibleHands = playerHands.filter((h: any) => eligiblePlayers.some(p => p!.id === h.player.id));

                // Sort eligible hands best first
                eligibleHands.sort((a: any, b: any) => a.compare(b));

                const bestHand = eligibleHands[0];
                const chunkWinners = eligibleHands.filter((h: any) => h.compare(bestHand) === 0);

                // Distribute chunk
                const share = chunk / chunkWinners.length; // Use float division first

                chunkWinners.forEach((w: any) => {
                    // We can use floor but need to handle remainder?
                    // For simplicity in JS/USDC, we can just add.
                    // If we want to be precise with integers:
                    // const share = Math.floor(chunk / chunkWinners.length);
                    // const remainder = chunk % chunkWinners.length;
                    // ... give remainder to first player.

                    // Let's stick to simple floor for now to avoid creating chips
                    const winAmount = this.floor(share);
                    w.player.chips = this.floor(w.player.chips + winAmount);
                    this.ledger[w.player.id] = (this.ledger[w.player.id] || 0) + winAmount;

                    console.log(`[Table ${this.id}] Pot Distribution: ${w.player.name} wins ${winAmount} chips from level ${level}`);

                    // Track stats
                    if (!winners.includes(w.player.id)) winners.push(w.player.id);

                    // Persist Winner Stats (Incremental)
                    const p = w.player;
                    if (this.config.isRealMoney && p.address) {
                        db.updateUserStats(p.address, { hands_won: 1, chips_won: winAmount }, 'real');
                    } else if (!this.config.isRealMoney && p.accountId) {
                        db.updateUserStats(p.accountId, { hands_won: 1, chips_won: winAmount }, 'play');
                    }
                });
            } else {
                // No active players eligible for this chunk (everyone folded who contributed this much?)
                // This implies everyone who put in money at this level folded.
                // The money should go to the last standing player(s) who are active?
                // But we filtered activePlayers.
                // If eligiblePlayers is empty, it means no ACTIVE player contributed this much.
                // E.g. P1 bets 100, P2 calls 10. P2 folds. P1 wins.
                // But P1 is active and contributed 100. So P1 is eligible.
                // This case should only happen if somehow NO ONE is active, but we checked activePlayers.length > 0.
                console.log(`[Table ${this.id}] No eligible players for pot chunk at level ${level}`);
                // Edge case: Everyone folded? handled at start.
                // So eligiblePlayers should not be empty if activePlayers > 0 and we are iterating levels.
                // Wait, what if P1 bet 100, P2 called 10 (all in). P3 called 100.
                // P1 and P3 active. Level 100. Eligible: P1, P3.
                // Level 10. Eligible: P1, P2, P3.
            }

            prevLevel = level;
            remainingPot -= chunk;
            if (remainingPot <= 0.0001) break;
        }

        console.log(`[Table ${this.id}] Winners: ${winners.join(', ')}. Remaining Pot: ${remainingPot}`);
        this.winners = winners;



        // Persist Player Stats (PFR, VPIP, 3-Bet) & Game History
        activePlayers.forEach(p => {
            if (p) {
                const stats = {
                    pfr_count: p.stats.pfr ? 1 : 0,
                    pfr_opportunity: 1,
                    vpip_count: p.stats.vpip ? 1 : 0,
                    vpip_opportunity: 1,
                    three_bet_count: p.stats.threeBet ? 1 : 0,
                    three_bet_opportunity: p.stats.threeBetOpp ? 1 : 0
                };

                if (this.config.isRealMoney && p.address) {
                    db.updateUserStats(p.address, stats, 'real');
                } else if (!this.config.isRealMoney && p.accountId) {
                    db.updateUserStats(p.accountId, stats, 'play');
                }
            }
        });

        // Persist Game History for ALL active players (winners and losers)
        const winner = this.players.find(p => p?.id === this.winners[0]);
        if (winner) {
            // Determine winner address/identifier for history
            const winnerIdentifier = this.config.isRealMoney ? winner.address : winner.name;

            if (winnerIdentifier) {
                db.addGameHistory({
                    table_id: this.id,
                    winner_address: winnerIdentifier,
                    pot_size: this.pot,
                    hand_description: this.getForPlayer(winner.id).handDescription || "Winner"
                }).then(gameId => {
                    // 2. Create Player Game History Entries
                    this.players.forEach(p => {
                        if (p && !p.status.includes('sitting_out')) {
                            const netProfit = p.chips - p.startHandChips;
                            let handDesc = "Folded";
                            if (!p.folded) {
                                const state = this.getForPlayer(p.id);
                                handDesc = state.handDescription || "High Card";
                            }

                            // Identifier for history
                            const pIdentifier = this.config.isRealMoney ? p.address : p.name;

                            if (pIdentifier) {
                                db.addPlayerGameHistory({
                                    game_id: gameId,
                                    address: pIdentifier,
                                    net_profit: netProfit,
                                    hand_description: handDesc,
                                    is_real_money: !!this.config.isRealMoney
                                });
                            }
                        }
                    });
                });
            }
        }

        // Check for busted players
        this.players.forEach((p, index) => {
            if (p && p.chips === 0) {
                console.log(`[Table ${this.id}] Player ${p.name} busted!`);
                this.players[index] = null; // Remove from table
            }
        });

        this.pot = 0;
        this.gameActive = false;
    }

    getForPlayer(playerId: string): any {
        const state = JSON.parse(JSON.stringify(this)); // Deep copy
        state.deck = undefined; // Hide deck
        state.players = state.players.map((p: any) => {
            if (!p) return null;
            if (p.id !== playerId && !this.stage.includes('showdown') && this.turnIndex !== -1) {
                p.cards = null; // Hide cards
            }
            return p;
        });

        // Calculate hand description for the requesting player
        const player = this.players.find(p => p?.id === playerId);
        if (player && player.cards && player.cards.length > 0) {
            const cards = [...player.cards, ...this.communityCards].map(c => c.toString());
            const hand = Hand.solve(cards);
            state.handDescription = hand.name;
        }

        return state;
    }

    setPlayerStatus(playerId: string, status: 'active' | 'sitting_out') {
        const player = this.players.find(p => p?.id === playerId);
        if (player) {
            player.status = status;
        }
    }

    addChips(playerId: string, amount: number) {
        const player = this.players.find(p => p?.id === playerId);
        if (player) {
            player.chips = this.floor(player.chips + amount);
            player.totalBuyIn += amount; // Track total buy-in

            // Update persistent ledger
            const uniqueId = this.config.isRealMoney ? player.address : player.name;
            if (uniqueId) {
                this.ledger[uniqueId] = (this.ledger[uniqueId] || 0) + amount;
            }
        }
    }

    transferHost(newHostId: string): boolean {
        const player = this.players.find(p => p?.id === newHostId);
        if (player) {
            this.config.hostId = newHostId;
            return true;
        }
        return false;
    }
}
