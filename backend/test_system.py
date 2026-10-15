"""
Automated verification script for Zenith '26 Fest System.
Tests all required endpoints and business rules.
"""

from fastapi.testclient import TestClient
from backend.main import app

def run_tests():
    client = TestClient(app)

    print(">>> 1. Testing GET / (Static frontend index.html)")
    res = client.get("/")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert "Zenith '26" in res.text, "Index HTML missing title"
    print("  ✓ Passed: GET / serves index.html")

    print(">>> 2. Testing GET /admin.html (Static frontend admin.html)")
    res = client.get("/admin.html")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert "Admin" in res.text, "Admin HTML missing title"
    print("  ✓ Passed: GET /admin.html serves admin.html")

    print(">>> 3. Testing GET /api/events (List 14 events)")
    res = client.get("/api/events")
    assert res.status_code == 200
    events = res.json()
    assert len(events) >= 14, f"Expected at least 14 events, got {len(events)}"
    first_ev = events[0]
    assert "available_seats" in first_ev, "available_seats missing in EventOut"
    print(f"  ✓ Passed: GET /api/events returned {len(events)} events with available_seats")

    print(">>> 4. Testing GET /api/events with category and search filter")
    res = client.get("/api/events?category=Technical&search=Code")
    assert res.status_code == 200
    filtered = res.json()
    assert len(filtered) >= 1
    assert "Code Sprint" in filtered[0]["title"]
    print("  ✓ Passed: Category and search filters worked")

    print(">>> 5. Testing GET /api/events/{event_id}")
    res = client.get("/api/events/1")
    assert res.status_code == 200
    assert res.json()["title"] == "Code Sprint 2.0"
    print("  ✓ Passed: GET /api/events/1 returned event details")

    print(">>> 6. Testing GET /api/events/{event_id} - 404 for invalid ID")
    res = client.get("/api/events/9999")
    assert res.status_code == 404
    print("  ✓ Passed: 404 returned for invalid event ID")

    print(">>> 7. Testing POST /api/events/1/register - Validation Failures (400)")
    # Missing name
    res = client.post("/api/events/1/register", json={
        "student_name": "",
        "roll_number": "26CS01",
        "email": "test@domain.com"
    })
    assert res.status_code == 400
    assert "Student name is required" in res.json()["detail"]

    # Invalid email
    res = client.post("/api/events/1/register", json={
        "student_name": "Test Student",
        "roll_number": "26CS01",
        "email": "invalidemail"
    })
    assert res.status_code == 400
    assert "@" in res.json()["detail"]
    print("  ✓ Passed: 400 Bad Request returned on invalid input")

    print(">>> 8. Testing POST /api/events/1/register - Success (201)")
    unique_email = "test.pmstudent@fest26.edu"
    res = client.post("/api/events/1/register", json={
        "student_name": "PM Student",
        "roll_number": "26PM001",
        "email": unique_email,
        "phone": "9876543210"
    })
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    reg_data = res.json()
    reg_id = reg_data["id"]
    print(f"  ✓ Passed: Registration created with ID #{reg_id}")

    print(">>> 9. Testing POST /api/events/1/register - Duplicate conflict (409)")
    res = client.post("/api/events/1/register", json={
        "student_name": "PM Student",
        "roll_number": "26PM001",
        "email": unique_email,
        "phone": "9876543210"
    })
    assert res.status_code == 409
    assert "Already registered" in res.json()["detail"]
    print("  ✓ Passed: 409 Conflict returned for duplicate registration")

    print(">>> 10. Testing GET /api/registrations")
    res = client.get("/api/registrations")
    assert res.status_code == 200
    regs = res.json()
    assert len(regs) >= 1
    assert "event_title" in regs[0]
    print(f"  ✓ Passed: GET /api/registrations returned {len(regs)} entries")

    print(">>> 11. Testing GET /api/stats")
    res = client.get("/api/stats")
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_events"] >= 14
    assert stats["total_registrations"] >= 1
    assert "Technical" in stats["events_by_category"]
    print(f"  ✓ Passed: GET /api/stats computed live metrics: {stats['overall_utilization_pct']}% utilization")

    print(">>> 12. Testing Stretch Goal: Admin Cancel Registration (DELETE)")
    res = client.delete(f"/api/registrations/{reg_id}")
    assert res.status_code == 200
    print(f"  ✓ Passed: Deleted registration #{reg_id}")

    print("\n==========================================")
    print("🎉 ALL 12 VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("==========================================")

if __name__ == "__main__":
    run_tests()
