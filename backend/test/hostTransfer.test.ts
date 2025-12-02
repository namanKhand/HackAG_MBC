import { Table } from '../src/game/Table';
import { expect } from 'chai';

describe('Host Transfer Logic', () => {
    let table: Table;

    beforeEach(() => {
        table = new Table({ id: 'test-table', name: 'Test', smallBlind: 10, bigBlind: 20, isPublic: false, hostId: 'p1' });
        table.addPlayer({ id: 'p1', name: 'Player 1', chips: 1000, startHandChips: 1000, bet: 0, folded: false, cards: [], seat: 0, isTurn: false, hasActed: false, status: 'active', stats: { pfr: false, vpip: false, threeBet: false, threeBetOpp: false } });
        table.addPlayer({ id: 'p2', name: 'Player 2', chips: 1000, startHandChips: 1000, bet: 0, folded: false, cards: [], seat: 1, isTurn: false, hasActed: false, status: 'active', stats: { pfr: false, vpip: false, threeBet: false, threeBetOpp: false } });
    });

    it('should transfer host when current host leaves', () => {
        expect(table.config.hostId).to.equal('p1');

        // Remove host
        table.removePlayer('p1');

        // Check if host transferred to p2
        expect(table.config.hostId).to.equal('p2');
    });

    it('should handle last player leaving', () => {
        table.removePlayer('p1');
        expect(table.config.hostId).to.equal('p2');

        table.removePlayer('p2');
        expect(table.config.hostId).to.be.undefined;
    });
});
