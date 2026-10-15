import os
import shutil
import sqlite3
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent

# On Vercel Serverless, the project root is read-only; use /tmp for SQLite writes
if os.environ.get("VERCEL"):
    DB_PATH = Path("/tmp/fest.db")
else:
    DB_PATH = BASE_DIR / "fest.db"

def init_db():
    """
    Initializes the SQLite database tables if they do not exist.
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    cursor = conn.cursor()

    # Create events table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            event_date TEXT NOT NULL,
            event_time TEXT NOT NULL,
            venue TEXT NOT NULL,
            capacity INTEGER NOT NULL,
            fee INTEGER NOT NULL DEFAULT 0,
            icon TEXT
        );
    """)

    # Create registrations table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS registrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL REFERENCES events(id),
            student_name TEXT NOT NULL,
            roll_number TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT,
            registered_at TEXT NOT NULL,
            UNIQUE(event_id, email)
        );
    """)

    conn.commit()
    conn.close()

def get_db_connection() -> sqlite3.Connection:
    """
    Returns an open SQLite connection with Row factory enabled
    and foreign keys turned on. Automatically initializes DB on serverless runtimes.
    """
    if os.environ.get("VERCEL") and not DB_PATH.exists():
        bundled_db = BASE_DIR / "fest.db"
        if bundled_db.exists():
            try:
                shutil.copyfile(bundled_db, DB_PATH)
            except Exception as e:
                print(f"Could not copy bundled DB: {e}")
                init_db()
        else:
            init_db()

        # Seed data if empty
        try:
            from backend.seed_data import seed_events
            seed_events()
        except Exception as e:
            print(f"Auto-seed notice: {e}")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

if __name__ == "__main__":
    init_db()
    print(f"Database initialized at {DB_PATH}")
