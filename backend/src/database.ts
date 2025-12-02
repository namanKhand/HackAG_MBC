import sqlite3 from 'sqlite3';
import { open, Database as SQLiteDatabase } from 'sqlite';

export class Database {
    private db: SQLiteDatabase | null = null;

    async init() {
        this.db = await open({
            filename: './poker.db',
            driver: sqlite3.Database
        });

        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                address TEXT PRIMARY KEY,
                hands_played INTEGER DEFAULT 0,
                hands_won INTEGER DEFAULT 0,
                chips_won INTEGER DEFAULT 0,
                chips_won INTEGER DEFAULT 0,
                pfr_count INTEGER DEFAULT 0,
                pfr_opportunity INTEGER DEFAULT 0,
                vpip_count INTEGER DEFAULT 0,
                vpip_opportunity INTEGER DEFAULT 0,
                three_bet_count INTEGER DEFAULT 0,
                three_bet_opportunity INTEGER DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS game_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_id TEXT,
                winner_address TEXT,
                pot_size INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                hand_description TEXT
            );

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
    }

    async getUser(address: string): Promise<any> {
        if (!this.db) throw new Error("DB not initialized");
        const user = await this.db.get('SELECT * FROM users WHERE address = ?', address);
        if (!user) {
            await this.db.run('INSERT INTO users (address) VALUES (?)', address);
            return this.getUser(address);
        }
        return user;
    }

    async updateUserStats(address: string, stats: {
        hands_played?: number,
        hands_won?: number,
        chips_won?: number,
        pfr_count?: number,
        pfr_opportunity?: number,
        vpip_count?: number,
        vpip_opportunity?: number,
        three_bet_count?: number,
        three_bet_opportunity?: number
    }) {
        if (!this.db) throw new Error("DB not initialized");

        const updates: string[] = [];
        const values: any[] = [];

        Object.entries(stats).forEach(([key, value]) => {
            updates.push(`${key} = ${key} + ?`);
            values.push(value);
        });

        values.push(address);

        await this.db.run(`UPDATE users SET ${updates.join(', ')} WHERE address = ?`, ...values);
    }

    async addGameHistory(gameData: {
        table_id: string,
        winner_address: string,
        pot_size: number,
        hand_description: string
    }): Promise<number> {
        if (!this.db) throw new Error("DB not initialized");
        const result = await this.db.run(
            'INSERT INTO game_history (table_id, winner_address, pot_size, hand_description) VALUES (?, ?, ?, ?)',
            gameData.table_id, gameData.winner_address, gameData.pot_size, gameData.hand_description
        );
        return result.lastID!;
    }

    async addPlayerGameHistory(historyData: {
        game_id: number,
        address: string,
        net_profit: number,
        hand_description: string
    }) {
        if (!this.db) throw new Error("DB not initialized");
        await this.db.run(
            'INSERT INTO player_game_history (game_id, address, net_profit, hand_description) VALUES (?, ?, ?, ?)',
            historyData.game_id, historyData.address, historyData.net_profit, historyData.hand_description
        );
    }

    async getGameHistory(address: string) {
        if (!this.db) throw new Error("DB not initialized");
        // For now, just return all history where the user was the winner, 
        // or we could add a many-to-many table for players in a game.
        // Simplified: Return history where user won.
        return await this.db.all('SELECT * FROM player_game_history WHERE address = ? ORDER BY timestamp DESC LIMIT 50', address);
    }
}

export const db = new Database();
