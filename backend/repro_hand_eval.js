const Hand = require('pokersolver').Hand;

// Board: 8d, 6h, 9s, 6d, Ac
const board = ['8d', '6h', '9s', '6d', 'Ac'];

// Player 1 (K7): Kd, 7s
const p1Cards = ['Kd', '7s'];

// Player 2 (T2): 2s, Ts
const p2Cards = ['2s', 'Ts'];

const hand1 = Hand.solve([...p1Cards, ...board]);
const hand2 = Hand.solve([...p2Cards, ...board]);

console.log('Hand 1 (K7) Best 5:', hand1.cards.map(c => c.toString()));
console.log('Hand 2 (T2) Best 5:', hand2.cards.map(c => c.toString()));

const hands = [hand1, hand2];

// Test the sort logic used in Table.ts
hands.sort((a, b) => {
    const res = a.compare(b); // Changed from b.compare(a)
    console.log(`Comparing ${a === hand1 ? 'K7' : 'T2'} vs ${b === hand1 ? 'K7' : 'T2'}: ${res}`);
    return res; // Ascending? No, if -1 means better, then 'a' comes first.
});

console.log('Sorted Hands (Best First):');
hands.forEach((h, i) => {
    console.log(`${i + 1}. ${h.descr} (${h === hand1 ? 'K7' : 'T2'})`);
});

// Sanity Check
const aces = Hand.solve(['Ah', 'Ad', '2c', '3c', '4c']);
const kings = Hand.solve(['Kh', 'Kd', '2c', '3c', '4c']);
console.log('Sanity Check (Aces vs Kings):', aces.compare(kings)); // Should be 1
console.log('Sanity Check (Kings vs Aces):', kings.compare(aces)); // Should be -1

if (hands[0] === hand1) {
    console.log('Sort is CORRECT (K7 is first)');
} else {
    console.log('Sort is INCORRECT (T2 is first)');
}
