
import { Table, Player } from './src/game/Table';
import { Card } from './src/game/Deck';
import { db } from './src/database';
// @ts-ignore
import { Hand } from 'pokersolver';

// Manual mock
db.updateUserStats = async () => { };
db.addGameHistory = async () => 1;
db.addPlayerGameHistory = async () => { };

const table = new Table('test_table');

function createPlayer(id: string, name: string, chips: number): Player {
    return {
        id,
        name,
        chips,
        startHandChips: chips,
        bet: 0,
        folded: false,
        cards: [],
        seat: -1,
        isTurn: false,
        hasActed: false,
        status: 'active',
        stats: { pfr: false, vpip: false, threeBet: false, threeBetOpp: false },
        // @ts-ignore
        totalBuyIn: chips,
        // @ts-ignore
        handContribution: 0
    } as any;
}

async function testAllInLogic() {
    console.log('--- Testing All-In Logic (Decimals) ---');
    table.players = [null, null, null, null, null, null];
    // Scenario: Micro stakes, 0.10 chips
    const p1 = createPlayer('p1', 'Player 1', 0.10);
    const p2 = createPlayer('p2', 'Player 2', 0.10);
    table.addPlayer(p1);
    table.addPlayer(p2);

    table.startGame();
    table.smallBlind = 0.01;
    table.bigBlind = 0.02;

    // Reset for test
    p1.chips = 0.10;
    p1.bet = 0.01; // SB
    p2.chips = 0.08; // BB paid 0.02
    p2.bet = 0.02;
    p1.isTurn = true;

    console.log(`P1 Chips before: ${p1.chips}, Bet: ${p1.bet}`);
    // Raise to 0.1099999999 (should be treated as 0.11 all-in)
    const result = table.handleAction('p1', 'raise', 0.1099999999);
    console.log(`Action Result: ${result}`);
    console.log(`P1 Chips after: ${p1.chips}, Bet: ${p1.bet}`);

    if (p1.chips === 0) {
        console.log('PASS: P1 has 0 chips (dust cleaned)');
    } else if (p1.chips < 0.0001) {
        console.error('FAIL: P1 left with dust chips:', p1.chips);
    } else {
        console.log('INFO: P1 has significant chips:', p1.chips);
    }
}

async function testSidePotLogic() {
    console.log('\n--- Testing Side Pot Logic ---');
    table.players = [null, null, null, null, null, null];
    const p1 = createPlayer('p1', 'ShortStack', 0); // All-in for 50
    const p2 = createPlayer('p2', 'MidStack', 0);   // All-in for 100
    const p3 = createPlayer('p3', 'BigStack', 0);   // Covered both

    table.addPlayer(p1);
    table.addPlayer(p2);
    table.addPlayer(p3);

    // P1: Best hand (Trip Aces)
    p1.cards = [new Card('A', 'h'), new Card('A', 'd')];
    // P2: Second best (Trip Kings)
    p2.cards = [new Card('K', 'h'), new Card('K', 'd')];
    // P3: Worst hand (Trip Queens)
    p3.cards = [new Card('Q', 'h'), new Card('Q', 'd')];

    table.communityCards = [
        new Card('A', 's'),
        new Card('K', 's'),
        new Card('Q', 's'),
        new Card('2', 'c'),
        new Card('3', 'c')
    ];

    // Pot structure:
    // Main Pot (150): P1(50) + P2(50) + P3(50). Winner P1.
    // Side Pot 1 (100): P2(50) + P3(50). Winner P2.
    // Total Pot: 250.

    (p1 as any).handContribution = 50;
    (p2 as any).handContribution = 100;
    (p3 as any).handContribution = 100;
    table.pot = 250;

    // Debug Hands
    const h1 = Hand.solve([...p1.cards, ...table.communityCards].map(c => c.toString()));
    const h2 = Hand.solve([...p2.cards, ...table.communityCards].map(c => c.toString()));
    const h3 = Hand.solve([...p3.cards, ...table.communityCards].map(c => c.toString()));

    console.log('H1 (Aces):', h1.descr);
    console.log('H3 (Queens):', h3.descr);
    console.log('H1.compare(H3):', h1.compare(h3)); // Should be 1 (H1 wins)
    console.log('H3.compare(H1):', h3.compare(h1)); // Should be -1 (H3 loses)

    table.evaluateWinner();

    console.log(`P1 Chips (Expected 150): ${p1.chips}`);
    console.log(`P2 Chips (Expected 100): ${p2.chips}`);
    console.log(`P3 Chips (Expected 0): ${p3.chips}`);

    if (p1.chips === 150 && p2.chips === 100 && p3.chips === 0) {
        console.log('PASS: Side pots distributed correctly');
    } else {
        console.error('FAIL: Side pot distribution error');
    }

    console.log('\n--- Testing Early Win (Fold) Logic ---');
    const table2 = new Table('test_fold');
    const fp1 = { id: 'fp1', name: 'Winner', chips: 100, startHandChips: 100, bet: 0, folded: false, cards: [], seat: 0, isTurn: false, hasActed: false, status: 'active', stats: { pfr: false, vpip: false, threeBet: false, threeBetOpp: false }, handContribution: 0, totalBuyIn: 100 };
    const fp2 = { id: 'fp2', name: 'Folder', chips: 100, startHandChips: 100, bet: 0, folded: false, cards: [], seat: 1, isTurn: false, hasActed: false, status: 'active', stats: { pfr: false, vpip: false, threeBet: false, threeBetOpp: false }, handContribution: 0, totalBuyIn: 100 };

    table2.addPlayer(fp1 as any);
    table2.addPlayer(fp2 as any);
    table2.startGame();

    // FP1 bets 10
    table2.handleAction('fp1', 'raise', 10);
    // FP2 folds
    table2.handleAction('fp2', 'fold');

    console.log(`FP1 Chips (Expected 110.03? No, 100 + blinds + bet):`);
    // Blinds: SB=0.01, BB=0.02 (default micro?) No, default is 10/20 in Table class but 0.01/0.02 in socketHandlers.
    // Table default is 10/20.
    // Start: 100 chips.
    // SB (FP2): 10. BB (FP1): 20.
    // FP2 acts first preflop? No, 2 players -> Dealer is SB.
    // Heads up: Dealer is SB. Dealer acts first preflop.
    // So FP2 is SB/Dealer. FP1 is BB.
    // FP2 acts first. FP2 folds.
    // FP1 wins immediately.
    // Pot: 10 (SB) + 20 (BB) = 30.
    // FP1 gets 30.
    // FP1 start: 100. Paid 20. Chips: 80. Wins 30. End: 110.

    console.log(`FP1 Chips: ${fp1.chips}`);
    if (fp1.chips === 110) {
        console.log('PASS: Early win logic works');
    } else {
        console.log('FAIL: Early win logic failed');
    }
}

async function main() {
    await testAllInLogic();
    await testSidePotLogic();
}

main();
