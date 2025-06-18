
from pydantic import BaseModel, validator
from typing import Optional, Dict, List
from datetime import datetime
from enum import Enum
from .user import BusinessType

class AssistantStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    TRAINING = "training"

class AssistantCreate(BaseModel):
    user_id: str
    name: str
    description: Optional[str] = None
    personality: Optional[str] = "profesional y amigable"
    business_context: Optional[Dict] = None
    welcome_message: Optional[str] = None
    fallback_message: Optional[str] = None
    
class AssistantResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    personality: str
    business_context: Optional[Dict]
    welcome_message: Optional[str]
    fallback_message: Optional[str]
    status: AssistantStatus
    total_conversations: int
    created_at: datetime
    updated_at: datetime

class AssistantUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    personality: Optional[str] = None
    business_context: Optional[Dict] = None
    welcome_message: Optional[str] = None
    fallback_message: Optional[str] = None
    status: Optional[AssistantStatus] = None

# Contextos predefinidos por tipo de negocio
DEFAULT_BUSINESS_CONTEXTS = {
    "clinic": {
        "services": [
            "Medicina General",
            "Especialidades",
            "Consultas de urgencia",
            "Medicina preventiva"
        ],
        "hours": "Lunes a Viernes 8:00-18:00, Sábados 8:00-12:00",
        "common_questions": [
            "¿Cómo puedo agendar una cita?",
            "¿Qué especialidades tienen?",
            "¿Cuáles son los costos?",
            "¿Aceptan mi seguro médico?"
        ]
    },
    "management": {
        "services": [
            "Gestión fiscal",
            "Asesoría laboral", 
            "Trámites administrativos",
            "Consultoría empresarial"
        ],
        "hours": "Lunes a Viernes 9:00-17:00",
        "common_questions": [
            "¿Qué trámites pueden gestionar?",
            "¿Cuánto tiempo toma un proceso?",
            "¿Cuáles son sus honorarios?",
            "¿Necesito cita previa?"
        ]
    },
    "property_admin": {
        "services": [
            "Administración de propiedades",
            "Gestión de inquilinos",
            "Mantenimiento",
            "Cobranza"
        ],
        "hours": "Lunes a Viernes 9:00-18:00",
        "common_questions": [
            "¿Cómo reporto una avería?",
            "¿Cuándo vence mi contrato?",
            "¿Cómo puedo pagar la renta?",
            "¿Hay espacios disponibles?"
        ]
    },
    "ecommerce": {
        "services": [
            "Venta de productos",
            "Servicio al cliente",
            "Envíos y devoluciones",
            "Soporte técnico"
        ],
        "hours": "24/7 atención online",
        "common_questions": [
            "¿Tienen este producto disponible?",
            "¿Cuánto cuesta el envío?",
            "¿Cómo puedo devolver un producto?",
            "¿Aceptan pagos con tarjeta?"
        ]
    }
}
