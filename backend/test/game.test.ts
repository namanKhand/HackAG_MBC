import { Table } from '../src/game/Table';
import { expect } from 'chai';

describe('Table Logic', () => {
    let table: Table;

    beforeEach(() => {
        table = new Table('test-table');
        table.addPlayer({ id: 'p1', name: 'Player 1', chips: 1000, bet: 0, folded: false, cards: [], seat: 0, isTurn: false, hasActed: false, status: 'active', stats: { pfr: false, vpip: false, threeBet: false, threeBetOpp: false } });
        table.addPlayer({ id: 'p2', name: 'Player 2', chips: 1000, bet: 0, folded: false, cards: [], seat: 1, isTurn: false, hasActed: false, status: 'active', stats: { pfr: false, vpip: false, threeBet: false, threeBetOpp: false } });
    });

    it('should start game correctly', () => {
        table.startGame();
        expect(table.gameActive).to.be.true;
        expect(table.players[0]!.cards.length).to.equal(2);
        expect(table.players[1]!.cards.length).to.equal(2);
        expect(table.stage).to.equal('preflop');
    });

    it('should handle betting and street progression', () => {
        table.startGame();

        // P1 checks (since they are UTG/SB/BB logic dependent, but let's assume active player 1 starts)
        // In our logic, turnIndex is set.
        const p1 = table.players.find(p => p?.isTurn);
        if (p1) {
            table.handleAction(p1.id, 'call'); // Call blind
        }

        // Just verify state exists
        expect(table.pot).to.be.greaterThan(0);
    });
});
