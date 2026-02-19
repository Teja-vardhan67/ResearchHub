import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("❌ DATABASE_URL not found in .env")
    exit(1)

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as connection:
        print("🔌 Connecting to database...")
        connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        connection.commit()
        print("✅ 'vector' extension enabled successfully!")
except Exception as e:
    print(f"❌ Error enabling vector extension: {e}")
