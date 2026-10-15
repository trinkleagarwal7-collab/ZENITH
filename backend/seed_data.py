import os
import openpyxl
from pathlib import Path
from backend.database import get_db_connection, init_db

DATA_FILE_PATH = Path(__file__).resolve().parent.parent / "data" / "events_seed.xlsx"

def seed_events():
    """
    Seeds the events table from data/events_seed.xlsx if the table is empty.
    Raises FileNotFoundError if data/events_seed.xlsx does not exist.
    """
    # Ensure database tables exist
    init_db()

    # Verify seed file exists
    if not DATA_FILE_PATH.exists():
        raise FileNotFoundError(
            f"The seed data file at '{DATA_FILE_PATH}' was not found. "
            "Please copy the provided events_seed.xlsx file into the data/ folder "
            "before running this script."
        )

    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if events table already contains data
    cursor.execute("SELECT COUNT(*) AS cnt FROM events;")
    count = cursor.fetchone()["cnt"]
    if count > 0:
        print(f"Events table already has {count} rows. Skipping seeding.")
        conn.close()
        return

    # Load workbook and read Events sheet
    workbook = openpyxl.load_workbook(DATA_FILE_PATH)
    if "Events" not in workbook.sheetnames:
        raise ValueError("The Excel file does not contain a sheet named 'Events'.")

    sheet = workbook["Events"]

    # Verify header
    header = [cell for cell in next(sheet.iter_rows(min_row=1, max_row=1, values_only=True))]
    expected_header = ['id', 'title', 'category', 'description', 'event_date', 'event_time', 'venue', 'capacity', 'fee', 'icon']
    
    # Insert each subsequent row
    rows_inserted = 0
    for row in sheet.iter_rows(min_row=2, values_only=True):
        if not any(row):  # Skip completely empty rows
            continue
        
        event_id, title, category, description, event_date, event_time, venue, capacity, fee, icon = row[:10]
        
        # Ensure event_date is a string formatted as YYYY-MM-DD
        if hasattr(event_date, "strftime"):
            event_date = event_date.strftime("%Y-%m-%d")
        elif event_date is not None:
            event_date = str(event_date).strip()

        cursor.execute("""
            INSERT INTO events (id, title, category, description, event_date, event_time, venue, capacity, fee, icon)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            int(event_id) if event_id is not None else None,
            str(title).strip() if title is not None else "",
            str(category).strip() if category is not None else "",
            str(description).strip() if description is not None else "",
            event_date,
            str(event_time).strip() if event_time is not None else "",
            str(venue).strip() if venue is not None else "",
            int(capacity) if capacity is not None else 0,
            int(fee) if fee is not None else 0,
            str(icon).strip() if icon is not None else ""
        ))
        rows_inserted += 1

    conn.commit()
    conn.close()
    print(f"Successfully seeded {rows_inserted} events into the database from {DATA_FILE_PATH}.")

import sys
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def show_events():
    """
    Prints all rows in the events table to confirm seeding.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM events ORDER BY id ASC;")
    rows = cursor.fetchall()
    print(f"\n--- Total Events in DB: {len(rows)} ---")
    for row in rows:
        print(f"[{row['id']:2d}] {row['icon']} {row['title']} | {row['category']} | {row['event_date']} {row['event_time']} | Venue: {row['venue']} | Cap: {row['capacity']} | Fee: ₹{row['fee']}")
    conn.close()

if __name__ == "__main__":
    seed_events()
    show_events()
