
import pymysql

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

# Connect to the database
try:
    connection = pymysql.connect(**DB_CONFIG)
    with connection.cursor() as cursor:
        # Execute ALTER TABLE to add the role column with a default value and constraint
        alter_table_sql = """
        ALTER TABLE users
        ADD COLUMN role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin'));
        """
        cursor.execute(alter_table_sql)
        print("Column 'role' added to 'users' table successfully.")

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

