
import requests
import logging
from app.config import Config
from app.services.openai_service import OpenAIService
from typing import Dict, Optional
import json

logger = logging.getLogger(__name__)

class VoiceService:
    def __init__(self):
        self.account_sid = Config.TWILIO_ACCOUNT_SID
        self.auth_token = Config.TWILIO_AUTH_TOKEN
        self.from_phone = Config.TWILIO_PHONE_NUMBER
        self.base_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}"
        self.openai_service = OpenAIService()
    
    def make_outbound_call(self, to_phone: str, message: str, business_context: Dict = None) -> Dict:
        """Realizar llamada saliente automatizada"""
        try:
            # Generar TwiML para la llamada
            twiml_url = self._create_twiml_url(message, business_context)
            
            url = f"{self.base_url}/Calls.json"
            
            response = requests.post(
                url,
                auth=(self.account_sid, self.auth_token),
                data={
                    'From': self.from_phone,
                    'To': to_phone,
                    'Url': twiml_url,
                    'Method': 'POST'
                }
            )
            response.raise_for_status()
            
            call_data = response.json()
            logger.info(f"Outbound call initiated to {to_phone}, SID: {call_data.get('sid')}")
            return call_data
            
        except Exception as e:
            logger.error(f"Error making outbound call: {e}")
            return None
    
    def handle_incoming_call(self, call_data: Dict) -> str:
        """Manejar llamada entrante y generar respuesta TwiML"""
        try:
            caller_phone = call_data.get('From')
            called_phone = call_data.get('To')
            
            # Obtener contexto del negocio
            business_context = self._get_business_context_by_phone(called_phone)
            
            # Mensaje de bienvenida personalizado
            welcome_message = self._generate_welcome_message(business_context)
            
            # Generar TwiML para respuesta interactiva
            twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">{welcome_message}</Say>
    <Gather input="speech" timeout="5" speechTimeout="3" action="/api/voice/process_speech" method="POST">
        <Say voice="alice" language="es">¿En qué puedo ayudarte hoy?</Say>
    </Gather>
    <Say voice="alice" language="es">No he recibido respuesta. Te transferiré con un representante. Un momento por favor.</Say>
    <Dial>{business_context.get('support_phone', self.from_phone)}</Dial>
</Response>"""
            
            return twiml
            
        except Exception as e:
            logger.error(f"Error handling incoming call: {e}")
            return self._generate_error_twiml()
    
    def process_speech(self, speech_data: Dict) -> str:
        """Procesar reconocimiento de voz y generar respuesta"""
        try:
            speech_text = speech_data.get('SpeechResult', '')
            caller_phone = speech_data.get('From')
            
            if not speech_text:
                return self._generate_fallback_twiml()
            
            # Obtener contexto del negocio
            business_context = self._get_business_context_by_phone(speech_data.get('To'))
            
            # Generar respuesta con OpenAI
            ai_response = self.openai_service.generate_voice_response(
                speech_text, 
                business_context
            )
            
            # Verificar si la consulta requiere acción específica
            action_needed = self._analyze_speech_for_actions(speech_text, ai_response)
            
            if action_needed.get('type') == 'appointment':
                return self._generate_appointment_twiml(ai_response, action_needed)
            elif action_needed.get('type') == 'transfer':
                return self._generate_transfer_twiml(ai_response, business_context)
            else:
                return self._generate_response_twiml(ai_response)
                
        except Exception as e:
            logger.error(f"Error processing speech: {e}")
            return self._generate_error_twiml()
    
    def _generate_welcome_message(self, business_context: Dict) -> str:
        """Generar mensaje de bienvenida personalizado"""
        business_name = business_context.get('business_name', 'nuestro negocio')
        business_type = business_context.get('business_type', 'clinic')
        
        messages = {
            'clinic': f"Hola, has llamado a {business_name}. Soy tu asistente virtual y estoy aquí para ayudarte con citas médicas, consultas o información general.",
            'gestoria': f"Buenos días, has contactado con {business_name}. Soy tu asistente virtual especializado en trámites y gestiones administrativas.",
            'property_management': f"Hola, has llamado a {business_name}. Soy tu asistente virtual para administración de fincas y comunidades.",
            'ecommerce': f"Bienvenido a {business_name}. Soy tu asistente virtual y puedo ayudarte con pedidos, productos y atención al cliente."
        }
        
        return messages.get(business_type, f"Hola, has llamado a {business_name}. Soy tu asistente virtual.")
    
    def _analyze_speech_for_actions(self, speech_text: str, ai_response: str) -> Dict:
        """Analizar si la consulta requiere acciones específicas"""
        speech_lower = speech_text.lower()
        
        # Palabras clave para citas
        appointment_keywords = ['cita', 'appointment', 'reservar', 'agendar', 'turno', 'consulta', 'horario disponible']
        
        # Palabras clave para transferencia
        transfer_keywords = ['urgente', 'emergencia', 'hablar con persona', 'representante', 'humano']
        
        if any(keyword in speech_lower for keyword in appointment_keywords):
            return {'type': 'appointment', 'keywords': appointment_keywords}
        elif any(keyword in speech_lower for keyword in transfer_keywords):
            return {'type': 'transfer', 'keywords': transfer_keywords}
        
        return {'type': 'general'}
    
    def _generate_response_twiml(self, response_text: str) -> str:
        """Generar TwiML para respuesta general"""
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">{response_text}</Say>
    <Gather input="speech" timeout="5" speechTimeout="3" action="/api/voice/process_speech" method="POST">
        <Say voice="alice" language="es">¿Hay algo más en lo que pueda ayudarte?</Say>
    </Gather>
    <Say voice="alice" language="es">Gracias por llamar. Que tengas un buen día.</Say>
    <Hangup/>
</Response>"""
    
    def _generate_appointment_twiml(self, response_text: str, action_data: Dict) -> str:
        """Generar TwiML para gestión de citas"""
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">{response_text}</Say>
    <Say voice="alice" language="es">Para agendar tu cita, necesito algunos datos. Te voy a transferir con nuestro sistema de reservas telefónicas.</Say>
    <Gather input="dtmf" numDigits="1" timeout="10" action="/api/voice/appointment_menu" method="POST">
        <Say voice="alice" language="es">Presiona 1 para agendar una nueva cita, 2 para modificar una cita existente, o 3 para hablar con un representante.</Say>
    </Gather>
</Response>"""
    
    def _generate_transfer_twiml(self, response_text: str, business_context: Dict) -> str:
        """Generar TwiML para transferencia a humano"""
        support_phone = business_context.get('support_phone', self.from_phone)
        
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">{response_text}</Say>
    <Say voice="alice" language="es">Te voy a transferir con un representante. Un momento por favor.</Say>
    <Dial timeout="30">
        <Number>{support_phone}</Number>
    </Dial>
    <Say voice="alice" language="es">Lo siento, no hay representantes disponibles en este momento. Por favor, llama más tarde o envía un mensaje por WhatsApp.</Say>
</Response>"""
    
    def _generate_fallback_twiml(self) -> str:
        """Generar TwiML cuando no se entiende el audio"""
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">Lo siento, no he podido entender tu consulta claramente.</Say>
    <Gather input="speech" timeout="5" speechTimeout="3" action="/api/voice/process_speech" method="POST">
        <Say voice="alice" language="es">¿Podrías repetir tu consulta por favor?</Say>
    </Gather>
    <Say voice="alice" language="es">Si continúas teniendo problemas, te recomiendo enviar un mensaje por WhatsApp o visitar nuestro sitio web.</Say>
    <Hangup/>
</Response>"""
    
    def _generate_error_twiml(self) -> str:
        """Generar TwiML para errores"""
        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">Lo siento, estamos experimentando dificultades técnicas. Por favor, intenta llamar más tarde.</Say>
    <Hangup/>
</Response>"""
    
    def _get_business_context_by_phone(self, phone_number: str) -> Dict:
        """Obtener contexto del negocio por número de teléfono"""
        # Esta función debería consultar la base de datos
        # Por ahora devolvemos un contexto por defecto
        return {
            "business_name": "Mi Negocio",
            "business_type": "clinic",
            "services": "Consultas médicas, especialistas",
            "hours": "Lunes a Viernes 9:00-18:00",
            "support_phone": "+34123456789"
        }
    
    def _create_twiml_url(self, message: str, business_context: Dict) -> str:
        """Crear URL del TwiML para llamadas salientes"""
        # Esta función debería generar una URL dinámica
        # Por simplicidad, usamos un endpoint estático
        return f"{Config.FRONTEND_URL}/api/voice/outbound_twiml"
    
    def send_appointment_reminder_call(self, appointment_data: Dict) -> bool:
        """Enviar recordatorio de cita por llamada"""
        try:
            phone = appointment_data.get('customer_phone')
            customer_name = appointment_data.get('customer_name')
            appointment_date = appointment_data.get('appointment_date')
            appointment_time = appointment_data.get('appointment_time')
            service = appointment_data.get('service')
            
            message = f"""Hola {customer_name}, te llamamos para recordarte tu cita programada para {service} 
            el día {appointment_date} a las {appointment_time}. 
            Si necesitas reprogramar o cancelar, presiona 1, de lo contrario presiona 2 para confirmar tu asistencia."""
            
            result = self.make_outbound_call(phone, message, appointment_data)
            return result is not None
            
        except Exception as e:
            logger.error(f"Error sending appointment reminder call: {e}")
            return False
