# Zenith '26 College Fest Management System ⚡

A high-performance, full-stack event registration and analytics portal for the annual college fest **Zenith '26** (Nov 14–15, 2026).

Built as a hands-on capstone demonstrating the **Three-Layer Architecture** (Client Layer, Server Layer, Data Layer), strict server-side validation ("*never trust the client*"), and clean RESTful API contracts.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Role & Details |
|---|---|---|
| **Frontend (Client Layer)** | HTML5, Tailwind CSS (Play CDN), Vanilla JavaScript | Responsive card grid, category filters, real-time search, animated state feedback, detail & registration modal, admin dashboard with capacity utilization sorting. |
| **Backend (Server Layer)** | Python 3.12, FastAPI, Uvicorn, Pydantic v2 | High-performance RESTful API endpoints, strict schema validation, collision handling, dynamic available seat calculations, and static frontend file serving. |
| **Data Layer** | SQLite (`fest.db`), `openpyxl` | Embedded relational database with foreign key constraints, `UNIQUE(event_id, email)` collision safety, and Excel seed loading. |
| **API Testing** | Postman | Automated collection (`zenith26-api.postman_collection.json`) covering all 2xx, 4xx, and stretch endpoints. |

---

## 📁 Project Structure

```
zenith26-fest-system/
├── backend/
│   ├── database.py       # SQLite connection, schema initialization (events & registrations)
│   ├── models.py         # Pydantic schemas (EventOut, RegistrationIn, RegistrationOut, StatsOut)
│   ├── seed_data.py      # Reads data/events_seed.xlsx via openpyxl and seeds SQLite
│   └── main.py           # FastAPI server with all REST endpoints & static file mounts
├── frontend/
│   ├── index.html        # Student event discovery portal & registration experience
│   ├── admin.html        # Coordinator dashboard with live metrics & registration table
│   └── js/
│       ├── app.js        # Student portal UI logic, search debounce, modal, form submission
│       └── admin.js      # Admin telemetry, live stats, utilization sorting, cancellation
├── data/
│   └── events_seed.xlsx  # 14 initial fest events spreadsheet
├── fest.db               # SQLite database file (generated automatically)
├── zenith26-api.postman_collection.json # Ready-to-import Postman test collection
├── requirements.txt      # Project dependencies
└── README.md             # Project documentation and guide
```

---

## 🚀 Quickstart & Setup

### 1. Prerequisites
- Python 3.10+ installed on your system.

### 2. Set Up Virtual Environment & Dependencies

From within the `zenith26-fest-system/` folder:

```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Windows (CMD):
.\venv\Scripts\activate.bat
# On macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Seed Database
The events are seeded directly from `data/events_seed.xlsx`:

```bash
python -m backend.seed_data
```
*(Note: `main.py` will also automatically verify and seed any missing records on server startup!)*

### 4. Run the Application
Start the FastAPI server with live reloading enabled:

```bash
uvicorn backend.main:app --reload
```

The application is now live at:
- 🌐 **Student Event Portal:** [http://localhost:8000/](http://localhost:8000/)
- 📊 **Admin Dashboard:** [http://localhost:8000/admin.html](http://localhost:8000/admin.html)
- 📖 **Interactive Swagger API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- 📑 **ReDoc Specifications:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 🔌 API Contract Reference

| Method | Endpoint | Description | Request Body | Key Status Codes |
|---|---|---|---|---|
| `GET` | `/api/events` | List all events with dynamic `available_seats`. Supports `?category=` and `?search=`. | None | `200 OK` |
| `GET` | `/api/events/{id}` | Retrieve details for one event. | None | `200 OK`, `404 Not Found` |
| `POST` | `/api/events/{id}/register` | Register a student for an event with server-side validation. | `RegistrationIn` | `201 Created`, `400 Bad Request`, `404 Not Found`, `409 Conflict` |
| `GET` | `/api/registrations` | List all student registrations (includes event title). Supports `?event_id=`. | None | `200 OK` |
| `GET` | `/api/stats` | Real-time computed fest statistics for admin dashboard. | None | `200 OK` |
| `POST` | `/api/events` *(Stretch)* | Admin: Add a new fest event. | `EventCreate` | `201 Created`, `400 Bad Request` |
| `DELETE` | `/api/registrations/{id}` *(Stretch)* | Admin: Cancel a student registration and free the seat. | None | `200 OK`, `404 Not Found` |

---

## 🧪 Postman API Testing Guide

1. Open Postman.
2. Click **Import** and select `zenith26-api.postman_collection.json`.
3. Ensure your local server is running on `http://127.0.0.1:8000`.
4. Test the requests:
   - **`GET /api/events`**: Verify `available_seats` is computed on every request.
   - **`POST /api/events/1/register` (Success)**: Confirm `201 Created` is returned.
   - **`POST /api/events/1/register` (Validation Error)**: Send an empty `student_name`; verify `400 Bad Request` with `{"detail": "Student name is required."}`.
   - **`POST /api/events/1/register` (Duplicate Error)**: Send the same email again; verify `409 Conflict` with `{"detail": "Already registered"}`.
   - **`GET /api/stats`**: Verify overall utilization % and categories are recalculated live from the database.

---

## 💡 Key Product Management Concepts Highlighted

1. **Client vs. Server Truth:** `available_seats` is never a stored counter that can become stale. It is computed in the server layer on every read from the authoritative database rows.
2. **Never Trust the Client:** The frontend performs client-side form validation for user convenience, but the FastAPI backend enforces strict validation independently. Even if a user bypasses browser validation, the database constraints prevent invalid data.
3. **HTTP Status Codes:** Differentiates between client input errors (`400 Bad Request`), missing entities (`404 Not Found`), business rule conflicts (`409 Conflict`), and successes (`200 OK`, `201 Created`).
