const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
console.log('Using JWT_SECRET:', JWT_SECRET);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database configuration
const dbConfig = {
    host: 'mysql-404e161-playhorizon.j.aivencloud.com',
    port: 16511,
    user: 'avnadmin',
    password: 'AVNS_yzYNBDWOUm1nQnP2xwP',
    database: 'defaultdb',
    ssl: {
        rejectUnauthorized: false
    }
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Database initialization function
async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        
        try {
            // Initialize users table
            const [userTables] = await connection.query(`
                SELECT TABLE_NAME 
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'
            `, [dbConfig.database]);

            if (userTables.length === 0) {
                console.log('Users table not found. Creating...');
                
                await connection.query(`
                    CREATE TABLE users (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        username VARCHAR(255) NOT NULL UNIQUE,
                        email VARCHAR(255) NOT NULL UNIQUE,
                        password_hash VARCHAR(255) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        last_login TIMESTAMP NULL,
                        UNIQUE INDEX idx_username (username),
                        UNIQUE INDEX idx_email (email)
                    )
                `);
                
                console.log('Users table created successfully');
            } else {
                console.log('Users table already exists');
            }

            // Initialize user_games table with BIGINT app_id
            const [userGameTables] = await connection.query(`
                SELECT TABLE_NAME 
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'user_games'
            `, [dbConfig.database]);

            if (userGameTables.length === 0) {
                console.log('User_games table not found. Creating...');
                
                // First drop the table if it exists (to handle failed previous attempts)
                await connection.query(`DROP TABLE IF EXISTS user_games`);
                
                // Create the user_games table with BIGINT app_id to match the games table
                await connection.query(`
                    CREATE TABLE user_games (
                        id INT PRIMARY KEY AUTO_INCREMENT,
                        user_id INT NOT NULL,
                        app_id BIGINT NOT NULL,
                        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        playtime_minutes INT DEFAULT 0,
                        last_played TIMESTAMP NULL,
                        UNIQUE INDEX idx_user_game (user_id, app_id),
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        FOREIGN KEY (app_id) REFERENCES games(app_id) ON DELETE CASCADE
                    )
                `);
                
                console.log('User_games table created successfully');
            } else {
                console.log('User_games table already exists');
            }

        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Database initialization error:', error);
        if (error.sqlMessage) {
            console.error('SQL Error Message:', error.sqlMessage);
        }
        throw error;
    }
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Test database connection
app.get('/api/health', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        await connection.query('SELECT 1');
        connection.release();
        res.json({ status: 'Database connection successful' });
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({ error: 'Database connection failed' });
    }
});

// User registration
app.post('/api/signup', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            const [result] = await connection.query(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                [username, email, passwordHash]
            );

            await connection.commit();
            
            res.status(201).json({
                message: 'User registered successfully',
                userId: result.insertId
            });
        } catch (error) {
            await connection.rollback();
            
            if (error.code === 'ER_DUP_ENTRY') {
                if (error.message.includes('username')) {
                    res.status(400).json({ error: 'Username already taken' });
                } else if (error.message.includes('email')) {
                    res.status(400).json({ error: 'Email already registered' });
                } else {
                    res.status(400).json({ error: 'Duplicate entry' });
                }
            } else {
                throw error;
            }
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const connection = await pool.getConnection();
        
        try {
            const [users] = await connection.query(
                'SELECT * FROM users WHERE email = ?',
                [email]
            );

            if (users.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const user = users[0];

            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            await connection.query(
                'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
                [user.id]
            );

            const token = jwt.sign(
                { userId: user.id, username: user.username },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get user's game library
app.get('/api/users/:userId/games', authenticateToken, async (req, res) => {
    const { userId } = req.params;

    if (parseInt(userId) !== req.user.userId) {
        return res.status(403).json({ error: 'Unauthorized access' });
    }

    try {
        const connection = await pool.getConnection();
        
        try {
            const [games] = await connection.query(`
                SELECT g.*, ug.playtime_minutes, ug.last_played, ug.added_at
                FROM games g
                JOIN user_games ug ON g.app_id = ug.app_id
                WHERE ug.user_id = ?
                ORDER BY ug.added_at DESC
            `, [userId]);

            res.json({ games });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error fetching user games:', error);
        res.status(500).json({ error: 'Failed to fetch games' });
    }
});

// Add game to user's library
app.post('/api/users/:userId/games', authenticateToken, async (req, res) => {
    const { userId } = req.params;
    const { appId } = req.body;

    if (parseInt(userId) !== req.user.userId) {
        return res.status(403).json({ error: 'Unauthorized access' });
    }

    try {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            const [games] = await connection.query(
                'SELECT app_id FROM games WHERE app_id = ?',
                [appId]
            );

            if (games.length === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'Game not found' });
            }

            await connection.query(
                'INSERT INTO user_games (user_id, app_id) VALUES (?, ?)',
                [userId, appId]
            );

            await connection.commit();
            
            res.status(201).json({ message: 'Game added to library' });
        } catch (error) {
            await connection.rollback();
            
            if (error.code === 'ER_DUP_ENTRY') {
                res.status(400).json({ error: 'Game already in library' });
            } else {
                throw error;
            }
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error adding game to library:', error);
        res.status(500).json({ error: 'Failed to add game' });
    }
});

// Remove game from user's library
app.delete('/api/users/:userId/games/:appId', authenticateToken, async (req, res) => {
    const { userId, appId } = req.params;

    if (parseInt(userId) !== req.user.userId) {
        return res.status(403).json({ error: 'Unauthorized access' });
    }

    try {
        const connection = await pool.getConnection();
        
        try {
            const [result] = await connection.query(
                'DELETE FROM user_games WHERE user_id = ? AND app_id = ?',
                [userId, appId]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Game not found in library' });
            }

            res.json({ message: 'Game removed from library' });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error removing game from library:', error);
        res.status(500).json({ error: 'Failed to remove game' });
    }
});

// Update game playtime
app.patch('/api/users/:userId/games/:appId', authenticateToken, async (req, res) => {
    const { userId, appId } = req.params;
    const { playtimeMinutes } = req.body;

    if (parseInt(userId) !== req.user.userId) {
        return res.status(403).json({ error: 'Unauthorized access' });
    }

    try {
        const connection = await pool.getConnection();
        
        try {
            const [result] = await connection.query(`
                UPDATE user_games 
                SET playtime_minutes = ?, last_played = CURRENT_TIMESTAMP
                WHERE user_id = ? AND app_id = ?
            `, [playtimeMinutes, userId, appId]);

            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Game not found in library' });
            }

            res.json({ message: 'Playtime updated successfully' });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error updating playtime:', error);
        res.status(500).json({ error: 'Failed to update playtime' });
    }
});

app.get('/api/games/search', async (req, res) => {
    const { query } = req.query;
    
    // Validate query parameter
    if (!query?.trim()) {
        return res.status(400).json({ 
            error: 'Search query is required',
            games: []
        });
    }

    try {
        const connection = await pool.getConnection();
        
        try {
            // Search with LIKE for partial matches
            const [games] = await connection.query(`
                SELECT 
                    g.app_id,
                    g.name,
                    g.release_date,
                    g.price,
                    g.header_image,
                    g.metacritic_score,
                    g.positive_reviews,
                    g.negative_reviews,
                    g.average_playtime_forever,
                    GROUP_CONCAT(DISTINCT gen.name) as genres,
                    GROUP_CONCAT(DISTINCT dev.name) as developers
                FROM games g
                LEFT JOIN game_genres gg ON g.app_id = gg.app_id
                LEFT JOIN genres gen ON gg.genre_id = gen.id
                LEFT JOIN game_developers gd ON g.app_id = gd.app_id
                LEFT JOIN developers dev ON gd.developer_id = dev.id
                WHERE g.name LIKE CONCAT('%', ?, '%')
                GROUP BY g.app_id
                LIMIT 10
            `, [query]);

            // Calculate review percentage and format the response
            const gamesWithStats = games.map(game => ({
                ...game,
                genres: game.genres ? game.genres.split(',') : [],
                developers: game.developers ? game.developers.split(',') : [],
                review_percentage: game.positive_reviews + game.negative_reviews > 0
                    ? Math.round((game.positive_reviews / (game.positive_reviews + game.negative_reviews)) * 100)
                    : null,
                playtime_hours: Math.round(game.average_playtime_forever / 60)
            }));

            // Always return a JSON response with a games array
            res.json({
                games: gamesWithStats,
                total: gamesWithStats.length
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Search error:', error);
        // Return a structured error response
        res.status(500).json({ 
            error: 'Search failed',
            message: error.message,
            games: []
        });
    }
});




// API endpoint to get game details by appId
app.get('/api/games/:appId', (req, res) => {
  const appId = req.params.appId;
  const query = `
  SELECT 
  g.app_id,
  g.name,
  g.release_date,
  g.price,
  g.dlc_count,
  g.about_the_game,
  g.header_image,
  g.website,
  g.support_url,
  g.support_email,
  g.metacritic_score,
  g.user_score,
  g.positive_reviews,
  g.negative_reviews,
  GROUP_CONCAT(DISTINCT dev.name) AS developers,
  GROUP_CONCAT(DISTINCT pub.name) AS publishers,
  GROUP_CONCAT(DISTINCT cat.name) AS categories,
  GROUP_CONCAT(DISTINCT gen.name) AS genres,
  GROUP_CONCAT(DISTINCT tag.name) AS tags
FROM games g
LEFT JOIN game_developers gd ON g.app_id = gd.app_id
LEFT JOIN developers dev ON gd.developer_id = dev.id
LEFT JOIN game_publishers gp ON g.app_id = gp.app_id
LEFT JOIN publishers pub ON gp.publisher_id = pub.id
LEFT JOIN game_categories gc ON g.app_id = gc.app_id
LEFT JOIN categories cat ON gc.category_id = cat.id
LEFT JOIN game_genres gg ON g.app_id = gg.app_id
LEFT JOIN genres gen ON gg.genre_id = gen.id
LEFT JOIN game_tags gt ON g.app_id = gt.app_id
LEFT JOIN tags tag ON gt.tag_id = tag.id
GROUP BY g.app_id
ORDER BY g.release_date DESC;

  `;
  
  connection.query(query, [appId], (err, results) => {
    if (err) {
      console.error('Error fetching data from the database:', err);
      return res.status(500).send('Error fetching data');
    }
    
    // If no result is found for the given appId
    if (results.length === 0) {
      return res.status(404).send('Game not found');
    }

    res.json(results[0]);  // Send the first result (as we're fetching by appId)
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    try {
        await initializeDatabase();
        console.log(`Server running on port ${PORT}`);
    } catch (error) {
        console.error('Failed to initialize database. Server shutting down.');
        process.exit(1);
    }
});


