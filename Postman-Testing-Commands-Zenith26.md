# Postman Testing Guide — Zenith '26 Fest Management System ⚡

**Companion testing guide to PM2-01 & PM2-02**  
This guide documents all 18 Postman test scenarios to thoroughly verify your API contract, server-side validation rules, and error handling.

---

## 🛠️ Postman Desktop Setup

1. **Start the FastAPI Server:**
   In your terminal inside `zenith26-fest-system`:
   ```bash
   .\venv\Scripts\Activate.ps1
   uvicorn backend.main:app --reload
   ```
   Confirm the server is live at `http://127.0.0.1:8000`.

2. **Import Collection:**
   - Open Postman.
   - Click **Import** (top left).
   - Drag and drop `zenith26-api.postman_collection.json` located in your project root.
   - A collection named **Zenith '26 Fest Management System API** will appear.

3. **Environment / Variable:**
   The collection includes a pre-configured variable `base_url` set to `http://127.0.0.1:8000`.

---

## 📋 The 18 Test Cases

### Folder 1: Events (`/api/events`)

#### Test 1: List All Events (Baseline)
- **Method:** `GET`
- **URL:** `{{base_url}}/api/events`
- **Expected Status:** `200 OK`
- **Expected Response:** An array of 14 event objects. Each object must include `available_seats` equal to `capacity` (when 0 registrations exist).

#### Test 2: Filter by Category (Technical)
- **Method:** `GET`
- **URL:** `{{base_url}}/api/events?category=Technical`
- **Expected Status:** `200 OK`
- **Expected Response:** Array containing only events where `category == "Technical"` (4 events: Code Sprint 2.0, Robo Race, AI Pitch Fest, Web Design Rumble).

#### Test 3: Filter by Category (Cultural)
- **Method:** `GET`
- **URL:** `{{base_url}}/api/events?category=Cultural`
- **Expected Status:** `200 OK`
- **Expected Response:** Array containing 5 cultural events (Battle of Bands, Dance Fiesta, Nukkad Natak, Fashion Fusion, Open Mic Night).

#### Test 4: Search by Keyword
- **Method:** `GET`
- **URL:** `{{base_url}}/api/events?search=code`
- **Expected Status:** `200 OK`
- **Expected Response:** Returns events with "code" in the title (Code Sprint 2.0 and Intro to Vibe Coding).

#### Test 5: Search + Category Combined
- **Method:** `GET`
- **URL:** `{{base_url}}/api/events?category=Technical&search=design`
- **Expected Status:** `200 OK`
- **Expected Response:** Only "Web Design Rumble".

#### Test 6: Search with No Matches (Empty Array)
- **Method:** `GET`
- **URL:** `{{base_url}}/api/events?search=NonExistentEvent`
- **Expected Status:** `200 OK`
- **Expected Response:** `[]` (empty list, not an error).

---

### Folder 2: Event Details (`/api/events/{event_id}`)

#### Test 7: Get Single Event Details (Success)
- **Method:** `GET`
- **URL:** `{{base_url}}/api/events/1`
- **Expected Status:** `200 OK`
- **Expected Response:**
  ```json
  {
    "id": 1,
    "title": "Code Sprint 2.0",
    "category": "Technical",
    "description": "Fast-paced algorithmic coding and problem-solving competition.",
    "event_date": "2026-11-14",
    "event_time": "10:00 AM",
    "venue": "Main Auditorium",
    "capacity": 100,
    "fee": 0,
    "icon": "💻",
    "available_seats": 100
  }
  ```

#### Test 8: Get Non-Existent Event (404 Not Found)
- **Method:** `GET`
- **URL:** `{{base_url}}/api/events/999`
- **Expected Status:** `404 Not Found`
- **Expected Response:**
  ```json
  {
    "detail": "Event with id 999 not found."
  }
  ```

---

### Folder 3: Registration Flow & Server Validation (`POST /api/events/{event_id}/register`)

#### Test 9: Register Student Successfully (201 Created)
- **Method:** `POST`
- **URL:** `{{base_url}}/api/events/1/register`
- **Header:** `Content-Type: application/json`
- **Body (raw JSON):**
  ```json
  {
    "student_name": "Rohan Verma",
    "roll_number": "26CS042",
    "email": "rohan.verma@college.edu",
    "phone": "9876543210"
  }
  ```
- **Expected Status:** `201 Created`
- **Expected Response:**
  ```json
  {
    "id": 1,
    "event_id": 1,
    "student_name": "Rohan Verma",
    "registered_at": "..."
  }
  ```

#### Test 10: Verify Dynamic Seat Decrement
- **Method:** `GET`
- **URL:** `{{base_url}}/api/events/1`
- **Expected Status:** `200 OK`
- **Expected Response:** `available_seats` should now be `99` (capacity 100 minus 1 registration).

#### Test 11: Duplicate Registration Conflict (409 Conflict)
- **Method:** `POST`
- **URL:** `{{base_url}}/api/events/1/register`
- **Body (same student and event):**
  ```json
  {
    "student_name": "Rohan Verma",
    "roll_number": "26CS042",
    "email": "rohan.verma@college.edu",
    "phone": "9876543210"
  }
  ```
- **Expected Status:** `409 Conflict`
- **Expected Response:**
  ```json
  {
    "detail": "Already registered"
  }
  ```

#### Test 12: Missing Student Name (400 Bad Request)
- **Method:** `POST`
- **URL:** `{{base_url}}/api/events/1/register`
- **Body:**
  ```json
  {
    "student_name": "",
    "roll_number": "26CS099",
    "email": "ananya@college.edu"
  }
  ```
- **Expected Status:** `400 Bad Request`
- **Expected Response:** `{"detail": "Student name is required."}`

#### Test 13: Invalid Email Missing '@' (400 Bad Request)
- **Method:** `POST`
- **URL:** `{{base_url}}/api/events/1/register`
- **Body:**
  ```json
  {
    "student_name": "Ananya Sen",
    "roll_number": "26CS099",
    "email": "invalidemail.college.edu"
  }
  ```
- **Expected Status:** `400 Bad Request`
- **Expected Response:** `{"detail": "A valid email address containing '@' is required."}`

#### Test 14: Register for Non-Existent Event (404 Not Found)
- **Method:** `POST`
- **URL:** `{{base_url}}/api/events/999/register`
- **Body:**
  ```json
  {
    "student_name": "Simran Kaur",
    "roll_number": "26EC012",
    "email": "simran@college.edu"
  }
  ```
- **Expected Status:** `404 Not Found`
- **Expected Response:** `{"detail": "Event with id 999 not found."}`

---

### Folder 4: Registrations & Admin Analytics

#### Test 15: List Registrations (Includes Event Title)
- **Method:** `GET`
- **URL:** `{{base_url}}/api/registrations`
- **Expected Status:** `200 OK`
- **Expected Response:** List containing registered records with `event_title` ("Code Sprint 2.0").

#### Test 16: Filter Registrations by Event ID
- **Method:** `GET`
- **URL:** `{{base_url}}/api/registrations?event_id=1`
- **Expected Status:** `200 OK`
- **Expected Response:** Registrations for event #1 only.

#### Test 17: Live Admin Dashboard Statistics
- **Method:** `GET`
- **URL:** `{{base_url}}/api/stats`
- **Expected Status:** `200 OK`
- **Expected Response:**
  ```json
  {
    "total_events": 14,
    "total_registrations": 1,
    "total_capacity": 1437,
    "overall_utilization_pct": 0.1,
    "upcoming_events_count": 14,
    "events_by_category": {
      "Cultural": 5,
      "Technical": 4,
      "Sports": 2,
      "Workshop": 2,
      "Gaming": 1
    }
  }
  ```

---

### Folder 5: Stretch Goal Operations

#### Test 18: Admin Cancel Registration (DELETE)
- **Method:** `DELETE`
- **URL:** `{{base_url}}/api/registrations/1`
- **Expected Status:** `200 OK`
- **Expected Response:**
  ```json
  {
    "success": true,
    "message": "Registration #1 for Rohan Verma cancelled successfully.",
    "event_id": 1
  }
  ```
- **Follow-up check:** `GET /api/events/1` now shows `available_seats: 100` again!
