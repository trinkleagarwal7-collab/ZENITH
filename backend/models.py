from typing import Optional, Dict
from pydantic import BaseModel, Field

class EventOut(BaseModel):
    id: int
    title: str
    category: str
    description: Optional[str] = None
    event_date: str
    event_time: str
    venue: str
    capacity: int
    fee: int = 0
    icon: Optional[str] = None
    available_seats: int

    class Config:
        from_attributes = True

class EventDetail(EventOut):
    pass

class RegistrationIn(BaseModel):
    student_name: str = Field(..., description="Full name of the student")
    roll_number: str = Field(..., description="Student roll number / ID")
    email: str = Field(..., description="Student email address")
    phone: Optional[str] = Field(None, description="Optional phone number")

class RegistrationOut(BaseModel):
    id: int
    event_id: int
    student_name: str
    registered_at: str

    class Config:
        from_attributes = True

class RegistrationListItem(BaseModel):
    id: int
    event_id: int
    event_title: str
    student_name: str
    roll_number: str
    email: str
    phone: Optional[str] = None
    registered_at: str

    class Config:
        from_attributes = True

class StatsOut(BaseModel):
    total_events: int
    total_registrations: int
    total_capacity: int
    overall_utilization_pct: float
    upcoming_events_count: int
    events_by_category: Dict[str, int]

# For Stretch Goal: Admin adding an event
class EventCreate(BaseModel):
    title: str
    category: str
    description: Optional[str] = None
    event_date: str
    event_time: str
    venue: str
    capacity: int
    fee: int = 0
    icon: Optional[str] = None
