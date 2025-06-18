
from pydantic import BaseModel
from datetime import datetime, date, time
from typing import Optional
from enum import Enum

class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"

class AppointmentCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    appointment_date: date
    appointment_time: time
    service: str
    notes: Optional[str] = None

class AppointmentUpdate(BaseModel):
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_email: Optional[str] = None
    appointment_date: Optional[date] = None
    appointment_time: Optional[time] = None
    service: Optional[str] = None
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None

class AppointmentResponse(BaseModel):
    id: str
    user_id: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str]
    appointment_date: date
    appointment_time: time
    service: str
    status: AppointmentStatus
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
