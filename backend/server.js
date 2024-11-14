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

// Get all games with pagination
app.get('/api/games', async (req, res) => {
    const { page = 1, pageSize = 10 } = req.query;

    // Convert page and pageSize to integers and handle non-numeric cases
    const limit = parseInt(pageSize, 10) || 10;
    const offset = (parseInt(page, 10) - 1) * limit;

    try {
        const connection = await pool.getConnection();

        try {
            // Query to get paginated games
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
                    GROUP_CONCAT(DISTINCT gen.name) AS genres,
                    GROUP_CONCAT(DISTINCT dev.name) AS developers
                FROM games g
                LEFT JOIN game_genres gg ON g.app_id = gg.app_id
                LEFT JOIN genres gen ON gg.genre_id = gen.id
                LEFT JOIN game_developers gd ON g.app_id = gd.app_id
                LEFT JOIN developers dev ON gd.developer_id = dev.id
                GROUP BY g.app_id
                LIMIT ? OFFSET ?
            `, [limit, offset]);

            // Query to get the total count of games
            const [[{ totalCount }]] = await connection.query(`SELECT COUNT(*) AS totalCount FROM games`);

            // Calculate total pages based on count and pageSize
            const totalPages = Math.ceil(totalCount / limit);

            res.json({
                games: games.map(game => ({
                    ...game,
                    genres: game.genres ? game.genres.split(',') : [],
                    developers: game.developers ? game.developers.split(',') : [],
                    review_percentage: game.positive_reviews + game.negative_reviews > 0
                        ? Math.round((game.positive_reviews / (game.positive_reviews + game.negative_reviews)) * 100)
                        : null
                })),
                pagination: {
                    currentPage: parseInt(page, 10),
                    pageSize: limit,
                    totalCount,
                    totalPages
                }
            });
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error fetching paginated games:', error);
        res.status(500).json({ error: 'Failed to fetch games' });
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



app.get('/api/games/:appId', async (req, res) => {
    const appId = req.params.appId;
    
    try {
        const connection = await pool.getConnection();
        
        try {
            // First query: Get main game information and related entities
            const [gameResults] = await connection.query(`
                SELECT 
                    g.*,
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
                WHERE g.app_id = ?
                GROUP BY g.app_id
            `, [appId]);

            if (gameResults.length === 0) {
                return res.status(404).json({ error: 'Game not found' });
            }

            // Second query: Get screenshots
            const [screenshots] = await connection.query(`
                SELECT url
                FROM screenshots
                WHERE app_id = ?
            `, [appId]);

            // Third query: Get movies/trailers
            const [movies] = await connection.query(`
                SELECT url
                FROM movies
                WHERE app_id = ?
            `, [appId]);

            // Function to safely parse JSON or return empty array
            const safeParseJSON = (jsonString) => {
                try {
                    // If it's already an object, return it
                    if (typeof jsonString === 'object') return jsonString || [];
                    // Otherwise try to parse it
                    return JSON.parse(jsonString || '[]');
                } catch (e) {
                    console.warn('Failed to parse JSON:', e);
                    return [];
                }
            };

            // Process the game data
            const game = {
                ...gameResults[0],
                // Handle JSON columns
                supported_languages: safeParseJSON(gameResults[0].supported_languages),
                full_audio_languages: safeParseJSON(gameResults[0].full_audio_languages),
                // Convert comma-separated strings to arrays
                developers: gameResults[0].developers ? gameResults[0].developers.split(',') : [],
                publishers: gameResults[0].publishers ? gameResults[0].publishers.split(',') : [],
                categories: gameResults[0].categories ? gameResults[0].categories.split(',') : [],
                genres: gameResults[0].genres ? gameResults[0].genres.split(',') : [],
                tags: gameResults[0].tags ? gameResults[0].tags.split(',') : [],
                // Add media arrays
                screenshots: screenshots.map(s => s.url),
                movies: movies.map(m => m.url),
                // Add computed fields
                review_score: gameResults[0].positive_reviews + gameResults[0].negative_reviews > 0 
                    ? Math.round((gameResults[0].positive_reviews / 
                        (gameResults[0].positive_reviews + gameResults[0].negative_reviews)) * 100)
                    : null,
                // Convert boolean fields
                windows: Boolean(gameResults[0].windows),
                mac: Boolean(gameResults[0].mac),
                linux: Boolean(gameResults[0].linux),
                // Format playtime data
                playtime: {
                    average: {
                        forever: Math.round(gameResults[0].average_playtime_forever / 60), // Convert to hours
                        two_weeks: Math.round(gameResults[0].average_playtime_two_weeks / 60)
                    },
                    median: {
                        forever: Math.round(gameResults[0].median_playtime_forever / 60),
                        two_weeks: Math.round(gameResults[0].median_playtime_two_weeks / 60)
                    }
                }
            };

            res.json(game);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error fetching game details:', error);
        res.status(500).json({ 
            error: 'Failed to fetch game details',
            message: error.message 
        });
    }
});

const isAdmin = async (req, res, next) => {
    try {
        const connection = await pool.getConnection();
        const [users] = await connection.query(
            'SELECT role FROM users WHERE id = ?',
            [req.user.userId]
        );
        connection.release();

        if (users.length === 0 || users[0].role !== 'admin') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    } catch (error) {
        res.status(500).json({ error: 'Authorization check failed' });
    }
};

// Create new game (Admin only)
app.post('/api/games', authenticateToken, isAdmin, async (req, res) => {
    const {
        app_id,
        name,
        release_date,
        price,
        header_image,
        metacritic_score,
        about_the_game
    } = req.body;

    try {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            await connection.query(`
                INSERT INTO games (
                    app_id, name, release_date, price,
                    header_image, metacritic_score, about_the_game
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [app_id, name, release_date, price, header_image, metacritic_score, about_the_game]);

            await connection.commit();
            res.status(201).json({ message: 'Game created successfully' });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error creating game:', error);
        res.status(500).json({ error: 'Failed to create game' });
    }
});

// Update game (Admin only)
// Update game (Admin only)
app.put('/api/games/:appId', authenticateToken, isAdmin, async (req, res) => {
    const { appId } = req.params;
    const {
        // Main game info
        name,
        release_date,
        price,
        header_image,
        metacritic_score,
        about_the_game,
        supported_languages,
        full_audio_languages,
        windows,
        mac,
        linux,
        // Related data arrays
        developers,
        publishers,
        categories,
        genres,
        tags,
        screenshots,
        movies
    } = req.body;

    try {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // 1. Update main game information
            const [updateResult] = await connection.query(`
                UPDATE games
                SET 
                    name = ?,
                    release_date = ?,
                    price = ?,
                    header_image = ?,
                    metacritic_score = ?,
                    about_the_game = ?,
                    supported_languages = ?,
                    full_audio_languages = ?,
                    windows = ?,
                    mac = ?,
                    linux = ?
                WHERE app_id = ?
            `, [
                name,
                release_date,
                price,
                header_image,
                metacritic_score,
                about_the_game,
                JSON.stringify(supported_languages || []),
                JSON.stringify(full_audio_languages || []),
                windows || false,
                mac || false,
                linux || false,
                appId
            ]);

            if (updateResult.affectedRows === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'Game not found' });
            }

            // Helper function to update related items
            async function updateRelatedItems(tableName, items, itemType) {
                // Delete existing relationships
                await connection.query(`DELETE FROM ${tableName} WHERE app_id = ?`, [appId]);
                
                if (items && items.length > 0) {
                    // Get or create items and their IDs
                    const values = await Promise.all(items.map(async (item) => {
                        const [rows] = await connection.query(
                            `INSERT IGNORE INTO ${itemType} (name) VALUES (?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,
                            [item]
                        );
                        const [idResult] = await connection.query(
                            `SELECT id FROM ${itemType} WHERE name = ?`,
                            [item]
                        );
                        return idResult[0].id;
                    }));

                    // Create new relationships
                    const relationshipValues = values.map(id => [appId, id]);
                    if (relationshipValues.length > 0) {
                        const idColumn = itemType.slice(0, -1) + '_id'; // Remove 's' and add '_id'
                        await connection.query(
                            `INSERT INTO ${tableName} (app_id, ${idColumn}) VALUES ?`,
                            [relationshipValues]
                        );
                    }
                }
            }

            // 2. Update all related data
            if (developers) {
                await updateRelatedItems('game_developers', developers, 'developers');
            }
            if (publishers) {
                await updateRelatedItems('game_publishers', publishers, 'publishers');
            }
            if (categories) {
                await updateRelatedItems('game_categories', categories, 'categories');
            }
            if (genres) {
                await updateRelatedItems('game_genres', genres, 'genres');
            }
            if (tags) {
                await updateRelatedItems('game_tags', tags, 'tags');
            }

            // 3. Update screenshots
            if (screenshots) {
                await connection.query('DELETE FROM screenshots WHERE app_id = ?', [appId]);
                if (screenshots.length > 0) {
                    const screenshotValues = screenshots.map(url => [appId, url]);
                    await connection.query(
                        'INSERT INTO screenshots (app_id, url) VALUES ?',
                        [screenshotValues]
                    );
                }
            }

            // 4. Update movies/trailers
            if (movies) {
                await connection.query('DELETE FROM movies WHERE app_id = ?', [appId]);
                if (movies.length > 0) {
                    const movieValues = movies.map(url => [appId, url]);
                    await connection.query(
                        'INSERT INTO movies (app_id, url) VALUES ?',
                        [movieValues]
                    );
                }
            }

            await connection.commit();
            res.json({ 
                message: 'Game and related data updated successfully',
                updatedGameId: appId
            });

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error updating game:', error);
        res.status(500).json({ 
            error: 'Failed to update game',
            message: error.message,
            details: 'An error occurred while updating the game and its related data'
        });
    }
});
// Delete game (Admin only)
// Delete game (Admin only)
app.delete('/api/games/:appId', authenticateToken, isAdmin, async (req, res) => {
    const { appId } = req.params;

    try {
        const connection = await pool.getConnection();
        
        try {
            await connection.beginTransaction();

            // Delete from all related tables first (including price history)
            const relatedTables = [
                'game_price_history',
                'game_categories',
                'game_developers',
                'game_publishers',
                'game_genres',
                'game_tags',
                'screenshots',
                'movies',
                'user_games'
            ];

            // Delete from all related tables
            for (const table of relatedTables) {
                await connection.query(`DELETE FROM ${table} WHERE app_id = ?`, [appId]);
            }

            // Finally, delete the game itself
            const [result] = await connection.query(
                'DELETE FROM games WHERE app_id = ?',
                [appId]
            );

            if (result.affectedRows === 0) {
                await connection.rollback();
                return res.status(404).json({ error: 'Game not found' });
            }

            await connection.commit();
            res.json({ 
                message: 'Game and all related data deleted successfully',
                deletedGameId: appId
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error deleting game:', error);
        res.status(500).json({ 
            error: 'Failed to delete game',
            message: error.message,
            details: 'An error occurred while deleting the game and its related data'
        });
    }
});

// Get current user info with role
app.get('/api/users/me', authenticateToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [users] = await connection.query(
            'SELECT id, username, role FROM users WHERE id = ?',
            [req.user.userId]
        );
        connection.release();

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(users[0]);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user information' });
    }
});

// Trending games endpoint that combines multiple factors
app.get('/api/trending', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        
        try {
            const [trendingGames] = await connection.query(`
SELECT 
    g.app_id,
    g.name,
    g.header_image,
    g.release_date,
    g.price,
    g.metacritic_score,
    g.positive_reviews,
    g.negative_reviews,
    g.average_playtime_forever,
    GROUP_CONCAT(DISTINCT gen.name) as genres,
    (
        (COALESCE(g.metacritic_score, 0) / 100) * 0.25 +  
        (CASE 
            WHEN (g.positive_reviews + g.negative_reviews) = 0 THEN 0
            ELSE CAST(g.positive_reviews AS DECIMAL(10,2)) / (g.positive_reviews + g.negative_reviews)
        END * 0.35) +  
        (LEAST(g.average_playtime_forever / 3000, 1) * 0.25) +
        (LEAST(DATEDIFF(CURRENT_DATE, g.release_date) / 365, 1) * -0.15)  -- Recent games get higher scores
    ) as trending_score
FROM games g
LEFT JOIN game_genres gg ON g.app_id = gg.app_id
LEFT JOIN genres gen ON gg.genre_id = gen.id
WHERE 
    g.release_date >= '2000-01-01'  -- Include all games since 2000
    AND (g.positive_reviews + g.negative_reviews) > 5  -- Minimum reviews requirement
GROUP BY g.app_id
HAVING trending_score > 0  -- Minimum trending score threshold
ORDER BY trending_score DESC
LIMIT 10;
            `);

            // Log the number of games fetched and the full endpoint
            console.log(`Fetched ${trendingGames.length} games from endpoint: ${req.protocol}://${req.get('host')}${req.originalUrl}`);

            res.json(trendingGames.map(game => ({
                ...game,
                genres: game.genres ? game.genres.split(',') : [],
                review_score: game.positive_reviews + game.negative_reviews > 0
                    ? Math.round((game.positive_reviews / (game.positive_reviews + game.negative_reviews)) * 100)
                    : null,
                playtime_hours: Math.round(game.average_playtime_forever / 60),
                trending_score: Math.round(game.trending_score * 100)
            })));

        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error fetching trending games:', error);
        res.status(500).json({ error: 'Failed to fetch trending games' });
    }
});
// Updated endpoint to include pagination parameters
app.get('/api/by-genre', async (req, res) => {
    const { 
        genre = '', 
        minPrice = 0, 
        maxPrice = 100,
        page = 1,
        pageSize = 20
    } = req.query;
    
    try {
        const connection = await pool.getConnection();
        try {
            // Call the stored procedure with all required parameters
            const [results] = await connection.query(
                'CALL GetGamesByGenre(?, ?, ?, ?, ?)',
                [genre, minPrice, maxPrice, page, pageSize]
            );

            // The procedure returns two result sets:
            // 1. The games data
            // 2. The pagination information
            const games = results[0];
            const paginationInfo = results[1]?.[0];

            // Set pagination headers
            if (paginationInfo) {
                res.set({
                    'X-Total-Count': paginationInfo.totalCount,
                    'X-Current-Page': paginationInfo.currentPage,
                    'X-Total-Pages': paginationInfo.totalPages,
                    'X-Page-Size': paginationInfo.pageSize
                });
            }

            res.json(games);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch games' });
    }
});

// The genres endpoint is working correctly, so we can keep it as is
app.get('/api/genres', async (req, res) => {
    try {
        const connection = await pool.getConnection();
        try {
            const [genres] = await connection.query(`
                SELECT DISTINCT g.id, g.name 
                FROM genres g
                INNER JOIN game_genres gg ON g.id = gg.genre_id
                ORDER BY g.name ASC
            `);
            
            console.log('Fetched genres:', genres);
            res.json(genres);
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to fetch genres' });
    }
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