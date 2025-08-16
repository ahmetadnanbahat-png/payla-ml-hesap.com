
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
}

// Test database connection
pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('Database connection error:', err);
});

// Middleware
app.use(express.json());
app.use(express.static('paylasimlihesap.com'));

// Database initialization
async function initializeDatabase() {
    try {
        // Users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'user',
                created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Games table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS games (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                app_id VARCHAR(100),
                platform VARCHAR(50),
                price DECIMAL(10,2),
                category VARCHAR(100),
                description TEXT,
                library_image VARCHAR(500),
                is_special BOOLEAN DEFAULT false,
                special_price DECIMAL(10,2),
                created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Game accounts table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS game_accounts (
                id SERIAL PRIMARY KEY,
                game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
                username VARCHAR(255) NOT NULL,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                guard_code VARCHAR(100),
                status VARCHAR(20) DEFAULT 'available',
                purchased_by INTEGER REFERENCES users(id),
                purchased_at TIMESTAMP,
                created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Keys table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS keys (
                id SERIAL PRIMARY KEY,
                key_value VARCHAR(255) UNIQUE NOT NULL,
                game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
                key_type VARCHAR(50) DEFAULT 'steam',
                status VARCHAR(20) DEFAULT 'available',
                used_by INTEGER REFERENCES users(id),
                used_date TIMESTAMP,
                created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Suggestions table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS suggestions (
                id SERIAL PRIMARY KEY,
                game_name VARCHAR(255) NOT NULL,
                username VARCHAR(50) NOT NULL,
                description TEXT,
                created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Purchases table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS purchases (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                game_id INTEGER REFERENCES games(id),
                account_id INTEGER REFERENCES game_accounts(id),
                purchase_type VARCHAR(20) DEFAULT 'account',
                price DECIMAL(10,2),
                created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create admin user if not exists
        const adminCheck = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
        if (adminCheck.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await pool.query(
                'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4)',
                ['admin', 'admin@paylasimlihesap.com', hashedPassword, 'admin']
            );
        }

        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
    }
}

// API Routes

// User registration
app.post('/api/users/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Check if user exists
        const userExists = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $2',
            [username, email]
        );
        
        if (userExists.rows.length > 0) {
            return res.json({ success: false, message: 'Kullanıcı adı veya e-posta zaten kullanımda!' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, role, created',
            [username, email, hashedPassword]
        );
        
        res.json({ success: true, message: 'Kayıt başarılı!', user: result.rows[0] });
    } catch (error) {
        console.error('Registration error:', error);
        res.json({ success: false, message: 'Kayıt sırasında bir hata oluştu!' });
    }
});

// User login
app.post('/api/users/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
            [username]
        );
        
        if (result.rows.length === 0) {
            return res.json({ success: false, message: 'Kullanıcı bulunamadı!' });
        }
        
        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(password, user.password);
        
        if (!isValidPassword) {
            return res.json({ success: false, message: 'Yanlış şifre!' });
        }
        
        const { password: _, ...userWithoutPassword } = user;
        res.json({ success: true, message: 'Giriş başarılı!', user: userWithoutPassword });
    } catch (error) {
        console.error('Login error:', error);
        res.json({ success: false, message: 'Giriş sırasında bir hata oluştu!' });
    }
});

// Get all games
app.get('/api/games', async (req, res) => {
    try {
        const gamesResult = await pool.query('SELECT * FROM games ORDER BY created DESC');
        const games = {};
        
        for (const game of gamesResult.rows) {
            const accountsResult = await pool.query(
                'SELECT id, username, email, status FROM game_accounts WHERE game_id = $1',
                [game.id]
            );
            
            games[game.id] = {
                ...game,
                accounts: accountsResult.rows
            };
        }
        
        res.json(games);
    } catch (error) {
        console.error('Get games error:', error);
        res.json({});
    }
});

// Add game (Admin only)
app.post('/api/games', async (req, res) => {
    try {
        const { name, appID, platform, price, category, description, libraryImage, isSpecial, specialPrice } = req.body;
        
        const result = await pool.query(`
            INSERT INTO games (name, app_id, platform, price, category, description, library_image, is_special, special_price)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
        `, [name, appID, platform, price, category, description, libraryImage, isSpecial, specialPrice]);
        
        res.json({ success: true, message: 'Oyun başarıyla eklendi!', game: result.rows[0] });
    } catch (error) {
        console.error('Add game error:', error);
        res.json({ success: false, message: 'Oyun eklenirken bir hata oluştu!' });
    }
});

// Delete game (Admin only)
app.delete('/api/games/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM games WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Oyun başarıyla silindi!' });
    } catch (error) {
        console.error('Delete game error:', error);
        res.json({ success: false, message: 'Oyun silinirken bir hata oluştu!' });
    }
});

// Add game account (Admin only)
app.post('/api/games/:gameId/accounts', async (req, res) => {
    try {
        const { username, password, email, guardCode } = req.body;
        const gameId = req.params.gameId;
        
        const result = await pool.query(`
            INSERT INTO game_accounts (game_id, username, password, email, guard_code)
            VALUES ($1, $2, $3, $4, $5) RETURNING *
        `, [gameId, username, password, email, guardCode]);
        
        res.json({ success: true, message: 'Hesap başarıyla eklendi!', account: result.rows[0] });
    } catch (error) {
        console.error('Add account error:', error);
        res.json({ success: false, message: 'Hesap eklenirken bir hata oluştu!' });
    }
});

// Delete game account (Admin only)
app.delete('/api/games/:gameId/accounts/:accountId', async (req, res) => {
    try {
        await pool.query('DELETE FROM game_accounts WHERE id = $1', [req.params.accountId]);
        res.json({ success: true, message: 'Hesap başarıyla silindi!' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.json({ success: false, message: 'Hesap silinirken bir hata oluştu!' });
    }
});

// Get all keys (Admin only)
app.get('/api/keys', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT k.*, g.name as game_name, u.username as used_by_username 
            FROM keys k 
            LEFT JOIN games g ON k.game_id = g.id 
            LEFT JOIN users u ON k.used_by = u.id
            ORDER BY k.created DESC
        `);
        
        const keys = {};
        result.rows.forEach(key => {
            keys[key.id] = {
                ...key,
                usedBy: key.used_by_username
            };
        });
        
        res.json(keys);
    } catch (error) {
        console.error('Get keys error:', error);
        res.json({});
    }
});

// Add key (Admin only)
app.post('/api/keys', async (req, res) => {
    try {
        const { keyValue, gameId, keyType } = req.body;
        
        const result = await pool.query(`
            INSERT INTO keys (key_value, game_id, key_type)
            VALUES ($1, $2, $3) RETURNING *
        `, [keyValue, gameId, keyType]);
        
        res.json({ success: true, message: 'Key başarıyla eklendi!', key: result.rows[0] });
    } catch (error) {
        console.error('Add key error:', error);
        res.json({ success: false, message: 'Key eklenirken bir hata oluştu!' });
    }
});

// Delete key (Admin only)
app.delete('/api/keys/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM keys WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Key başarıyla silindi!' });
    } catch (error) {
        console.error('Delete key error:', error);
        res.json({ success: false, message: 'Key silinirken bir hata oluştu!' });
    }
});

// Get all suggestions (Admin only)
app.get('/api/suggestions', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM suggestions ORDER BY created DESC');
        const suggestions = {};
        result.rows.forEach(suggestion => {
            suggestions[suggestion.id] = suggestion;
        });
        res.json(suggestions);
    } catch (error) {
        console.error('Get suggestions error:', error);
        res.json({});
    }
});

// Add suggestion
app.post('/api/suggestions', async (req, res) => {
    try {
        const { gameName, username, description } = req.body;
        
        const result = await pool.query(`
            INSERT INTO suggestions (game_name, username, description)
            VALUES ($1, $2, $3) RETURNING *
        `, [gameName, username, description]);
        
        res.json({ success: true, message: 'Öneri başarıyla gönderildi!', suggestion: result.rows[0] });
    } catch (error) {
        console.error('Add suggestion error:', error);
        res.json({ success: false, message: 'Öneri gönderilirken bir hata oluştu!' });
    }
});

// Delete suggestion (Admin only)
app.delete('/api/suggestions/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM suggestions WHERE id = $1', [req.params.id]);
        res.json({ success: true, message: 'Öneri başarıyla silindi!' });
    } catch (error) {
        console.error('Delete suggestion error:', error);
        res.json({ success: false, message: 'Öneri silinirken bir hata oluştu!' });
    }
});

// Get all users (Admin only)
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, email, role, created FROM users ORDER BY created DESC');
        const users = {};
        result.rows.forEach(user => {
            users[user.username] = user;
        });
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.json({});
    }
});

// Delete user (Admin only)
app.delete('/api/users/:username', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE username = $1', [req.params.username]);
        res.json({ success: true, message: 'Kullanıcı başarıyla silindi!' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.json({ success: false, message: 'Kullanıcı silinirken bir hata oluştu!' });
    }
});

// Get stats (Admin only)
app.get('/api/stats', async (req, res) => {
    try {
        const users = await pool.query('SELECT COUNT(*) FROM users');
        const games = await pool.query('SELECT COUNT(*) FROM games');
        const accounts = await pool.query('SELECT COUNT(*) FROM game_accounts');
        const keys = await pool.query('SELECT COUNT(*) FROM keys');
        const specialGames = await pool.query('SELECT COUNT(*) FROM games WHERE is_special = true');
        const suggestions = await pool.query('SELECT COUNT(*) FROM suggestions');
        const admins = await pool.query('SELECT COUNT(*) FROM users WHERE role = \'admin\'');
        
        res.json({
            totalUsers: parseInt(users.rows[0].count),
            totalGames: parseInt(games.rows[0].count),
            totalAccounts: parseInt(accounts.rows[0].count),
            totalKeys: parseInt(keys.rows[0].count),
            specialGames: parseInt(specialGames.rows[0].count),
            totalSuggestions: parseInt(suggestions.rows[0].count),
            totalAdmins: parseInt(admins.rows[0].count)
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.json({
            totalUsers: 0,
            totalGames: 0,
            totalAccounts: 0,
            totalKeys: 0,
            specialGames: 0,
            totalSuggestions: 0,
            totalAdmins: 0
        });
    }
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'paylasimlihesap.com', 'index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'paylasimlihesap.com', 'index.html'));
});

// Initialize database and start server
initializeDatabase().then(() => {
    app.listen(port, '0.0.0.0', () => {
        console.log(`Server running on http://0.0.0.0:${port}`);
        console.log('Database connection established successfully');
    });
}).catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
});
