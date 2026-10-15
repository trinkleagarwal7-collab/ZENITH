import os
from datetime import datetime, date
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.database import get_db_connection, init_db
from backend.seed_data import seed_events
from backend.models import (
    EventOut,
    EventDetail,
    RegistrationIn,
    RegistrationOut,
    RegistrationListItem,
    StatsOut,
    EventCreate,
)

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(
    title="Zenith '26 Fest Management System API",
    description="API for College Fest Management System (Events, Registrations, and Admin Analytics)",
    version="1.0.0",
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    """Ensure database schema is created and seeded with 14 events on startup."""
    init_db()
    try:
        seed_events()
    except Exception as e:
        print(f"Startup seed notice: {e}")

# ==========================================
# API Endpoints
# ==========================================

@app.get(
    "/api/events",
    response_model=List[EventOut],
    summary="List all events with available seats",
    tags=["Events"],
)
def get_events(
    category: Optional[str] = Query(None, description="Filter by category (Technical, Cultural, Sports, Gaming, Workshop)"),
    search: Optional[str] = Query(None, description="Search query matching title (case-insensitive)"),
):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT 
            e.id, e.title, e.category, e.description, e.event_date, e.event_time, 
            e.venue, e.capacity, e.fee, e.icon,
            (e.capacity - COALESCE(reg_counts.registered_count, 0)) AS available_seats
        FROM events e
        LEFT JOIN (
            SELECT event_id, COUNT(*) AS registered_count
            FROM registrations
            GROUP BY event_id
        ) reg_counts ON e.id = reg_counts.event_id
        WHERE 1=1
    """
    params = []

    if category and category.strip().lower() != "all":
        query += " AND LOWER(e.category) = LOWER(?)"
        params.append(category.strip())

    if search and search.strip():
        query += " AND LOWER(e.title) LIKE LOWER(?)"
        params.append(f"%{search.strip()}%")

    query += " ORDER BY e.event_date ASC, e.event_time ASC, e.id ASC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    events = [EventOut(**dict(row)) for row in rows]
    conn.close()
    return events


@app.get(
    "/api/events/{event_id}",
    response_model=EventDetail,
    summary="Get details of a single event",
    tags=["Events"],
)
def get_event_detail(event_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            e.id, e.title, e.category, e.description, e.event_date, e.event_time, 
            e.venue, e.capacity, e.fee, e.icon,
            (e.capacity - COALESCE(reg_counts.registered_count, 0)) AS available_seats
        FROM events e
        LEFT JOIN (
            SELECT event_id, COUNT(*) AS registered_count
            FROM registrations
            WHERE event_id = ?
        ) reg_counts ON e.id = reg_counts.event_id
        WHERE e.id = ?
    """, (event_id, event_id))

    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found."
        )

    return EventDetail(**dict(row))


@app.post(
    "/api/events/{event_id}/register",
    response_model=RegistrationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a student for an event",
    tags=["Registrations"],
)
def register_student(event_id: int, payload: RegistrationIn):
    # Server-side validation
    student_name = payload.student_name.strip() if payload.student_name else ""
    roll_number = payload.roll_number.strip() if payload.roll_number else ""
    email = payload.email.strip().lower() if payload.email else ""
    phone = payload.phone.strip() if payload.phone else None

    if not student_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Student name is required.")
    if not roll_number:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Roll number is required.")
    if not email or "@" not in email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A valid email address containing '@' is required.")

    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Verify event exists
    cursor.execute("SELECT id, capacity FROM events WHERE id = ?;", (event_id,))
    event = cursor.fetchone()
    if not event:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} not found."
        )

    capacity = event["capacity"]

    # 2. Check duplicate registration
    cursor.execute("""
        SELECT id FROM registrations 
        WHERE event_id = ? AND LOWER(email) = ?;
    """, (event_id, email))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already registered"
        )

    # 3. Check capacity
    cursor.execute("SELECT COUNT(*) AS cnt FROM registrations WHERE event_id = ?;", (event_id,))
    registered_count = cursor.fetchone()["cnt"]
    if registered_count >= capacity:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Event is full"
        )

    # 4. Insert registration
    registered_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        INSERT INTO registrations (event_id, student_name, roll_number, email, phone, registered_at)
        VALUES (?, ?, ?, ?, ?, ?);
    """, (event_id, student_name, roll_number, email, phone, registered_at))

    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return RegistrationOut(
        id=new_id,
        event_id=event_id,
        student_name=student_name,
        registered_at=registered_at,
    )


@app.get(
    "/api/registrations",
    response_model=List[RegistrationListItem],
    summary="List all registrations",
    tags=["Registrations"],
)
def get_registrations(event_id: Optional[int] = Query(None, description="Filter registrations by event_id")):
    conn = get_db_connection()
    cursor = conn.cursor()

    query = """
        SELECT 
            r.id, r.event_id, e.title AS event_title, 
            r.student_name, r.roll_number, r.email, r.phone, r.registered_at
        FROM registrations r
        JOIN events e ON r.event_id = e.id
    """
    params = []

    if event_id is not None:
        query += " WHERE r.event_id = ?"
        params.append(event_id)

    query += " ORDER BY r.registered_at DESC, r.id DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    registrations = [RegistrationListItem(**dict(row)) for row in rows]
    conn.close()
    return registrations


@app.get(
    "/api/stats",
    response_model=StatsOut,
    summary="Live statistics for Admin Dashboard",
    tags=["Admin"],
)
def get_stats():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Total events
    cursor.execute("SELECT COUNT(*) AS total FROM events;")
    total_events = cursor.fetchone()["total"]

    # Total registrations
    cursor.execute("SELECT COUNT(*) AS total FROM registrations;")
    total_registrations = cursor.fetchone()["total"]

    # Total capacity
    cursor.execute("SELECT COALESCE(SUM(capacity), 0) AS total_cap FROM events;")
    total_capacity = cursor.fetchone()["total_cap"]

    # Overall utilization percentage
    overall_utilization_pct = 0.0
    if total_capacity > 0:
        overall_utilization_pct = round((total_registrations / total_capacity) * 100.0, 1)

    # Upcoming events count (event_date today or later)
    today_str = date.today().isoformat()
    cursor.execute("SELECT COUNT(*) AS upcoming FROM events WHERE event_date >= ?;", (today_str,))
    upcoming_events_count = cursor.fetchone()["upcoming"]

    # Events by category
    cursor.execute("""
        SELECT category, COUNT(*) AS cnt 
        FROM events 
        GROUP BY category 
        ORDER BY cnt DESC;
    """)
    cat_rows = cursor.fetchall()
    events_by_category = {row["category"]: row["cnt"] for row in cat_rows}

    conn.close()

    return StatsOut(
        total_events=total_events,
        total_registrations=total_registrations,
        total_capacity=total_capacity,
        overall_utilization_pct=overall_utilization_pct,
        upcoming_events_count=upcoming_events_count,
        events_by_category=events_by_category,
    )


# ==========================================
# Stretch Goal Endpoints
# ==========================================

@app.post(
    "/api/events",
    response_model=EventOut,
    status_code=status.HTTP_201_CREATED,
    summary="Admin: Add a new event",
    tags=["Admin - Stretch"],
)
def create_event(payload: EventCreate):
    title = payload.title.strip() if payload.title else ""
    category = payload.category.strip() if payload.category else ""
    venue = payload.venue.strip() if payload.venue else ""
    event_date = payload.event_date.strip() if payload.event_date else ""
    event_time = payload.event_time.strip() if payload.event_time else ""

    if not title:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event title is required.")
    if not category:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event category is required.")
    if payload.capacity <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event capacity must be greater than 0.")
    if payload.fee < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Event fee cannot be negative.")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO events (title, category, description, event_date, event_time, venue, capacity, fee, icon)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        title,
        category,
        payload.description.strip() if payload.description else "",
        event_date,
        event_time,
        venue,
        payload.capacity,
        payload.fee,
        payload.icon.strip() if payload.icon else "🎉",
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return EventOut(
        id=new_id,
        title=title,
        category=category,
        description=payload.description,
        event_date=event_date,
        event_time=event_time,
        venue=venue,
        capacity=payload.capacity,
        fee=payload.fee,
        icon=payload.icon or "🎉",
        available_seats=payload.capacity,
    )


@app.delete(
    "/api/registrations/{registration_id}",
    summary="Admin: Cancel a registration",
    tags=["Admin - Stretch"],
)
def delete_registration(registration_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, event_id, student_name FROM registrations WHERE id = ?;", (registration_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registration not found.")

    cursor.execute("DELETE FROM registrations WHERE id = ?;", (registration_id,))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"Registration #{registration_id} for {row['student_name']} cancelled successfully.",
        "event_id": row["event_id"],
    }


# ==========================================
# Static Frontend Files Mount
# ==========================================

@app.get("/", response_class=FileResponse, include_in_schema=False)
def serve_home():
    return FileResponse(FRONTEND_DIR / "index.html")

@app.get("/admin.html", response_class=FileResponse, include_in_schema=False)
def serve_admin():
    return FileResponse(FRONTEND_DIR / "admin.html")

# Mount /js directory for client-side scripts
if (FRONTEND_DIR / "js").exists():
    app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")
