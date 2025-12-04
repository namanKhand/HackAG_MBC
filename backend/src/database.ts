import sqlite3 from 'sqlite3';
import { open, Database as SQLiteDatabase } from 'sqlite';

export class Database {
    private db: SQLiteDatabase | null = null;

    async init() {
        const dbPath = process.env.DB_PATH || './poker.db';
        console.log(`Initializing database at: ${dbPath}`);
        this.db = await open({
            filename: dbPath,
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

            CREATE TABLE IF NOT EXISTS play_money_stats (
                account_id INTEGER PRIMARY KEY,
                hands_played INTEGER DEFAULT 0,
                hands_won INTEGER DEFAULT 0,
                chips_won INTEGER DEFAULT 0,
                pfr_count INTEGER DEFAULT 0,
                pfr_opportunity INTEGER DEFAULT 0,
                vpip_count INTEGER DEFAULT 0,
                vpip_opportunity INTEGER DEFAULT 0,
                three_bet_count INTEGER DEFAULT 0,
                three_bet_opportunity INTEGER DEFAULT 0,
                FOREIGN KEY(account_id) REFERENCES accounts(id)
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
                is_real_money BOOLEAN DEFAULT 1,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(game_id) REFERENCES game_history(id)
            );
            CREATE TABLE IF NOT EXISTS table_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_id TEXT,
                account_id INTEGER,
                buy_in INTEGER,
                cash_out INTEGER,
                net_profit INTEGER,
                start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                end_time DATETIME,
                FOREIGN KEY(account_id) REFERENCES accounts(id)
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

    async updateUserStats(identifier: string | number, stats: {
        hands_played?: number,
        hands_won?: number,
        chips_won?: number,
        pfr_count?: number,
        pfr_opportunity?: number,
        vpip_count?: number,
        vpip_opportunity?: number,
        three_bet_count?: number,
        three_bet_opportunity?: number
    }, mode: 'real' | 'play' = 'real') {
        if (!this.db) throw new Error("DB not initialized");

        const updates: string[] = [];
        const values: any[] = [];

        Object.entries(stats).forEach(([key, value]) => {
            updates.push(`${key} = ${key} + ?`);
            values.push(value);
        });

        if (mode === 'real') {
            // Identifier is address string
            values.push(identifier);
            await this.db.run(`UPDATE users SET ${updates.join(', ')} WHERE address = ?`, ...values);
        } else {
            // Identifier is accountId number
            // Ensure record exists first
            const exists = await this.db.get('SELECT * FROM play_money_stats WHERE account_id = ?', identifier);
            if (!exists) {
                await this.db.run('INSERT INTO play_money_stats (account_id) VALUES (?)', identifier);
            }
            values.push(identifier);
            await this.db.run(`UPDATE play_money_stats SET ${updates.join(', ')} WHERE account_id = ?`, ...values);
        }
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
        hand_description: string,
        is_real_money: boolean
    }) {
        if (!this.db) throw new Error("DB not initialized");
        await this.db.run(
            'INSERT INTO player_game_history (game_id, address, net_profit, hand_description, is_real_money) VALUES (?, ?, ?, ?, ?)',
            historyData.game_id, historyData.address, historyData.net_profit, historyData.hand_description, historyData.is_real_money
        );
    }

    async createTableSession(tableId: string, accountId: number, buyIn: number): Promise<number> {
        if (!this.db) throw new Error("DB not initialized");
        const result = await this.db.run(
            'INSERT INTO table_sessions (table_id, account_id, buy_in) VALUES (?, ?, ?)',
            tableId, accountId, buyIn
        );
        return result.lastID!;
    }

    async updateTableSession(sessionId: number, cashOut: number) {
        if (!this.db) throw new Error("DB not initialized");

        // Calculate net profit
        const session = await this.db.get('SELECT buy_in FROM table_sessions WHERE id = ?', sessionId);
        if (!session) return;

        const netProfit = cashOut - session.buy_in;

        await this.db.run(
            'UPDATE table_sessions SET cash_out = ?, net_profit = ?, end_time = CURRENT_TIMESTAMP WHERE id = ?',
            cashOut, netProfit, sessionId
        );
    }

    async getGameHistory(address: string) {
        if (!this.db) throw new Error("DB not initialized");
        // For now, just return all history where the user was the winner, 
        // or we could add a many-to-many table for players in a game.
        // Simplified: Return history where user won.
        return await this.db.all('SELECT * FROM player_game_history WHERE address = ? ORDER BY timestamp DESC LIMIT 50', address);
    }
    async getAccountStats(accountId: number, mode: 'real' | 'play' = 'real') {
        if (!this.db) throw new Error("DB not initialized");

        if (mode === 'real') {
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
        } else {
            // Get stats from play_money_stats table
            return await this.db.get('SELECT * FROM play_money_stats WHERE account_id = ?', accountId);
        }
    }

    async getAccountHistory(accountId: number, mode: 'real' | 'play' = 'real') {
        if (!this.db) throw new Error("DB not initialized");

        if (mode === 'real') {
            // Get history for all wallets linked to this account
            return await this.db.all(`
                SELECT h.* 
                FROM player_game_history h
                JOIN users u ON h.address = u.address
                WHERE u.account_id = ? AND h.is_real_money = 1
                ORDER BY h.timestamp DESC 
                LIMIT 50
            `, accountId);
        } else {
            // For play money, we use the username as the address identifier in player_game_history
            const account = await this.getAccountById(accountId);
            if (!account) return [];

            return await this.db.all(`
                SELECT * FROM player_game_history 
                WHERE address = ? AND is_real_money = 0
                ORDER BY timestamp DESC
                LIMIT 50
            `, account.username);
        }
    }
}

export const db = new Database();
