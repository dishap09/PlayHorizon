import pymysql
import polars as pl
from typing import List, Dict, Any
from datetime import datetime
import ast
from tqdm import tqdm
import pandas as pd
import json

# Database connection configuration
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

def create_database_schema(connection):
    """Create all necessary tables in the database"""
    # Split the CREATE_TABLES_SQL into individual statements
    statements = [
        """
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
        """,
        """
        CREATE TABLE IF NOT EXISTS developers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            UNIQUE INDEX idx_dev_name (name)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS publishers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            UNIQUE INDEX idx_pub_name (name)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS categories (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            UNIQUE INDEX idx_cat_name (name)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS genres (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            UNIQUE INDEX idx_genre_name (name)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS tags (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            UNIQUE INDEX idx_tag_name (name)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS screenshots (
            id INT AUTO_INCREMENT PRIMARY KEY,
            app_id BIGINT,
            url VARCHAR(255) NOT NULL,
            FOREIGN KEY fk_screenshots_game (app_id) REFERENCES games(app_id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS movies (
            id INT AUTO_INCREMENT PRIMARY KEY,
            app_id BIGINT,
            url VARCHAR(255) NOT NULL,
            FOREIGN KEY fk_movies_game (app_id) REFERENCES games(app_id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS game_developers (
            app_id BIGINT,
            developer_id INT,
            PRIMARY KEY (app_id, developer_id),
            FOREIGN KEY fk_gd_game (app_id) REFERENCES games(app_id),
            FOREIGN KEY fk_gd_developer (developer_id) REFERENCES developers(id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS game_publishers (
            app_id BIGINT,
            publisher_id INT,
            PRIMARY KEY (app_id, publisher_id),
            FOREIGN KEY fk_gp_game (app_id) REFERENCES games(app_id),
            FOREIGN KEY fk_gp_publisher (publisher_id) REFERENCES publishers(id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS game_categories (
            app_id BIGINT,
            category_id INT,
            PRIMARY KEY (app_id, category_id),
            FOREIGN KEY fk_gc_game (app_id) REFERENCES games(app_id),
            FOREIGN KEY fk_gc_category (category_id) REFERENCES categories(id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS game_genres (
            app_id BIGINT,
            genre_id INT,
            PRIMARY KEY (app_id, genre_id),
            FOREIGN KEY fk_gg_game (app_id) REFERENCES games(app_id),
            FOREIGN KEY fk_gg_genre (genre_id) REFERENCES genres(id)
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS game_tags (
            app_id BIGINT,
            tag_id INT,
            PRIMARY KEY (app_id, tag_id),
            FOREIGN KEY fk_gt_game (app_id) REFERENCES games(app_id),
            FOREIGN KEY fk_gt_tag (tag_id) REFERENCES tags(id)
        )
        """
    ]
    
    try:
        with connection.cursor() as cursor:
            # Execute each CREATE TABLE statement separately
            for statement in statements:
                try:
                    cursor.execute(statement)
                    print(f"Successfully executed: {statement[:60]}...")
                except Exception as e:
                    print(f"Error executing statement: {e}")
                    raise
            
            connection.commit()
            print("All tables created successfully!")
            
    except Exception as e:
        print(f"Error creating database schema: {e}")
        connection.rollback()
        raise




def safe_literal_eval(s):
    """Safely evaluate string representations of lists"""
    if isinstance(s, str):
        try:
            if s.startswith("['") and s.endswith("']"):
                items = [item.strip().strip("'") for item in s[2:-2].split(",")]
                return items
            return ast.literal_eval(s)
        except:
            if ',' in s:
                return [item.strip() for item in s.split(',')]
            return []
    return []

def get_or_create_reference(cursor, table_name: str, name: str) -> int:
    """Get ID for reference data or create if it doesn't exist"""
    cursor.execute(f"SELECT id FROM {table_name} WHERE name = %s", (name,))
    result = cursor.fetchone()
    
    if result:
        return result['id']
    
    cursor.execute(f"INSERT INTO {table_name} (name) VALUES (%s)", (name,))
    return cursor.lastrowid

# Update the process_game_row function to handle boolean values correctly
def process_game_row(cursor, row: Dict[str, Any]) -> bool:
    """Process a single game row with all its relationships"""
    try:
        app_id = row['AppID']
        
        # Prepare main game data
        game_data = {
            'app_id': app_id,
            'name': row['Name'],
            'release_date': pl.from_pandas(pd.to_datetime([row['Release date']])).dt.date()[0] if row['Release date'] else None,
            'estimated_owners': row['Estimated owners'],
            'peak_ccu': row['Peak CCU'],
            'required_age': row['Required age'],
            'price': float(row['Price']) if row['Price'] else 0.0,
            'dlc_count': row['DLC count'],
            'about_the_game': row['About the game'],
            'supported_languages': json.dumps(safe_literal_eval(row['Supported languages'])),
            'full_audio_languages': json.dumps(safe_literal_eval(row['Full audio languages'])),
            'reviews': row['Reviews'],
            'header_image': row['Header image'],
            'website': row['Website'],
            'support_url': row['Support url'],
            'support_email': row['Support email'],
            # Convert boolean values to integers for MySQL
            'windows': 1 if row['Windows'] else 0,
            'mac': 1 if row['Mac'] else 0,
            'linux': 1 if row['Linux'] else 0,
            'metacritic_score': row['Metacritic score'],
            'metacritic_url': row['Metacritic url'],
            'user_score': row['User score'],
            'positive_reviews': row['Positive'],
            'negative_reviews': row['Negative'],
            'score_rank': row['Score rank'],
            'achievements': row['Achievements'],
            'recommendations': row['Recommendations'],
            'notes': row['Notes'],
            'average_playtime_forever': row['Average playtime forever'],
            'average_playtime_two_weeks': row['Average playtime two weeks'],
            'median_playtime_forever': row['Median playtime forever'],
            'median_playtime_two_weeks': row['Median playtime two weeks']
        }
        
        # Insert or update game
        placeholders = ', '.join(['%s'] * len(game_data))
        columns = ', '.join(game_data.keys())
        values = tuple(game_data.values())
        update_stmt = ', '.join(f"{k}=VALUES({k})" for k in game_data.keys())
        
        sql = f"""INSERT INTO games ({columns}) 
                 VALUES ({placeholders})
                 ON DUPLICATE KEY UPDATE {update_stmt}"""
        cursor.execute(sql, values)
        
        # Process developers
        developers = safe_literal_eval(row['Developers'])
        if isinstance(developers, str):
            developers = [developers]
        for dev in developers:
            if dev and dev.strip():
                dev_id = get_or_create_reference(cursor, 'developers', dev.strip())
                cursor.execute("""INSERT IGNORE INTO game_developers (app_id, developer_id) 
                                VALUES (%s, %s)""", (app_id, dev_id))
        
        # Process publishers
        publishers = safe_literal_eval(row['Publishers'])
        if isinstance(publishers, str):
            publishers = [publishers]
        for pub in publishers:
            if pub and pub.strip():
                pub_id = get_or_create_reference(cursor, 'publishers', pub.strip())
                cursor.execute("""INSERT IGNORE INTO game_publishers (app_id, publisher_id) 
                                VALUES (%s, %s)""", (app_id, pub_id))
        
        # Process categories
        if row['Categories']:
            for cat in row['Categories'].split(','):
                cat = cat.strip()
                if cat:
                    cat_id = get_or_create_reference(cursor, 'categories', cat)
                    cursor.execute("""INSERT IGNORE INTO game_categories (app_id, category_id) 
                                    VALUES (%s, %s)""", (app_id, cat_id))
        
        # Process genres
        if row['Genres']:
            for genre in row['Genres'].split(','):
                genre = genre.strip()
                if genre:
                    genre_id = get_or_create_reference(cursor, 'genres', genre)
                    cursor.execute("""INSERT IGNORE INTO game_genres (app_id, genre_id) 
                                    VALUES (%s, %s)""", (app_id, genre_id))
        
        # Process tags
        if row['Tags']:
            for tag in row['Tags'].split(','):
                tag = tag.strip()
                if tag:
                    tag_id = get_or_create_reference(cursor, 'tags', tag)
                    cursor.execute("""INSERT IGNORE INTO game_tags (app_id, tag_id) 
                                    VALUES (%s, %s)""", (app_id, tag_id))
        
        # Process screenshots
        cursor.execute("DELETE FROM screenshots WHERE app_id = %s", (app_id,))
        screenshots = safe_literal_eval(row['Screenshots'])
        if screenshots:
            for url in screenshots:
                if url.strip():
                    cursor.execute("""INSERT INTO screenshots (app_id, url) 
                                    VALUES (%s, %s)""", (app_id, url.strip()))
        
        # Process movies
        cursor.execute("DELETE FROM movies WHERE app_id = %s", (app_id,))
        movies = safe_literal_eval(row['Movies'])
        if isinstance(movies, str):
            movies = [movies]
        if movies:
            for url in movies:
                if url and url.strip():
                    cursor.execute("""INSERT INTO movies (app_id, url) 
                                    VALUES (%s, %s)""", (app_id, url.strip()))
        
        return True
        
    except Exception as e:
        print(f"Error processing app_id {app_id}: {e}")
        return False

def process_games_csv(file_path: str):
    """Main function to process the games CSV file"""
    # Read CSV file using Polars
    df = pl.scan_csv(file_path).collect()
    
    # Initialize counters
    processed_count = 0
    error_count = 0
    
    # Create database connection
    connection = pymysql.connect(**DB_CONFIG)
    
    try:
        # Create schema
        print("Creating database schema...")
        create_database_schema(connection)
        
        # Process games
        print("Processing games...")
        with connection.cursor() as cursor:
            # Create progress bar
            pbar = tqdm(total=len(df), desc="Processing games")
            
            for row in df.iter_rows(named=True):
                try:
                    success = process_game_row(cursor, row)
                    if success:
                        processed_count += 1
                    else:
                        error_count += 1
                    connection.commit()
                except Exception as e:
                    print(f"Error processing row: {e}")
                    error_count += 1
                    connection.rollback()
                finally:
                    pbar.update(1)
                    pbar.set_postfix({
                        'Processed': processed_count,
                        'Errors': error_count
                    })
            
            pbar.close()
            
    except Exception as e:
        print(f"Error during processing: {e}")
    finally:
        connection.close()
    
    print("\nProcessing completed!")
    print(f"Total games processed: {processed_count}")
    print(f"Errors encountered: {error_count}")

if __name__ == "__main__":
    process_games_csv('top_250_by_Positive.csv')  # Replace with your CSV file path