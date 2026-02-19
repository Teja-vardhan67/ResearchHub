import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
# Add sslmode explicitly just in case, though it's in the URL
if 'sslmode' not in DATABASE_URL:
    DATABASE_URL += '?sslmode=require'

print(f"Testing connection to: {DATABASE_URL}")

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1;"))
        print(f"✅ Connection Successful! Result: {result.scalar()}")
except Exception as e:
    print(f"❌ Connection Failed: {e}")
