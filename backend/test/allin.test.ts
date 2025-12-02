import { Table } from '../src/game/Table';
import { expect } from 'chai';

describe('All-In Logic', () => {
    let table: Table;

    beforeEach(() => {
        table = new Table('test-table');
        table.addPlayer({ id: 'p1', name: 'Player 1', chips: 1000, startHandChips: 1000, bet: 0, folded: false, cards: [], seat: 0, isTurn: false, hasActed: false, status: 'active', stats: { pfr: false, vpip: false, threeBet: false, threeBetOpp: false } });
        table.addPlayer({ id: 'p2', name: 'Player 2', chips: 1000, startHandChips: 1000, bet: 0, folded: false, cards: [], seat: 1, isTurn: false, hasActed: false, status: 'active', stats: { pfr: false, vpip: false, threeBet: false, threeBetOpp: false } });
        table.startGame();
    });

    it('should set turnIndex to -1 when all players are all-in', () => {
        // P1 (SB) posts 10, P2 (BB) posts 20.
        // Turn is on P1 (Heads up, SB acts first preflop? No, usually Dealer/SB acts first?
        // In 6-max:
        // Dealer = 0.
        // SB = 1.
        // BB = 2.
        // UTG = 3.
        // In Heads up (2 players):
        // Dealer = P1 (Seat 0).
        // SB = P1 (Seat 0).
        // BB = P2 (Seat 1).
        // Preflop: SB acts first? No, BB acts last. SB acts first.
        // Let's check Table.ts logic.
        // dealerIndex starts at 0.
        // nextActivePlayer(dealerIndex) -> 1 (SB).
        // nextActivePlayer(sbIndex) -> 0 (BB). (Wait, 0->1->0 loop)
        // turnIndex = nextActivePlayer(bbIndex) -> 1 (SB).
        // So P1 is SB and acts first. Correct.

        const p1 = table.players[0]!;
        const p2 = table.players[1]!;

        // P1 goes all-in (raise to 1000)
        table.handleAction(p1.id, 'raise', 1000);

        expect(p1.chips).to.equal(0);
        expect(p1.bet).to.equal(1000);
        expect(table.currentBet).to.equal(1000);

        // P2 calls all-in
        table.handleAction(p2.id, 'call');

        // Since round completes, nextStreet is called synchronously.
        // Bets are reset to 0.
        expect(p2.chips).to.equal(0);
        expect(p2.bet).to.equal(0);
        expect(table.pot).to.equal(2000);

        // Should be flop now
        // handleAction -> advanceTurn -> isRoundComplete (true) -> nextStreet
        // nextStreet -> flop -> check playersWithChips (0) -> turnIndex = -1

        expect(table.stage).to.equal('flop');
        expect(table.turnIndex).to.equal(-1);
        expect(table.communityCards.length).to.equal(3);
    });

    it('should advance streets correctly when manually called during runout', () => {
        // Setup all-in
        const p1 = table.players[0]!;
        const p2 = table.players[1]!;
        table.handleAction(p1.id, 'raise', 1000);
        table.handleAction(p2.id, 'call');

        expect(table.stage).to.equal('flop');
        expect(table.turnIndex).to.equal(-1);

        // Simulate runout
        table.nextStreet();
        expect(table.stage).to.equal('turn');
        expect(table.turnIndex).to.equal(-1);
        expect(table.communityCards.length).to.equal(4);

        table.nextStreet();
        expect(table.stage).to.equal('river');
        expect(table.turnIndex).to.equal(-1);
        expect(table.communityCards.length).to.equal(5);

        table.nextStreet();
        // Should evaluate winner
        expect(table.gameActive).to.be.false;
        expect(table.winners.length).to.be.greaterThan(0);
    });
});
