
import { db } from "./src/database";
import { Table, Player } from "./src/game/Table";
import { Card } from "./src/game/Deck";

async function verify() {
    await db.init();
    console.log("DB Initialized");

    // Ensure users exist
    await db.getUser("0x111");
    await db.getUser("0x222");

    const table = new Table("verify_table");
    const p1: Player = {
        id: "p1",
        address: "0x111",
        name: "Player1",
        chips: 1000,
        startHandChips: 0,
        bet: 0,
        folded: false,
        cards: [],
        seat: 0,
        isTurn: false,
        hasActed: false,
        status: "active",
        stats: { pfr: false, vpip: false, threeBet: false, threeBetOpp: false }
    };
    const p2: Player = {
        id: "p2",
        address: "0x222",
        name: "Player2",
        chips: 1000,
        startHandChips: 0,
        bet: 0,
        folded: false,
        cards: [],
        seat: 1,
        isTurn: false,
        hasActed: false,
        status: "active",
        stats: { pfr: false, vpip: false, threeBet: false, threeBetOpp: false }
    };

    table.addPlayer(p1);
    table.addPlayer(p2);

    console.log("Starting Game...");
    table.startGame();

    // Check startHandChips
    if (table.players[0]!.startHandChips !== 1000) {
        console.error("FAILURE: startHandChips not set correctly");
        process.exit(1);
    }

    // P1 raises (VPIP + PFR)
    console.log("P1 Raises...");
    table.handleAction("p1", "raise", 50);

    // P2 calls (VPIP)
    console.log("P2 Calls...");
    table.handleAction("p2", "call");

    // Flop
    console.log("Flop...");

    // P1 checks
    table.handleAction("p1", "check");
    // P2 checks
    table.handleAction("p2", "check");

    // Turn
    console.log("Turn...");
    table.handleAction("p1", "check");
    table.handleAction("p2", "check");

    // River
    console.log("River...");
    table.handleAction("p1", "check");
    table.handleAction("p2", "check");

    // Showdown - evaluateWinner is called automatically at end of river if checked down?
    // Wait, evaluateWinner is called in nextStreet if stage is river.
    // Let's force it if needed, but handleAction calls advanceTurn -> nextStreet.

    // After river checks, nextStreet calls evaluateWinner.

    console.log("Game Over. Verifying DB...");

    // Allow some time for async DB ops
    await new Promise(r => setTimeout(r, 1000));

    const p1Stats = await db.getUser("0x111");
    const p2Stats = await db.getUser("0x222");

    console.log("P1 Stats:", p1Stats);
    console.log("P2 Stats:", p2Stats);

    if (p1Stats.vpip_count !== 1 || p1Stats.pfr_count !== 1) {
        console.error("FAILURE: P1 stats incorrect (expected VPIP=1, PFR=1)");
        process.exit(1);
    }
    if (p2Stats.vpip_count !== 1 || p2Stats.pfr_count !== 0) {
        console.error("FAILURE: P2 stats incorrect (expected VPIP=1, PFR=0)");
        process.exit(1);
    }

    const p1History = await db.getGameHistory("0x111");
    console.log("P1 History:", p1History);

    if (p1History.length === 0) {
        console.error("FAILURE: No history found for P1");
        process.exit(1);
    }

    const lastGame = p1History[0];
    // P1 bet 50, P2 bet 50. Pot 100.
    // If P1 won, net profit = 100 - 50 = +50.
    // If P1 lost, net profit = 0 - 50 = -50.
    // If split, net profit = 50 - 50 = 0.

    console.log(`P1 Net Profit: ${lastGame.net_profit}`);

    if (lastGame.net_profit === undefined) {
        console.error("FAILURE: net_profit not recorded");
        process.exit(1);
    }

    console.log("SUCCESS: Stats and History verified.");
}

verify().catch(console.error);
