import pymysql
from typing import Optional, Dict, Any

# Database configuration
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

class DatabaseOperations:
    def __init__(self, connection):
        self.connection = connection

    def get_game(self, app_id: int) -> Optional[Dict[str, Any]]:
        """Retrieve a game by its app_id."""
        try:
            with self.connection.cursor() as cursor:
                cursor.execute("SELECT * FROM games WHERE app_id = %s", (app_id,))
                return cursor.fetchone()
        except Exception as e:
            print(f"Error getting game: {e}")
            return None

def get_game_info_by_app_id(app_id: int):
    """Fetch game information based on app_id and print it."""
    # Establish database connection
    connection = pymysql.connect(**DB_CONFIG)
    
    try:
        db_ops = DatabaseOperations(connection)
        game_info = db_ops.get_game(app_id)
        
        if game_info:
            print("Game Information:")
            for key, value in game_info.items():
                print(f"{key}: {value}")
        else:
            print("Game not found.")
    except Exception as e:
        print(f"Error fetching game info: {e}")
    finally:
        connection.close()

if __name__ == "__main__":
    app_id = 730  # Replace with the app_id you want to fetch
    get_game_info_by_app_id(app_id)
