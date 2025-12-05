import { Table, Player } from '../src/game/Table';
import { expect } from 'chai';

describe('WSOP Showdown Logic', () => {
    let table: Table;
    let p1: Player;
    let p2: Player;
    let p3: Player;

    beforeEach(() => {
        table = new Table('test_table');
        // Setup 3 players
        p1 = {
            id: 'p1', name: 'Player 1', chips: 1000, startHandChips: 1000, totalBuyIn: 1000,
            bet: 0, handContribution: 0, folded: false, cards: [], seat: 0, isTurn: false, hasActed: false, status: 'active',
            stats: { pfr: false, vpip: false, threeBet: false, threeBetOpp: false }
        };
        p2 = {
            id: 'p2', name: 'Player 2', chips: 1000, startHandChips: 1000, totalBuyIn: 1000,
            bet: 0, handContribution: 0, folded: false, cards: [], seat: 1, isTurn: false, hasActed: false, status: 'active',
            stats: { pfr: false, vpip: false, threeBet: false, threeBetOpp: false }
        };
        p3 = {
            id: 'p3', name: 'Player 3', chips: 1000, startHandChips: 1000, totalBuyIn: 1000,
            bet: 0, handContribution: 0, folded: false, cards: [], seat: 2, isTurn: false, hasActed: false, status: 'active',
            stats: { pfr: false, vpip: false, threeBet: false, threeBetOpp: false }
        };
        table.addPlayer(p1);
        table.addPlayer(p2);
        table.addPlayer(p3);
        table.startGame();
    });

    it('should show last aggressor first on river', () => {
        // Setup a scenario: River
        table.stage = 'river';
        table.communityCards = [
            { rank: 'A', suit: 'h', toString: () => 'Ah' },
            { rank: 'K', suit: 'h', toString: () => 'Kh' },
            { rank: 'Q', suit: 'h', toString: () => 'Qh' },
            { rank: 'J', suit: 'h', toString: () => 'Jh' },
            { rank: '10', suit: 'h', toString: () => 'Th' }
        ] as any;

        // Give players hands
        // P1: Pair of 2s (Losing)
        p1.cards = [{ rank: '2', suit: 'c', toString: () => '2c' }, { rank: '2', suit: 'd', toString: () => '2d' }] as any;
        // P2: Pair of 3s (Better than P1 but losing to board?) Board is Royal Flush actually.
        // Let's make board garbage so hands matter.
        table.communityCards = [
            { rank: '2', suit: 's', toString: () => '2s' },
            { rank: '3', suit: 's', toString: () => '3s' },
            { rank: '4', suit: 's', toString: () => '4s' },
            { rank: '5', suit: 's', toString: () => '5s' },
            { rank: '7', suit: 'd', toString: () => '7d' }
        ] as any;

        // P1: AA (Best)
        p1.cards = [{ rank: 'A', suit: 'c', toString: () => 'Ac' }, { rank: 'A', suit: 'd', toString: () => 'Ad' }] as any;
        // P2: KK (Second)
        p2.cards = [{ rank: 'K', suit: 'c', toString: () => 'Kc' }, { rank: 'K', suit: 'd', toString: () => 'Kd' }] as any;
        // P3: QQ (Third)
        p3.cards = [{ rank: 'Q', suit: 'c', toString: () => 'Qc' }, { rank: 'Q', suit: 'd', toString: () => 'Qd' }] as any;

        // Action: P2 bets, P3 calls, P1 calls.
        // P2 is last aggressor.
        // Showdown order: P2 (Aggressor) -> P3 -> P1
        // P2 shows (First to show)
        // P3 mucks (QQ < KK)
        // P1 shows (AA > KK)

        // Simulate action setting lastAggressorId
        table.lastAggressorId = 'p2';

        table.evaluateWinner();

        console.log('P1 Stats:', p1.stats);
        console.log('P2 Stats:', p2.stats);
        console.log('P3 Stats:', p3.stats);

        expect(p2.stats.showCards).to.be.true; // P2 shows first
        expect(p3.stats.showCards).to.be.false; // P3 mucks
        expect(p1.stats.showCards).to.be.true; // P1 shows (winner)
    });

    it('should show in position order if no aggressor on river', () => {
        // Setup: River, checked around.
        table.stage = 'river';
        table.communityCards = [
            { rank: '2', suit: 's', toString: () => '2s' },
            { rank: '3', suit: 's', toString: () => '3s' },
            { rank: '4', suit: 's', toString: () => '4s' },
            { rank: '5', suit: 's', toString: () => '5s' },
            { rank: '7', suit: 'd', toString: () => '7d' }
        ] as any;

        // P1 (SB): QQ
        p1.cards = [{ rank: 'Q', suit: 'c', toString: () => 'Qc' }, { rank: 'Q', suit: 'd', toString: () => 'Qd' }] as any;
        // P2 (BB): KK
        p2.cards = [{ rank: 'K', suit: 'c', toString: () => 'Kc' }, { rank: 'K', suit: 'd', toString: () => 'Kd' }] as any;
        // P3 (BTN): AA
        p3.cards = [{ rank: 'A', suit: 'c', toString: () => 'Ac' }, { rank: 'A', suit: 'd', toString: () => 'Ad' }] as any;

        // Dealer is P3 (Seat 2). SB is P1 (Seat 0). BB is P2 (Seat 1).
        // Order after dealer: P1, P2, P3.
        // No aggressor.
        // P1 shows first (First active after dealer) -> Shows QQ.
        // P2 shows (KK > QQ).
        // P3 shows (AA > KK).

        table.dealerIndex = 2; // P3 is dealer
        table.lastAggressorId = null;

        table.evaluateWinner();

        expect(p1.stats.showCards).to.be.true; // P1 shows first (default start)
        expect(p2.stats.showCards).to.be.true; // P2 shows (better)
        expect(p3.stats.showCards).to.be.true; // P3 shows (best)
    });

    it('should allow mucking if losing to shown hand', () => {
        // Setup: River, checked around.
        table.stage = 'river';
        table.communityCards = [
            { rank: '2', suit: 's', toString: () => '2s' },
            { rank: '3', suit: 's', toString: () => '3s' },
            { rank: '4', suit: 's', toString: () => '4s' },
            { rank: '5', suit: 's', toString: () => '5s' },
            { rank: '7', suit: 'd', toString: () => '7d' }
        ] as any;

        // P1 (SB): AA (Best)
        p1.cards = [{ rank: 'A', suit: 'c', toString: () => 'Ac' }, { rank: 'A', suit: 'd', toString: () => 'Ad' }] as any;
        // P2 (BB): KK (Losing)
        p2.cards = [{ rank: 'K', suit: 'c', toString: () => 'Kc' }, { rank: 'K', suit: 'd', toString: () => 'Kd' }] as any;
        // P3 (BTN): QQ (Losing)
        p3.cards = [{ rank: 'Q', suit: 'c', toString: () => 'Qc' }, { rank: 'Q', suit: 'd', toString: () => 'Qd' }] as any;

        // Dealer P3. Order: P1, P2, P3.
        // P1 shows (First). AA.
        // P2 mucks (KK < AA).
        // P3 mucks (QQ < AA).

        table.dealerIndex = 2;
        table.lastAggressorId = null;

        table.evaluateWinner();

        expect(p1.stats.showCards).to.be.true;
        expect(p2.stats.showCards).to.be.false;
        expect(p3.stats.showCards).to.be.false;
    });

    it('should force show for all-in players', () => {
        // Setup: River
        table.stage = 'river';
        table.communityCards = [
            { rank: '2', suit: 's', toString: () => '2s' },
            { rank: '3', suit: 's', toString: () => '3s' },
            { rank: '4', suit: 's', toString: () => '4s' },
            { rank: '5', suit: 's', toString: () => '5s' },
            { rank: '7', suit: 'd', toString: () => '7d' }
        ] as any;

        // P1: AA (Best)
        p1.cards = [{ rank: 'A', suit: 'c', toString: () => 'Ac' }, { rank: 'A', suit: 'd', toString: () => 'Ad' }] as any;
        // P2: KK (Losing, All-in)
        p2.cards = [{ rank: 'K', suit: 'c', toString: () => 'Kc' }, { rank: 'K', suit: 'd', toString: () => 'Kd' }] as any;
        p2.chips = 0; // All-in

        // P3: QQ (Losing, Not All-in)
        p3.cards = [{ rank: 'Q', suit: 'c', toString: () => 'Qc' }, { rank: 'Q', suit: 'd', toString: () => 'Qd' }] as any;

        // Dealer P3. Order: P1, P2, P3.
        // P1 shows (First).
        // P2 shows (All-in, even though losing).
        // P3 mucks (Losing, not all-in).

        table.dealerIndex = 2;
        table.lastAggressorId = null;

        table.evaluateWinner();

        expect(p1.stats.showCards).to.be.true;
        expect(p2.stats.showCards).to.be.true; // Forced show
        expect(p3.stats.showCards).to.be.false;
    });
});
