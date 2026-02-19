import psycopg2
import os
from dotenv import load_dotenv
import sys

# Force unbuffered stdout
sys.stdout.reconfigure(line_buffering=True)

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"DEBUG: Attempting connection to: {DATABASE_URL}")

try:
    print("DEBUG: Calling psycopg2.connect()...")
    conn = psycopg2.connect(
        DATABASE_URL, 
        sslmode='require', 
        connect_timeout=10
    )
    print("✅ Successfully connected via psycopg2!")
    cur = conn.cursor()
    cur.execute("SELECT version();")
    print(f"DB Version: {cur.fetchone()[0]}")
    cur.close()
    conn.close()
except Exception as e:
    print(f"❌ Connection Failed: {e}")
