import { Deck, Card } from './Deck';
// @ts-ignore
import { Hand } from 'pokersolver';
import { db } from '../database';

export interface Player {
    id: string; // Socket ID
    address?: string; // Wallet address
    name: string;
    chips: number;
    bet: number;
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

export class Table {
    id: string;
    players: (Player | null)[];
    deck: Deck;
    communityCards: Card[];
    pot: number;
    currentBet: number;
    dealerIndex: number;
    turnIndex: number;
    gameActive: boolean;
    stage: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
    smallBlind: number = 10;
    bigBlind: number = 20;
    winners: string[] = [];

    constructor(id: string) {
        this.id = id;
        this.players = new Array(6).fill(null); // 6-max table
        this.deck = new Deck();
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.dealerIndex = 0;
        this.turnIndex = 0;
        this.gameActive = false;
        this.stage = 'preflop';
        this.winners = [];
    }

    addPlayer(player: Player): boolean {
        const seat = this.players.findIndex(p => p === null);
        if (seat === -1) return false;
        player.seat = seat;
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

    startGame() {
        const activePlayers = this.players.filter(p => p !== null && p.status === 'active' && p.chips > 0);
        if (activePlayers.length < 2) {
            this.gameActive = false;
            return;
        }

        this.gameActive = true;
        this.deck.reset();
        this.deck.shuffle();
        this.communityCards = [];
        this.pot = 0;
        this.currentBet = 0;
        this.currentBet = 0;
        this.stage = 'preflop';
        this.winners = [];

        // Move Dealer Button
        this.dealerIndex = this.nextActivePlayer(this.dealerIndex);

        // Deal cards
        this.players.forEach(p => {
            if (p && p.status === 'active' && p.chips > 0) {
                p.cards = [this.deck.deal()!, this.deck.deal()!];
                p.folded = false;
                p.bet = 0;
                p.isTurn = false;
                p.hasActed = false;
                p.stats = { pfr: false, vpip: false, threeBet: false, threeBetOpp: false };

                // Update hands played
                if (p.address) {
                    db.updateUserStats(p.address, { hands_played: 1 });
                }
            } else if (p) {
                p.cards = [];
                p.folded = true;
                p.bet = 0;
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
        sbPlayer.chips -= sbAmount;
        sbPlayer.bet = sbAmount;
        this.pot += sbAmount;

        // BB
        const bbPlayer = this.players[bbIndex]!;
        const bbAmount = Math.min(bbPlayer.chips, this.bigBlind);
        bbPlayer.chips -= bbAmount;
        bbPlayer.bet = bbAmount;
        this.pot += bbAmount;
        this.currentBet = this.bigBlind;

        // Set turn to UTG (player after BB)
        this.turnIndex = this.nextActivePlayer(bbIndex);
        if (this.players[this.turnIndex]) {
            this.players[this.turnIndex]!.isTurn = true;
        }
    }

    advanceTurn() {
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
            if (player.chips >= toCall) {
                player.chips -= toCall;
                player.bet += toCall;
                this.pot += toCall;
            } else {
                // All-in call
                player.bet += player.chips;
                this.pot += player.chips;
                player.chips = 0;
            }
            player.hasActed = true;
        } else if (action === 'raise' && amount) {
            const totalBet = amount;
            const diff = totalBet - player.bet;
            if (player.chips >= diff && totalBet > this.currentBet) {
                player.chips -= diff;
                player.bet = totalBet;
                this.pot += diff;
                this.currentBet = totalBet;

                // Reset hasActed for everyone else because the bet increased!
                this.players.forEach(p => {
                    if (p && p.id !== playerId) p.hasActed = false;
                });
            }
            player.hasActed = true;
        } else if (action === 'check') {
            if (player.bet < this.currentBet) return false;
            player.hasActed = true;
        }

        if (action === 'call') {
            player.stats.vpip = true;
        } else if (action === 'raise') {
            player.stats.vpip = true;
            if (this.stage === 'preflop') {
                player.stats.pfr = true;
                // Simple 3-bet detection: if current bet > big blind, it's a 3-bet (or 4-bet etc)
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

    evaluateWinner() {
        const activePlayers = this.players.filter(p => p && !p.folded);
        if (activePlayers.length === 0) return;

        const hands = activePlayers.map(p => {
            const cards = [...p!.cards, ...this.communityCards].map(c => c.toString());
            const hand = Hand.solve(cards);
            // @ts-ignore
            hand.player = p;
            return hand;
        });

        const winners = Hand.winners(hands);

        this.winners = winners.map((w: any) => w.player.id);

        const share = Math.floor(this.pot / winners.length);
        winners.forEach((w: any) => {
            // @ts-ignore
            w.player.chips += share;

            // Persist Winner Stats
            if (w.player.address) {
                db.updateUserStats(w.player.address, {
                    hands_won: 1,
                    chips_won: share
                });

                db.addGameHistory({
                    table_id: this.id,
                    winner_address: w.player.address,
                    pot_size: this.pot,
                    hand_description: w.name // Hand name e.g. "Two Pair"
                });
            }
        });

        // Persist Player Stats (PFR, etc)
        activePlayers.forEach(p => {
            if (p && p.address) {
                db.updateUserStats(p.address, {
                    pfr_count: p.stats.pfr ? 1 : 0,
                    pfr_opportunity: 1, // Every hand is PFR opp for now
                    three_bet_count: p.stats.threeBet ? 1 : 0,
                    three_bet_opportunity: p.stats.threeBetOpp ? 1 : 0
                });
            }
        });

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
}
