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
            CREATE TABLE IF NOT EXISTS accounts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                email TEXT UNIQUE,
                password_hash TEXT,
                is_guest BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS wallets (
                address TEXT PRIMARY KEY,
                account_id INTEGER,
                FOREIGN KEY(account_id) REFERENCES accounts(id)
            );

            CREATE TABLE IF NOT EXISTS users (
                address TEXT PRIMARY KEY,
                account_id INTEGER,
                hands_played INTEGER DEFAULT 0,
                hands_won INTEGER DEFAULT 0,
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

    async createAccount(username: string, email: string, passwordHash: string, isGuest: boolean = false): Promise<number> {
        if (!this.db) throw new Error("DB not initialized");
        const result = await this.db.run(
            'INSERT INTO accounts (username, email, password_hash, is_guest) VALUES (?, ?, ?, ?)',
            username, email, passwordHash, isGuest
        );
        return result.lastID!;
    }

    async getAccountByEmail(email: string): Promise<any> {
        if (!this.db) throw new Error("DB not initialized");
        return await this.db.get('SELECT * FROM accounts WHERE email = ?', email);
    }

    async getAccountByUsername(username: string): Promise<any> {
        if (!this.db) throw new Error("DB not initialized");
        return await this.db.get('SELECT * FROM accounts WHERE username = ?', username);
    }

    async getAccountById(id: number): Promise<any> {
        if (!this.db) throw new Error("DB not initialized");
        return await this.db.get('SELECT * FROM accounts WHERE id = ?', id);
    }

    async linkWallet(accountId: number, address: string) {
        if (!this.db) throw new Error("DB not initialized");
        // Check if wallet is already linked
        const existing = await this.db.get('SELECT * FROM wallets WHERE address = ?', address);
        if (existing) {
            if (existing.account_id !== accountId) {
                throw new Error("Wallet already linked to another account");
            }
            return; // Already linked to this account
        }
        await this.db.run('INSERT INTO wallets (address, account_id) VALUES (?, ?)', address, accountId);

        // Also update users table to link stats to this account if user entry exists
        await this.db.run('UPDATE users SET account_id = ? WHERE address = ?', accountId, address);
    }

    async getWalletsForAccount(accountId: number): Promise<string[]> {
        if (!this.db) throw new Error("DB not initialized");
        const rows = await this.db.all('SELECT address FROM wallets WHERE account_id = ?', accountId);
        return rows.map(r => r.address);
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
    async getAccountStats(accountId: number) {
        if (!this.db) throw new Error("DB not initialized");
        // Aggregate stats from all wallets linked to this account
        // Also include stats from users table where account_id matches
        const stats = await this.db.get(`
            SELECT 
                SUM(hands_played) as hands_played,
                SUM(hands_won) as hands_won,
                SUM(chips_won) as chips_won,
                SUM(pfr_count) as pfr_count,
                SUM(pfr_opportunity) as pfr_opportunity,
                SUM(vpip_count) as vpip_count,
                SUM(vpip_opportunity) as vpip_opportunity,
                SUM(three_bet_count) as three_bet_count,
                SUM(three_bet_opportunity) as three_bet_opportunity
            FROM users 
            WHERE account_id = ?
        `, accountId);
        return stats;
    }

    async getAccountHistory(accountId: number) {
        if (!this.db) throw new Error("DB not initialized");
        // Get history for all wallets linked to this account
        return await this.db.all(`
            SELECT h.* 
            FROM player_game_history h
            JOIN users u ON h.address = u.address
            WHERE u.account_id = ?
            ORDER BY h.timestamp DESC 
            LIMIT 50
        `, accountId);
    }
}

export const db = new Database();
