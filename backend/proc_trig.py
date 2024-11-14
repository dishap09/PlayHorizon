import pymysql
from typing import Optional, Dict, List, Any
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DatabaseConfig:
    """Database configuration class"""
    DEFAULT_CONFIG = {
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

class DatabaseManager:
    """Database connection and operation manager"""
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or DatabaseConfig.DEFAULT_CONFIG

    def get_connection(self) -> pymysql.Connection:
        """Create and return a database connection"""
        try:
            return pymysql.connect(**self.config)
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            raise

    def execute_sql(self, sql: str, params: tuple = None) -> bool:
        """Execute SQL statement with error handling"""
        connection = None
        try:
            connection = self.get_connection()
            with connection.cursor() as cursor:
                cursor.execute(sql, params)
                connection.commit()
            return True
        except Exception as e:
            logger.error(f"Error executing SQL: {e}")
            if connection:
                connection.rollback()
            return False
        finally:
            if connection:
                connection.close()

    def execute_many(self, statements: List[str]) -> bool:
        """Execute multiple SQL statements in sequence"""
        connection = None
        try:
            connection = self.get_connection()
            with connection.cursor() as cursor:
                for sql in statements:
                    if sql.strip():
                        cursor.execute(sql)
                connection.commit()
            return True
        except Exception as e:
            logger.error(f"Error executing multiple SQL statements: {e}")
            if connection:
                connection.rollback()
            return False
        finally:
            if connection:
                connection.close()

class PriceTracker:
    """Handle price tracking operations"""
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager

    def setup_database(self) -> bool:
        """Set up all necessary database objects"""
        try:
            # Drop existing objects
            self._drop_existing_objects()
            
            # Create new objects
            success = all([
                self._create_price_history_table(),
                self._create_genre_procedure(),
                self._create_get_genres_procedure(),
                self._create_price_trigger()
            ])
            
            if success:
                logger.info("Successfully set up price tracking system")
            return success
        except Exception as e:
            logger.error(f"Failed to set up price tracking system: {e}")
            return False

    def _drop_existing_objects(self) -> bool:
        """Drop existing database objects"""
        statements = [
            "DROP PROCEDURE IF EXISTS GetGamesByGenre",
            "DROP PROCEDURE IF EXISTS GetGenres",
            "DROP TRIGGER IF EXISTS game_price_change",
            "DROP TABLE IF EXISTS game_price_history"
        ]
        return self.db_manager.execute_many(statements)

    def _create_price_history_table(self) -> bool:
        """Create price history table"""
        sql = """
        CREATE TABLE IF NOT EXISTS game_price_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            app_id BIGINT,
            old_price DECIMAL(10,2),
            new_price DECIMAL(10,2),
            change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (app_id) REFERENCES games(app_id)
        )
        """
        return self.db_manager.execute_sql(sql)

    def _create_genre_procedure(self) -> bool:
        """Create GetGamesByGenre procedure with pagination"""
        sql = """
        CREATE PROCEDURE GetGamesByGenre(
            IN p_genre VARCHAR(255),
            IN p_min_price DECIMAL(10,2),
            IN p_max_price DECIMAL(10,2),
            IN p_page INT,
            IN p_page_size INT
        )
        BEGIN
            DECLARE offset_val INT;
            SET offset_val = (p_page - 1) * p_page_size;
            
            SELECT COUNT(DISTINCT g.app_id) INTO @total_count
            FROM games g
            LEFT JOIN game_genres gg ON g.app_id = gg.app_id
            LEFT JOIN genres gen ON gg.genre_id = gen.id
            WHERE (p_genre = '' OR gen.name = p_genre)
            AND (g.price >= p_min_price OR g.price IS NULL)
            AND (g.price <= p_max_price OR g.price IS NULL);
            
            SET @total_pages = CEIL(@total_count / p_page_size);
            
            SELECT 
                g.*,
                GROUP_CONCAT(DISTINCT gen.name) as genres
            FROM games g
            LEFT JOIN game_genres gg ON g.app_id = gg.app_id
            LEFT JOIN genres gen ON gg.genre_id = gen.id
            WHERE (p_genre = '' OR gen.name = p_genre)
            AND (g.price >= p_min_price OR g.price IS NULL)
            AND (g.price <= p_max_price OR g.price IS NULL)
            GROUP BY g.app_id
            ORDER BY g.name
            LIMIT p_page_size OFFSET offset_val;
            
            SELECT @total_count as totalCount, 
                   p_page as currentPage, 
                   @total_pages as totalPages, 
                   p_page_size as pageSize;
        END
        """
        return self.db_manager.execute_sql(sql)

    def _create_get_genres_procedure(self) -> bool:
        """Create GetGenres procedure"""
        sql = """
        CREATE PROCEDURE GetGenres()
        BEGIN
            SELECT DISTINCT 
                g.id,
                g.name
            FROM genres g
            INNER JOIN game_genres gg ON g.id = gg.genre_id
            ORDER BY g.name ASC;
        END
        """
        return self.db_manager.execute_sql(sql)

    def _create_price_trigger(self) -> bool:
        """Create price change trigger"""
        sql = """
        CREATE TRIGGER game_price_change
        BEFORE UPDATE ON games
        FOR EACH ROW
        BEGIN
            IF NEW.price != OLD.price THEN
                INSERT INTO game_price_history (app_id, old_price, new_price)
                VALUES (OLD.app_id, OLD.price, NEW.price);
            END IF;
        END
        """
        return self.db_manager.execute_sql(sql)

    def get_games_by_genre(self, genre: str, min_price: float, max_price: float, page: int, page_size: int) -> Dict[str, Any]:
        """Get games by genre with pagination"""
        connection = None
        try:
            connection = self.db_manager.get_connection()
            with connection.cursor() as cursor:
                cursor.execute(
                    "CALL GetGamesByGenre(%s, %s, %s, %s, %s)",
                    (genre, min_price, max_price, page, page_size)
                )
                games = cursor.fetchall()
                cursor.nextset()  # Move to the next result set
                pagination = cursor.fetchone()
                
                return {
                    'games': games,
                    'pagination': pagination
                }
        except Exception as e:
            logger.error(f"Error getting games by genre: {e}")
            return {'games': [], 'pagination': None}
        finally:
            if connection:
                connection.close()

    def test_price_tracking(self) -> Dict[str, Any]:
        """Test the price tracking functionality and return results"""
        connection = None
        try:
            connection = self.db_manager.get_connection()
            results = {}
            
            # Test GetGamesByGenre
            results.update(self.get_games_by_genre('Action', 0, 50, 1, 10))
            
            # Test GetGenres
            with connection.cursor() as cursor:
                cursor.execute("CALL GetGenres()")
                results['genres'] = cursor.fetchall()
                
                # Test price change tracking
                cursor.execute("""
                    UPDATE games 
                    SET price = price + 5 
                    WHERE app_id = 570 
                    LIMIT 1
                """)
                
                cursor.execute("""
                    SELECT * FROM game_price_history 
                    WHERE app_id = 570 
                    ORDER BY change_date DESC 
                    LIMIT 1
                """)
                results['price_change'] = cursor.fetchone()
            
            connection.commit()
            logger.info("Successfully tested price tracking functionality")
            return results
            
        except Exception as e:
            logger.error(f"Error testing price tracking: {e}")
            if connection:
                connection.rollback()
            return {}
        finally:
            if connection:
                connection.close()

def main():
    """Main function to set up and test the price tracking system"""
    db_manager = DatabaseManager()
    price_tracker = PriceTracker(db_manager)
    
    if price_tracker.setup_database():
        results = price_tracker.test_price_tracking()
        logger.info(f"Test results: {results}")
    else:
        logger.error("Failed to set up price tracking")

if __name__ == "__main__":
    main()