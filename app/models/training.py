from pydantic import BaseModel, validator
from typing import Optional, List, Dict
from datetime import datetime
from enum import Enum

class TrainingStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"

class TrainingType(str, Enum):
    FAQ = "faq"
    PRODUCT_INFO = "product_info"
    SERVICE_INFO = "service_info"
    PROCESS_INFO = "process_info"
    CUSTOM_RESPONSE = "custom_response"

class TrainingDataCreate(BaseModel):
    user_id: str
    training_type: TrainingType
    question: str
    answer: str
    category: Optional[str] = None
    keywords: Optional[List[str]] = []
    context: Optional[Dict] = None

class TrainingDataResponse(BaseModel):
    id: str
    user_id: str
    training_type: TrainingType
    question: str
    answer: str
    category: Optional[str]
    keywords: List[str]
    context: Optional[Dict]
    status: TrainingStatus
    created_at: datetime
    updated_at: datetime

class TrainingDataUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    keywords: Optional[List[str]] = None
    context: Optional[Dict] = None
    status: Optional[TrainingStatus] = None

class BulkTrainingUpload(BaseModel):
    user_id: str
    training_data: List[Dict]
    auto_categorize: bool = True

# Plantillas de entrenamiento por nicho
TRAINING_TEMPLATES = {
    "clinic": {
        "categories": [
            "Citas y Horarios",
            "Servicios Médicos", 
            "Precios y Seguros",
            "Preparación para Consultas",
            "Políticas y Procedimientos"
        ],
        "sample_questions": [
            {
                "question": "¿Cómo puedo agendar una cita?",
                "answer": "Puedes agendar tu cita llamando al [TELÉFONO] o a través de nuestra página web. Necesitamos tu nombre completo, número de contacto y el tipo de consulta que necesitas.",
                "category": "Citas y Horarios",
                "keywords": ["cita", "agendar", "reservar", "appointment"]
            },
            {
                "question": "¿Qué documentos necesito traer?",
                "answer": "Para tu consulta necesitas traer: documento de identidad, carnet del seguro médico (si aplica), y cualquier examen o resultado médico previo relacionado con tu consulta.",
                "category": "Preparación para Consultas",
                "keywords": ["documentos", "traer", "necesito", "consulta"]
            },
            {
                "question": "¿Cuáles son sus horarios de atención?",
                "answer": "Nuestros horarios son de lunes a viernes de 8:00 AM a 6:00 PM, y sábados de 9:00 AM a 1:00 PM. Los domingos permanecemos cerrados.",
                "category": "Citas y Horarios",
                "keywords": ["horarios", "atención", "abierto", "cerrado"]
            },
            {
                "question": "¿Qué servicios médicos ofrecen?",
                "answer": "Ofrecemos consultas de medicina general, especialidades, exámenes de laboratorio, ecografías y procedimientos menores. Para servicios específicos, consulte con recepción.",
                "category": "Servicios Médicos",
                "keywords": ["servicios", "medicina", "consultas", "exámenes"]
            },
            {
                "question": "¿Aceptan mi seguro médico?",
                "answer": "Trabajamos con los principales seguros médicos. Por favor, traiga su carnet del seguro para verificar cobertura y copagos antes de su consulta.",
                "category": "Precios y Seguros",
                "keywords": ["seguro", "cobertura", "copago", "precio"]
            }
        ]
    },
    "management": {
        "categories": [
            "Constitución de Empresas",
            "Trámites Fiscales y AEAT",
            "Asesoría Laboral y Nóminas",
            "Contabilidad y Libros",
            "Seguros Sociales",
            "Certificados y Licencias",
            "Plazos y Obligaciones",
            "Costos y Honorarios"
        ],
        "sample_questions": [
            {
                "question": "¿Qué documentos necesito para crear una empresa?",
                "answer": "Para la constitución de empresa necesitas: documento de identidad, certificado de homonimia, minuta de constitución, y comprobante de domicilio del representante legal.",
                "category": "Constitución de Empresas",
                "keywords": ["empresa", "crear", "constituir", "documentos"]
            },
            {
                "question": "¿Cuándo vence la declaración del IVA?",
                "answer": "La declaración del IVA se presenta trimestralmente antes del día 20 de enero, abril, julio y octubre. Para empresas con volumen superior a 6M€ es mensual.",
                "category": "Trámites Fiscales y AEAT",
                "keywords": ["iva", "declaracion", "plazo", "aeat"]
            },
            {
                "question": "¿Cómo registro un nuevo empleado?",
                "answer": "Para dar de alta un empleado necesitas: contrato de trabajo, alta en Seguridad Social (antes del inicio), comunicación a Servicio Público de Empleo, y registro en el libro de matrículas.",
                "category": "Asesoría Laboral y Nóminas",
                "keywords": ["empleado", "alta", "seguridad social", "contrato"]
            },
            {
                "question": "¿Qué libros contables soy obligado a llevar?",
                "answer": "Dependiendo de tu régimen: Libro Diario, Libro de Inventarios y Cuentas Anuales son obligatorios. Autónomos pueden usar Libro de Ingresos y Gastos simplificado.",
                "category": "Contabilidad y Libros",
                "keywords": ["libros", "contables", "diario", "inventarios"]
            }
        ]
    },
    "property_admin": {
        "categories": [
            "Gestión de Inquilinos",
            "Mantenimiento y Averías",
            "Cobranza y Morosos",
            "Contratos y Renovaciones",
            "Comunidad de Propietarios",
            "Seguros y Incidencias",
            "Normativas y Certificados",
            "Servicios y Proveedores"
        ],
        "sample_questions": [
            {
                "question": "¿Cómo reporto una avería?",
                "answer": "Puedes reportar averías llamando al [TELÉFONO] o enviando un WhatsApp al [NÚMERO]. Incluye fotos del problema y una descripción detallada.",
                "category": "Mantenimiento y Averías",
                "keywords": ["avería", "reportar", "problema", "mantenimiento"]
            },
            {
                "question": "Mi inquilino no paga la renta, ¿qué puedo hacer?",
                "answer": "Primero enviamos comunicación formal. Si persiste, iniciamos procedimiento de desahucio. Te mantenemos informado en cada paso del proceso legal.",
                "category": "Cobranza y Morosos",
                "keywords": ["moroso", "impago", "desahucio", "renta"]
            },
            {
                "question": "¿Cuándo se vence mi contrato de alquiler?",
                "answer": "Revisaré tu contrato específico. Generalmente con 30 días de antelación debemos notificar renovación o finalización según LAU vigente.",
                "category": "Contratos y Renovaciones",
                "keywords": ["contrato", "vencimiento", "renovacion", "lau"]
            },
            {
                "question": "¿Necesito cédula de habitabilidad?",
                "answer": "Sí, es obligatoria para alquiler en la mayoría de CCAA. Verificamos vigencia y tramitamos renovación si es necesario antes del vencimiento.",
                "category": "Normativas y Certificados",
                "keywords": ["cedula", "habitabilidad", "certificado", "obligatorio"]
            }
        ]
    },
    "ecommerce": {
        "categories": [
            "Catálogo y Disponibilidad",
            "Envíos y Logística",
            "Pagos y Facturación",
            "Devoluciones y Garantías",
            "Seguimiento de Pedidos",
            "Promociones y Descuentos",
            "Soporte Técnico",
            "Cuenta de Cliente"
        ],
        "sample_questions": [
            {
                "question": "¿Cuánto tiempo tarda el envío?",
                "answer": "Los envíos tardan entre 2-5 días hábiles dependiendo de tu ubicación. Envíos en [CIUDAD] llegan en 24-48 horas.",
                "category": "Envíos y Logística",
                "keywords": ["envío", "entrega", "tiempo", "demora"]
            },
            {
                "question": "¿Tienen stock del producto que me interesa?",
                "answer": "Te confirmo disponibilidad al momento. ¿Podrías decirme qué producto específico te interesa y en qué talla/color si aplica?",
                "category": "Catálogo y Disponibilidad",
                "keywords": ["stock", "disponibilidad", "producto", "talla"]
            },
            {
                "question": "¿Dónde está mi pedido?",
                "answer": "Con tu número de pedido puedo consultar el estado exacto. ¿Tienes a mano el número de confirmación que te enviamos por email?",
                "category": "Seguimiento de Pedidos",
                "keywords": ["pedido", "tracking", "seguimiento", "estado"]
            },
            {
                "question": "¿Puedo devolver este producto?",
                "answer": "Tienes 30 días para devoluciones desde la recepción. El producto debe estar sin usar con etiquetas originales. Te envío las instrucciones de devolución.",
                "category": "Devoluciones y Garantías",
                "keywords": ["devolucion", "garantia", "cambio", "reembolso"]
            }
        ]
    }
}