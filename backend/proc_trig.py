import pymysql
from typing import Optional

# Database configuration
DB_CONFIG = {
    "charset": "utf8mb4",
    "connect_timeout": 10,
    "cursorclass": pymysql.cursors.DictCursor,
    "db": "defaultdb",
    "host": "mysql-404e161-playhorizon.j.aivencloud.com",
    "password": "AVNS_yzYNBDWOUm1nQnP2xwP",
    "port": 16511,
    "user": "avnadmin",
    "write_timeout": 10,
}

def execute_sql(sql: str, connection: Optional[pymysql.Connection] = None, delimiter: str = ";") -> bool:
    """Execute SQL statement with error handling and custom delimiter support"""
    close_connection = False
    try:
        if connection is None:
            connection = pymysql.connect(**DB_CONFIG)
            close_connection = True
            
        with connection.cursor() as cursor:
            statements = sql.split(delimiter)
            for statement in statements:
                if statement.strip():
                    cursor.execute(statement)
            connection.commit()
        return True
    except Exception as e:
        print(f"Error executing SQL: {e}")
        return False
    finally:
        if close_connection and connection:
            connection.close()

def setup_procedures_and_triggers():
    """Set up stored procedures and triggers for game-related operations"""
    # Drop existing procedures and triggers
    drop_statements = """
    DROP PROCEDURE IF EXISTS CalculateGameMetrics;
    DROP PROCEDURE IF EXISTS UpdateGameCategories;
    DROP TRIGGER IF EXISTS ValidateGameMetacriticScore;
    DROP TRIGGER IF EXISTS UpdateGameTimestamp;
    """

    # Create CalculateGameMetrics procedure
    calculate_game_metrics = """
    DELIMITER //
    CREATE PROCEDURE CalculateGameMetrics(IN game_app_id BIGINT)
    BEGIN
        DECLARE avg_metacritic DECIMAL(5,2);
        DECLARE total_achievements INT;
        DECLARE genre_count INT;
        
        -- Calculate average metacritic score for similar games in same genres
        SELECT AVG(g.metacritic_score) INTO avg_metacritic
        FROM games g
        JOIN game_genres gg1 ON g.app_id = gg1.app_id
        WHERE gg1.genre_id IN (
            SELECT genre_id 
            FROM game_genres 
            WHERE app_id = game_app_id
        )
        AND g.app_id != game_app_id
        AND g.metacritic_score IS NOT NULL;
        
        -- Count total achievements and genres
        SELECT achievements INTO total_achievements
        FROM games WHERE app_id = game_app_id;
        
        SELECT COUNT(*) INTO genre_count
        FROM game_genres
        WHERE app_id = game_app_id;
        
        -- Return the metrics
        SELECT 
            game_app_id AS app_id,
            avg_metacritic AS average_genre_metacritic,
            total_achievements AS achievement_count,
            genre_count AS number_of_genres;
    END //
    DELIMITER ;
    """

    # Create UpdateGameCategories procedure
    update_game_categories = """
    DELIMITER //
    CREATE PROCEDURE UpdateGameCategories(
        IN game_app_id BIGINT,
        IN category_names VARCHAR(1000)
    )
    BEGIN
        -- First, remove existing categories for the game
        DELETE FROM game_categories 
        WHERE app_id = game_app_id;
        
        -- Insert new categories
        INSERT INTO game_categories (app_id, category_id)
        SELECT 
            game_app_id,
            c.id
        FROM categories c
        WHERE FIND_IN_SET(c.name, category_names) > 0;
        
        -- Return updated categories for the game
        SELECT c.name
        FROM categories c
        JOIN game_categories gc ON c.id = gc.category_id
        WHERE gc.app_id = game_app_id;
    END //
    DELIMITER ;
    """

    # Create ValidateGameMetacriticScore trigger
    validate_metacritic_trigger = """
    DELIMITER //
    CREATE TRIGGER ValidateGameMetacriticScore
    BEFORE INSERT ON games
    FOR EACH ROW
    BEGIN
        IF NEW.metacritic_score IS NOT NULL AND (NEW.metacritic_score < 0 OR NEW.metacritic_score > 100) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Metacritic score must be between 0 and 100';
        END IF;
    END //
    DELIMITER ;
    """

    # Create UpdateGameTimestamp trigger
    update_timestamp_trigger = """
    DELIMITER //
    CREATE TRIGGER UpdateGameTimestamp
    BEFORE UPDATE ON games
    FOR EACH ROW
    BEGIN
        -- Add an audit trail for price changes
        IF NEW.price != OLD.price THEN
            SET NEW.notes = CONCAT(
                COALESCE(OLD.notes, ''),
                '\nPrice changed from ',
                COALESCE(OLD.price, 'NULL'),
                ' to ',
                COALESCE(NEW.price, 'NULL'),
                ' on ',
                NOW()
            );
        END IF;
    END //
    DELIMITER ;
    """

    # Execute all statements
    connection = pymysql.connect(**DB_CONFIG)
    try:
        # Drop existing objects
        execute_sql(drop_statements, connection)
        
        # Create new procedures and triggers
        procedures_and_triggers = [
            calculate_game_metrics,
            update_game_categories,
            validate_metacritic_trigger,
            update_timestamp_trigger
        ]
        
        for sql in procedures_and_triggers:
            parts = sql.split('DELIMITER //')
            if len(parts) > 1:
                main_sql = parts[1].split('DELIMITER ;')[0]
                execute_sql(main_sql, connection, delimiter="//")
            
        print("Successfully created all procedures and triggers")
        return True
    except Exception as e:
        print(f"Error setting up procedures and triggers: {e}")
        return False
    finally:
        connection.close()

def test_procedures():
    """Test the created procedures"""
    try:
        connection = pymysql.connect(**DB_CONFIG)
        with connection.cursor() as cursor:
            # Test CalculateGameMetrics
            print("Testing CalculateGameMetrics...")
            cursor.execute("CALL CalculateGameMetrics(570)")  # Example game_app_id
            result = cursor.fetchone()
            print("Game metrics:", result)
            
            # Test UpdateGameCategories
            print("\nTesting UpdateGameCategories...")
            cursor.execute("CALL UpdateGameCategories(570, 'Multi-player,Single-player')")
            result = cursor.fetchall()
            print("Updated categories:", result)
            
        print("\nSuccessfully tested procedures")
        return True
    except Exception as e:
        print(f"Error testing procedures: {e}")
        return False
    finally:
        connection.close()

if __name__ == "__main__":
    if setup_procedures_and_triggers():
        test_procedures()
    else:
        print("Failed to set up procedures and triggers")