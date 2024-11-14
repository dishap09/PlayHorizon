import pymysql
from typing import Dict, Any, List
import sys
from datetime import datetime
from typing import Optional
# Database configuration (same as before)
DB_CONFIG = {
    "charset": "utf8mb4",
    "connect_timeout": 10,
    "cursorclass": pymysql.cursors.DictCursor,
    "db": "defaultdb",
    "host": "mysql-404e161-playhorizon.j.aivencloud.com",
    "password": "AVNS_yzYNBDWOUm1nQnP2xwP",
    "read_timeout": 10,
    "port": 16511,
    "user": "avnadmin",
    "write_timeout": 10,
}

def test_connection() -> bool:
    """Test database connection"""
    try:
        connection = pymysql.connect(**DB_CONFIG)
        with connection.cursor() as cursor:
            cursor.execute("SELECT VERSION()")
            version = cursor.fetchone()
            print(f"Successfully connected to MySQL version: {version['VERSION()']}")
        connection.close()
        return True
    except Exception as e:
        print(f"Connection error: {e}")
        return False

def get_table_info(connection) -> Dict[str, List[Dict[str, Any]]]:
    """Get information about all tables in the database"""
    table_info = {}
    try:
        with connection.cursor() as cursor:
            # Get list of tables
            cursor.execute("""
                SELECT TABLE_NAME 
                FROM information_schema.tables 
                WHERE table_schema = %s 
                AND table_type = 'BASE TABLE'
            """, (DB_CONFIG['db'],))
            
            tables = [row['TABLE_NAME'] for row in cursor.fetchall()]
            
            # Get column information for each table
            for table_name in tables:
                cursor.execute("""
                    SELECT 
                        COLUMN_NAME,
                        COLUMN_TYPE,
                        IS_NULLABLE,
                        COLUMN_KEY,
                        EXTRA
                    FROM information_schema.columns
                    WHERE table_schema = %s 
                    AND table_name = %s
                    ORDER BY ordinal_position
                """, (DB_CONFIG['db'], table_name))
                
                columns = cursor.fetchall()
                table_info[table_name] = columns
                
    except Exception as e:
        print(f"Error getting table info: {e}")
        raise
    
    return table_info

def create_tables(connection):
    """Create all necessary tables"""
    with connection.cursor() as cursor:
        # First create tables without foreign keys
        cursor.execute("""
                CREATE TABLE IF NOT EXISTS games (
                    app_id BIGINT PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    release_date DATE,
                    estimated_owners VARCHAR(100),
                    peak_ccu INT,
                    required_age INT,
                    price DECIMAL(10,2),
                    dlc_count INT,
                    about_the_game TEXT,
                    supported_languages JSON,
                    full_audio_languages JSON,
                    reviews TEXT,
                    header_image VARCHAR(255),
                    website VARCHAR(255),
                    support_url VARCHAR(255),
                    support_email VARCHAR(255),
                    windows TINYINT(1),
                    mac TINYINT(1),
                    linux TINYINT(1),
                    metacritic_score INT,
                    metacritic_url VARCHAR(255),
                    user_score INT,
                    positive_reviews INT,
                    negative_reviews INT,
                    score_rank VARCHAR(50),
                    achievements INT,
                    recommendations INT,
                    notes TEXT,
                    average_playtime_forever INT,
                    average_playtime_two_weeks INT,
                    median_playtime_forever INT,
                    median_playtime_two_weeks INT,
                    INDEX idx_name (name),
                    INDEX idx_release_date (release_date),
                    INDEX idx_price (price),
                    INDEX idx_metacritic (metacritic_score)
            )
        """)
        print("✓ Created games table")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS developers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                UNIQUE INDEX idx_dev_name (name)
            )
        """)
        print("✓ Created developers table")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS publishers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                UNIQUE INDEX idx_pub_name (name)
            )
        """)
        print("✓ Created publishers table")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                UNIQUE INDEX idx_cat_name (name)
            )
        """)
        print("✓ Created categories table")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS genres (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                UNIQUE INDEX idx_genre_name (name)
            )
        """)
        print("✓ Created genres table")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tags (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                UNIQUE INDEX idx_tag_name (name)
            )
        """)
        print("✓ Created tags table")

        # Now create tables with foreign keys
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS screenshots (
                id INT AUTO_INCREMENT PRIMARY KEY,
                app_id BIGINT,
                url VARCHAR(255) NOT NULL,
                FOREIGN KEY (app_id) REFERENCES games(app_id)
            )
        """)
        print("✓ Created screenshots table")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS movies (
                id INT AUTO_INCREMENT PRIMARY KEY,
                app_id BIGINT,
                url VARCHAR(255) NOT NULL,
                FOREIGN KEY (app_id) REFERENCES games(app_id)
            )
        """)
        print("✓ Created movies table")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS game_developers (
                app_id BIGINT,
                developer_id INT,
                PRIMARY KEY (app_id, developer_id),
                FOREIGN KEY (app_id) REFERENCES games(app_id),
                FOREIGN KEY (developer_id) REFERENCES developers(id)
            )
        """)
        print("✓ Created game_developers table")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS game_publishers (
                app_id BIGINT,
                publisher_id INT,
                PRIMARY KEY (app_id, publisher_id),
                FOREIGN KEY (app_id) REFERENCES games(app_id),
                FOREIGN KEY (publisher_id) REFERENCES publishers(id)
            )
        """)
        print("✓ Created game_publishers table")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS game_categories (
                app_id BIGINT,
                category_id INT,
                PRIMARY KEY (app_id, category_id),
                FOREIGN KEY (app_id) REFERENCES games(app_id),
                FOREIGN KEY (category_id) REFERENCES categories(id)
            )
        """)
        print("✓ Created game_categories table")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS game_genres (
                app_id BIGINT,
                genre_id INT,
                PRIMARY KEY (app_id, genre_id),
                FOREIGN KEY (app_id) REFERENCES games(app_id),
                FOREIGN KEY (genre_id) REFERENCES genres(id)
            )
        """)
        print("✓ Created game_genres table")

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS game_tags (
                app_id BIGINT,
                tag_id INT,
                PRIMARY KEY (app_id, tag_id),
                FOREIGN KEY (app_id) REFERENCES games(app_id),
                FOREIGN KEY (tag_id) REFERENCES tags(id)
            )
        """)
        print("✓ Created game_tags table")

        connection.commit()
        print("✓ All tables created successfully")
class DatabaseOperations:
    def __init__(self, connection):
        self.connection = connection

    # CREATE Operations
    def insert_game(self, game_data: Dict[str, Any]) -> bool:
        """Insert a new game into the database"""
        try:
            with self.connection.cursor() as cursor:
                columns = ', '.join(game_data.keys())
                placeholders = ', '.join(['%s'] * len(game_data))
                query = f"INSERT INTO games ({columns}) VALUES ({placeholders})"
                cursor.execute(query, list(game_data.values()))
                self.connection.commit()
                return True
        except Exception as e:
            print(f"Error inserting game: {e}")
            return False

    def insert_developer(self, name: str) -> Optional[int]:
        """Insert a new developer and return their ID"""
        try:
            with self.connection.cursor() as cursor:
                cursor.execute(
                    "INSERT IGNORE INTO developers (name) VALUES (%s)",
                    (name,)
                )
                if cursor.rowcount > 0:
                    cursor.execute(
                        "SELECT id FROM developers WHERE name = %s",
                        (name,)
                    )
                    result = cursor.fetchone()
                    self.connection.commit()
                    return result['id'] if result else None
                return None
        except Exception as e:
            print(f"Error inserting developer: {e}")
            return None

    # READ Operations
    def get_game(self, app_id: int) -> Optional[Dict[str, Any]]:
        """Get a game by its app_id"""
        try:
            with self.connection.cursor() as cursor:
                cursor.execute("""
                    SELECT * FROM games WHERE app_id = %s
                """, (app_id,))
                return cursor.fetchone()
        except Exception as e:
            print(f"Error getting game: {e}")
            return None

    def search_games(self, filters: Dict[str, Any] = None, limit: int = 10) -> List[Dict[str, Any]]:
        """Search games with filters"""
        try:
            with self.connection.cursor() as cursor:
                query = "SELECT DISTINCT g.* FROM games g"
                conditions = []
                params = []

                if filters:
                    if 'name' in filters:
                        conditions.append("g.name LIKE %s")
                        params.append(f"%{filters['name']}%")
                    if 'min_price' in filters:
                        conditions.append("g.price >= %s")
                        params.append(filters['min_price'])
                    if 'max_price' in filters:
                        conditions.append("g.price <= %s")
                        params.append(filters['max_price'])

                if conditions:
                    query += " WHERE " + " AND ".join(conditions)

                query += " LIMIT %s"
                params.append(limit)

                cursor.execute(query, params)
                return cursor.fetchall()
        except Exception as e:
            print(f"Error searching games: {e}")
            return []

    # UPDATE Operations
    def update_game(self, app_id: int, update_data: Dict[str, Any]) -> bool:
        """Update a game's information"""
        try:
            with self.connection.cursor() as cursor:
                set_clause = ", ".join([f"{k} = %s" for k in update_data.keys()])
                query = f"UPDATE games SET {set_clause} WHERE app_id = %s"
                params = list(update_data.values()) + [app_id]
                cursor.execute(query, params)
                self.connection.commit()
                return cursor.rowcount > 0
        except Exception as e:
            print(f"Error updating game: {e}")
            return False

    # DELETE Operations
    def delete_game(self, app_id: int) -> bool:
        """Delete a game and its related records"""
        try:
            with self.connection.cursor() as cursor:
                # Delete related records first
                related_tables = [
                    'game_tags', 'game_genres', 'game_categories',
                    'game_publishers', 'game_developers', 'screenshots', 'movies'
                ]
                for table in related_tables:
                    cursor.execute(f"DELETE FROM {table} WHERE app_id = %s", (app_id,))

                # Delete the game
                cursor.execute("DELETE FROM games WHERE app_id = %s", (app_id,))
                self.connection.commit()
                return cursor.rowcount > 0
        except Exception as e:
            print(f"Error deleting game: {e}")
            return False

def test_crud_operations(connection):
    """Test CRUD operations"""
    print("\n4. Testing CRUD Operations...")
    db_ops = DatabaseOperations(connection)

    # Test CREATE
    print("\nTesting CREATE operations...")
    test_game = {
        'app_id': 999999,
        'name': 'Test Game',
        'release_date': '2024-01-01',
        'price': 29.99,
        'about_the_game': 'A test game for CRUD operations',
        'windows': 1,
        'mac': 0,
        'linux': 0
    }
    
    if db_ops.insert_game(test_game):
        print("✓ Successfully inserted test game")
    else:
        print("❌ Failed to insert test game")

    # Test READ
    print("\nTesting READ operations...")
    retrieved_game = db_ops.get_game(999999)
    if retrieved_game and retrieved_game['name'] == 'Test Game':
        print("✓ Successfully retrieved test game")
    else:
        print("❌ Failed to retrieve test game")

    # Test UPDATE
    print("\nTesting UPDATE operations...")
    update_data = {
        'price': 39.99,
        'about_the_game': 'Updated test game description'
    }
    if db_ops.update_game(999999, update_data):
        print("✓ Successfully updated test game")
    else:
        print("❌ Failed to update test game")

    # Test DELETE
    print("\nTesting DELETE operations...")
    if db_ops.delete_game(999999):
        print("✓ Successfully deleted test game")
    else:
        print("❌ Failed to delete test game")
        


def run_all_tests():
    """Run all database tests"""
    print("\n=== Starting Database Tests ===\n")
    
    # Test 1: Connection
    print("1. Testing Database Connection...")
    if not test_connection():
        print("❌ Connection test failed. Stopping further tests.")
        return
    print("✓ Connection test passed\n")
    
    # Create connection for remaining tests
    connection = pymysql.connect(**DB_CONFIG)
    
    try:
        # Test 2: Create Tables
        print("2. Creating Database Tables...")
        create_tables(connection)
        print()
        
        # Test 3: Verify Schema
        print("3. Verifying Database Schema...")
        table_info = get_table_info(connection)
        
        expected_tables = {
            'games', 'developers', 'publishers', 'categories', 'genres', 'tags',
            'screenshots', 'movies', 'game_developers', 'game_publishers',
            'game_categories', 'game_genres', 'game_tags'
        }
        
        actual_tables = set(table_info.keys())
        missing_tables = expected_tables - actual_tables
        
        if missing_tables:
            print(f"❌ Missing tables: {missing_tables}")
        else:
            print("✓ All expected tables present")
        
        print("\nTable Structure:")
        for table_name, columns in table_info.items():
            print(f"\n{table_name}:")
            for column in columns:
                print(f"  - {column['COLUMN_NAME']}: {column['COLUMN_TYPE']}")
                if column['COLUMN_KEY'] == 'PRI':
                    print("    (Primary Key)")
                elif column['COLUMN_KEY'] == 'MUL':
                    print("    (Foreign Key/Index)")

        # Test 4: CRUD Operations
        test_crud_operations(connection)
        
    except Exception as e:
        print(f"Error during tests: {e}")
    finally:
        connection.close()
        
    print("\n=== Database Tests Completed ===")

if __name__ == "__main__":
    run_all_tests()