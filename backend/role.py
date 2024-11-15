
import pymysql
from dotenv import load_dotenv
import os

load_dotenv()

# Database configuration
load_dotenv()  # Load variables from .env

DB_CONFIG = {
    "charset": os.getenv("DB_CHARSET", "utf8mb4"),
    "connect_timeout": int(os.getenv("DB_CONNECT_TIMEOUT", 10)),
    "cursorclass": eval(os.getenv("DB_CURSOR_CLASS", "pymysql.cursors.DictCursor")),
    "db": os.getenv("DB_NAME", "defaultdb"),
    "host": os.getenv("DB_HOST", "localhost"),
    "password": os.getenv("DB_PASSWORD"),
    "read_timeout": int(os.getenv("DB_READ_TIMEOUT", 10)),
    "port": int(os.getenv("DB_PORT", 3306)),
    "user": os.getenv("DB_USER"),
    "write_timeout": int(os.getenv("DB_WRITE_TIMEOUT", 10)),
}

# Connect to the database
try:
    connection = pymysql.connect(**DB_CONFIG)
    with connection.cursor() as cursor:
        # Execute ALTER TABLE to add the role column with a default value and constraint

        # Update specific user's role to 'admin'
        update_user_sql = """
        UPDATE users 
        SET role = 'admin' 
        WHERE email = 'dishanth@mail.com';
        """
        cursor.execute(update_user_sql)
        print("User role updated to 'admin' for dishanth@mail.com.")

    # Commit the changes
    connection.commit()

except pymysql.MySQLError as e:
    print(f"Error: {e}")

finally:
    connection.close()

