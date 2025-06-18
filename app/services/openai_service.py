import openai
from app.config import Config
import logging
from typing import Dict, Optional, List

logger = logging.getLogger(__name__)

class OpenAIService:
    def __init__(self):
        openai.api_key = Config.OPENAI_API_KEY

    def generate_response(self, message: str, business_context: Dict = None, personality: str = "profesional y amigable") -> str:
        """Generar respuesta usando OpenAI con contexto específico del negocio"""
        try:
            # Buscar respuesta en conocimiento personalizado primero
            custom_response = self._search_custom_knowledge(message, business_context)
            if custom_response:
                return custom_response

            # Construir prompt basado en el contexto del negocio
            system_prompt = self._build_system_prompt(business_context, personality)

            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                max_tokens=500,
                temperature=0.7
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            logger.error(f"OpenAI error: {e}")
            return "Disculpa, estoy experimentando dificultades técnicas. ¿Podrías contactar directamente con nuestro equipo?"

    def generate_voice_response(self, speech_text: str, business_context: Dict = None) -> str:
        """Generar respuesta optimizada para llamadas telefónicas"""
        try:
            system_prompt = self._build_voice_system_prompt(business_context)

            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": speech_text}
                ],
                max_tokens=200,  # Respuestas más cortas para voz
                temperature=0.7
            )

            # Limpiar respuesta para que sea más natural en voz
            voice_response = response.choices[0].message.content.strip()
            return self._optimize_for_voice(voice_response)

        except Exception as e:
            logger.error(f"OpenAI voice API error: {e}")
            return "Lo siento, estoy experimentando dificultades técnicas en este momento."

    def _build_system_prompt(self, business_context: Dict = None, personality: str = "profesional y amigable") -> str:
        """Construir prompt del sistema basado en el contexto del negocio"""

        base_prompt = f"""Eres un asistente virtual {personality} que ayuda a los clientes de un negocio. 

Tu personalidad es: {personality}

Siempre debes:
- Ser útil y resolver las consultas de los clientes
- Mantener un tono {personality}
- Ofrecer información precisa sobre el negocio
- Si no sabes algo, ser honesto y ofrecer contactar con el equipo humano
- Usar emojis ocasionalmente para ser más amigable
"""

        if business_context:
            business_name = business_context.get('business_name', 'nuestro negocio')
            services = business_context.get('services', [])
            hours = business_context.get('hours', 'horario laboral')

            context_prompt = f"""

Información específica del negocio:
- Nombre del negocio: {business_name}
- Servicios que ofrecemos: {', '.join(services) if services else 'Consulta nuestros servicios disponibles'}
- Horarios de atención: {hours}
"""

            common_questions = business_context.get('common_questions', [])
            if common_questions:
                context_prompt += f"\nPreguntas frecuentes que debes estar preparado para responder:\n"
                for question in common_questions:
                    context_prompt += f"- {question}\n"

            base_prompt += context_prompt

        return base_prompt

    def _build_voice_system_prompt(self, business_context: Dict = None) -> str:
        """Construir prompt del sistema optimizado para llamadas telefónicas"""
        base_prompt = """Eres un asistente virtual telefónico inteligente y profesional. 

IMPORTANTE - REGLAS PARA LLAMADAS TELEFÓNICAS:
- Mantén respuestas CORTAS y CLARAS (máximo 2-3 oraciones)
- Usa un tono amigable pero profesional
- Habla de forma natural, como si fuera una conversación telefónica
- Evita jerga técnica o palabras complicadas
- Si necesitas información del cliente, pide UN dato a la vez
- Para citas, solicita: nombre, teléfono, fecha preferida, motivo
- Si no puedes resolver algo, ofrece transferir a un humano
- Nunca inventes información sobre horarios o disponibilidad"""

        if business_context:
            business_name = business_context.get('business_name', 'nuestro negocio')
            business_type = business_context.get('business_type', 'general')
            services = business_context.get('services', 'nuestros servicios')
            hours = business_context.get('hours', 'horario comercial')

            context_prompt = f"""

CONTEXTO DEL NEGOCIO:
- Nombre: {business_name}
- Tipo: {business_type}
- Servicios: {services}
- Horarios: {hours}

Responde como el asistente telefónico oficial de {business_name}."""

            return base_prompt + context_prompt

        return base_prompt

    def get_business_template_response(self, business_type: str, query_type: str) -> str:
        """Obtener respuestas predefinidas por tipo de negocio"""

        templates = {
            "clinic": {
                "appointment": "Para agendar una cita médica, necesito algunos datos: ¿Para qué especialidad necesitas la cita? ¿Tienes alguna preferencia de fecha y horario? 📅",
                "services": "Ofrecemos servicios de medicina general y especialidades médicas. ¿Te interesa alguna especialidad en particular? 🏥",
                "pricing": "Los costos varían según el tipo de consulta y especialidad. ¿Podrías decirme qué tipo de consulta necesitas para darte información más específica? 💰"
            },
            "management": {
                "appointment": "Para programar una consulta, ¿sobre qué tipo de trámite o gestión necesitas asesoría? ¿Tienes disponibilidad esta semana? 📋",
                "services": "Gestionamos trámites fiscales, laborales y administrativos. ¿En qué área específica necesitas ayuda? 📊",
                "pricing": "Nuestros honorarios varían según la complejidad del trámite. ¿Podrías contarme más sobre lo que necesitas gestionar? 💼"
            },
            "property_admin": {
                "appointment": "¿Necesitas una visita para ver una propiedad o es para gestiones administrativas? ¿Qué día te viene mejor? 🏢",
                "services": "Administramos propiedades, gestionamos inquilinos y mantenimiento. ¿Con qué tema específico necesitas ayuda? 🏠",
                "pricing": "Las tarifas dependen del tipo de propiedad y servicios. ¿Podrías contarme más sobre tu propiedad? 🏘️"
            },
            "ecommerce": {
                "product_info": "¿Qué producto te interesa? Puedo ayudarte con información detallada, disponibilidad y precios 🛍️",
                "shipping": "Tenemos diferentes opciones de envío. ¿A qué ciudad necesitas el envío para darte los costos exactos? 📦",
                "support": "¿Con qué puedo ayudarte hoy? ¿Es sobre un pedido existente o estás buscando un producto específico? 🛒"
            }
        }

        return templates.get(business_type, {}).get(query_type, "¿En qué puedo ayudarte hoy? 😊")

    def _search_custom_knowledge(self, message: str, business_context: Dict = None) -> Optional[str]:
        """Buscar respuesta en el conocimiento personalizado del negocio"""
        if not business_context or 'custom_knowledge' not in business_context:
            return None

        custom_knowledge = business_context['custom_knowledge']
        message_lower = message.lower()

        best_match = None
        highest_score = 0

        for category, qa_pairs in custom_knowledge.items():
            for qa in qa_pairs:
                # Calcular similitud basada en palabras clave y contenido
                score = self._calculate_similarity(message_lower, qa)

                if score > highest_score and score > 0.6:  # Umbral de similitud
                    highest_score = score
                    best_match = qa['answer']

        return best_match

    def _calculate_similarity(self, message: str, qa_pair: Dict) -> float:
        """Calcular similitud entre mensaje y par pregunta-respuesta"""
        question_lower = qa_pair['question'].lower()
        keywords = [kw.lower() for kw in qa_pair.get('keywords', [])]

        # Puntuación por palabras clave
        keyword_score = 0
        for keyword in keywords:
            if keyword in message:
                keyword_score += 0.3

        # Puntuación por similitud de palabras en la pregunta
        question_words = set(question_lower.split())
        message_words = set(message.split())

        common_words = question_words.intersection(message_words)
        if len(question_words) > 0:
            question_score = len(common_words) / len(question_words)
        else:
            question_score = 0

        return min(keyword_score + question_score, 1.0)

    def _optimize_for_voice(self, text: str) -> str:
        """Optimizar texto para que suene natural en voz"""
        # Reemplazar abreviaciones y símbolos
        replacements = {
            'Dr.': 'Doctor',
            'Dra.': 'Doctora',
            'Sr.': 'Señor',
            'Sra.': 'Señora',
            '&': 'y',
            '@': 'arroba',
            '%': 'por ciento',
            'ej.': 'por ejemplo',
            'etc.': 'etcétera'
        }

        for old, new in replacements.items():
            text = text.replace(old, new)

        # Limpiar caracteres que no suenan bien en voz
        text = text.replace('*', '').replace('#', '').replace('_', '')

        return text

    def analyze_content_for_training(self, content: str, business_type: str = "") -> List[Dict]:
        """Analizar contenido para generar sugerencias de entrenamiento"""
        try:
            prompt = f"""
Analiza el siguiente contenido de un negocio tipo '{business_type}' y genera preguntas y respuestas útiles para entrenar un asistente virtual.

Contenido:
{content}

Genera 5-10 pares de pregunta-respuesta en formato JSON. Cada par debe incluir:
- question: Una pregunta que un cliente podría hacer
- answer: La respuesta basada en el contenido
- category: Una categoría apropiada
- keywords: Lista de palabras clave relevantes

Responde solo con el JSON válido, sin explicaciones adicionales.
"""

            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Eres un experto en análisis de contenido y generación de FAQ para entrenar asistentes virtuales."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000,
                temperature=0.3
            )

            result = response.choices[0].message.content.strip()

            # Intentar parsear como JSON
            try:
                import json
                suggestions = json.loads(result)
                return suggestions if isinstance(suggestions, list) else [suggestions]
            except json.JSONDecodeError:
                logger.error("Error parsing OpenAI response as JSON")
                return []

        except Exception as e:
            logger.error(f"Analyze content error: {e}")
            return []