
from pydantic import BaseModel, validator
from typing import Optional, Dict, List
from datetime import datetime
from enum import Enum

class PlanType(str, Enum):
    BASIC = "basic"
    PREMIUM = "premium"
    ENTERPRISE = "enterprise"

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
    TRIALING = "trialing"

class SubscriptionCreate(BaseModel):
    user_id: str
    plan_type: PlanType
    business_type: BusinessType
    stripe_subscription_id: Optional[str] = None
    stripe_customer_id: Optional[str] = None

class SubscriptionResponse(BaseModel):
    id: str
    user_id: str
    plan_type: PlanType
    business_type: BusinessType
    status: SubscriptionStatus
    current_period_start: datetime
    current_period_end: datetime
    stripe_subscription_id: Optional[str]
    stripe_customer_id: Optional[str]
    created_at: datetime
    updated_at: datetime

class PlanFeatures(BaseModel):
    max_conversations: Optional[int] = None  # None = unlimited
    max_assistants: int
    has_advanced_analytics: bool
    has_priority_support: bool
    has_phone_calls: bool
    has_multichannel: bool
    has_api_access: bool
    has_custom_integrations: bool
    price_monthly: float
    price_yearly: Optional[float] = None

class Plan(BaseModel):
    id: str
    name: str
    plan_type: PlanType
    business_type: BusinessType
    features: PlanFeatures
    is_popular: bool = False
    description: Optional[str] = None
    target_audience: Optional[str] = None

# Configuración de planes por tipo de negocio
BUSINESS_PLANS = {
    "clinic": {
        "basic": {
            "name": "Clínica Básica",
            "price_monthly": 60.49,
            "features": {
                "max_conversations": 200,
                "max_assistants": 1,
                "has_advanced_analytics": False,
                "has_priority_support": False,
                "has_phone_calls": False,
                "has_multichannel": True,
                "has_api_access": False,
                "has_custom_integrations": False
            },
            "description": "Perfecto para consultorios pequeños",
            "includes": [
                "Gestión de citas médicas",
                "Recordatorios de consultas",
                "WhatsApp Business integrado",
                "Historial básico de pacientes"
            ]
        },
        "premium": {
            "name": "Clínica Premium",
            "price_monthly": 120.99,
            "features": {
                "max_conversations": None,
                "max_assistants": 3,
                "has_advanced_analytics": True,
                "has_priority_support": True,
                "has_phone_calls": True,
                "has_multichannel": True,
                "has_api_access": True,
                "has_custom_integrations": False
            },
            "description": "Ideal para clínicas medianas",
            "includes": [
                "Todo del plan Básico",
                "Múltiples especialidades",
                "Llamadas inteligentes",
                "Analytics avanzados",
                "Integración con sistemas médicos"
            ]
        }
    },
    "management": {
        "basic": {
            "name": "Gestoría Básica",
            "price_monthly": 39.99,
            "features": {
                "max_conversations": 150,
                "max_assistants": 1,
                "has_advanced_analytics": False,
                "has_priority_support": False,
                "has_phone_calls": False,
                "has_multichannel": True,
                "has_api_access": False,
                "has_custom_integrations": False
            },
            "description": "Para gestorías pequeñas",
            "includes": [
                "Gestión de consultas administrativas",
                "Recordatorios de trámites",
                "Seguimiento de expedientes",
                "WhatsApp Business"
            ]
        },
        "premium": {
            "name": "Gestoría Premium",
            "price_monthly": 79.99,
            "features": {
                "max_conversations": None,
                "max_assistants": 2,
                "has_advanced_analytics": True,
                "has_priority_support": True,
                "has_phone_calls": True,
                "has_multichannel": True,
                "has_api_access": True,
                "has_custom_integrations": True
            },
            "description": "Para gestorías establecidas",
            "includes": [
                "Todo del plan Básico",
                "Integración con sistemas gubernamentales",
                "Automatización de trámites",
                "Reportes detallados"
            ]
        }
    },
    "property_admin": {
        "basic": {
            "name": "Administración Básica",
            "price_monthly": 59.99,
            "features": {
                "max_conversations": 300,
                "max_assistants": 1,
                "has_advanced_analytics": False,
                "has_priority_support": False,
                "has_phone_calls": False,
                "has_multichannel": True,
                "has_api_access": False,
                "has_custom_integrations": False
            },
            "description": "Para administradores de fincas pequeñas",
            "includes": [
                "Gestión de inquilinos",
                "Recordatorios de pagos",
                "Solicitudes de mantenimiento",
                "Comunicación multicanal"
            ]
        },
        "premium": {
            "name": "Administración Premium",
            "price_monthly": 119.99,
            "features": {
                "max_conversations": None,
                "max_assistants": 2,
                "has_advanced_analytics": True,
                "has_priority_support": True,
                "has_phone_calls": True,
                "has_multichannel": True,
                "has_api_access": True,
                "has_custom_integrations": True
            },
            "description": "Para grandes administradores",
            "includes": [
                "Todo del plan Básico",
                "Gestión de múltiples propiedades",
                "Integración con sistemas de pago",
                "Portal del inquilino"
            ]
        }
    },
    "ecommerce": {
        "basic": {
            "name": "Tienda Básica",
            "price_monthly": 29.99,
            "features": {
                "max_conversations": 500,
                "max_assistants": 1,
                "has_advanced_analytics": False,
                "has_priority_support": False,
                "has_phone_calls": False,
                "has_multichannel": True,
                "has_api_access": False,
                "has_custom_integrations": False
            },
            "description": "Para tiendas online pequeñas",
            "includes": [
                "Atención al cliente automatizada",
                "Seguimiento de pedidos",
                "Recomendaciones de productos",
                "WhatsApp Shopping"
            ]
        },
        "premium": {
            "name": "Tienda Premium",
            "price_monthly": 89.99,
            "features": {
                "max_conversations": None,
                "max_assistants": 3,
                "has_advanced_analytics": True,
                "has_priority_support": True,
                "has_phone_calls": False,
                "has_multichannel": True,
                "has_api_access": True,
                "has_custom_integrations": True
            },
            "description": "Para ecommerce establecido",
            "includes": [
                "Todo del plan Básico",
                "Integración con inventario",
                "Carritos abandonados",
                "Analytics de ventas",
                "Múltiples idiomas"
            ]
        }
    }
}
