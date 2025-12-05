import { Table } from '../src/game/Table';
import { expect } from 'chai';

describe('Table Features', () => {
    const config = {
        id: 'test',
        name: 'Test Table',
        smallBlind: 50,
        bigBlind: 100,
        isPublic: true,
        hostId: 'host123'
    };

    it('should initialize with config', () => {
        const table = new Table({
            id: 'test',
            name: 'Test Table',
            smallBlind: 50,
            bigBlind: 100,
            isPublic: true,
            hostId: 'host1'
        });
        expect(table.smallBlind).to.equal(50);
        expect(table.bigBlind).to.equal(100);
        expect(table.config.hostId).to.equal('host1');
    });

    it('should track ledger and allow host to add chips', () => {
        const table = new Table(config);
        const player = { id: 'p1', name: 'Player 1', chips: 1000, startHandChips: 1000, bet: 0, folded: false, cards: [], seat: 0, isTurn: false, hasActed: false, status: 'active' as const, totalBuyIn: 1000, handContribution: 0, stats: { pfr: false, vpip: false, threeBet: false, threeBetOpp: false } };
        table.addPlayer(player);

        table.addChips('p1', 500);
        expect(player.chips).to.equal(1500);
        expect(table.ledger['p1']).to.equal(500);
    });

    it('should allow host transfer', () => {
        const table = new Table(config);
        const p1 = { id: 'p1', name: 'Player 1', chips: 1000, startHandChips: 1000, bet: 0, folded: false, cards: [], seat: 0, isTurn: false, hasActed: false, status: 'active' as const, totalBuyIn: 1000, handContribution: 0, stats: { pfr: false, vpip: false, threeBet: false, threeBetOpp: false } };
        const p2 = { id: 'p2', name: 'Player 2', chips: 1000, startHandChips: 1000, bet: 0, folded: false, cards: [], seat: 1, isTurn: false, hasActed: false, status: 'active' as const, totalBuyIn: 1000, handContribution: 0, stats: { pfr: false, vpip: false, threeBet: false, threeBetOpp: false } };
        table.addPlayer(p1);
        table.addPlayer(p2);

        expect(table.config.hostId).to.equal('host123');

        const success = table.transferHost('p2');
        expect(success).to.be.true;
        expect(table.config.hostId).to.equal('p2');
    });
});
