
from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import datetime
from enum import Enum

class BusinessType(str, Enum):
    CLINIC = "clinic"
    MANAGEMENT = "management"
    PROPERTY_ADMIN = "property_admin"
    ECOMMERCE = "ecommerce"

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    CANCELLED = "cancelled"
    PAST_DUE = "past_due"
    TRIAL = "trial"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    business_name: str
    business_type: BusinessType
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        return v

class UserResponse(BaseModel):
    id: str
    email: str
    business_name: str
    business_type: BusinessType
    phone: Optional[str]
    website: Optional[str]
    address: Optional[str]
    subscription_status: SubscriptionStatus
    created_at: datetime
    updated_at: datetime

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class BusinessConfig(BaseModel):
    business_hours: Optional[dict] = None
    services: Optional[list] = None
    pricing: Optional[dict] = None
    custom_responses: Optional[dict] = None
    welcome_message: Optional[str] = None
