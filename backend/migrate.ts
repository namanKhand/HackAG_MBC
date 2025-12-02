
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function migrate() {
    const db = await open({
        filename: './poker.db',
        driver: sqlite3.Database
    });

    console.log("Migrating DB...");

    try {
        await db.exec(`ALTER TABLE users ADD COLUMN vpip_count INTEGER DEFAULT 0;`);
        console.log("Added vpip_count");
    } catch (e) {
        console.log("vpip_count already exists or error:", e);
    }

    try {
        await db.exec(`ALTER TABLE users ADD COLUMN vpip_opportunity INTEGER DEFAULT 0;`);
        console.log("Added vpip_opportunity");
    } catch (e) {
        console.log("vpip_opportunity already exists or error:", e);
    }

    try {
        await db.exec(`
            CREATE TABLE IF NOT EXISTS player_game_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER,
                address TEXT,
                net_profit INTEGER,
                hand_description TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(game_id) REFERENCES game_history(id)
            );
        `);
        console.log("Created player_game_history table");
    } catch (e) {
        console.log("Error creating player_game_history:", e);
    }

    console.log("Migration complete.");
}

migrate().catch(console.error);
