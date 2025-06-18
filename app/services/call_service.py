
import requests
from app.config import Config
from app.services.openai_service import OpenAIService
import logging
from typing import Dict, Optional
from urllib.parse import urlencode

logger = logging.getLogger(__name__)

class CallService:
    def __init__(self):
        self.account_sid = Config.TWILIO_ACCOUNT_SID
        self.auth_token = Config.TWILIO_AUTH_TOKEN
        self.from_phone = Config.TWILIO_PHONE_NUMBER
        self.base_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}"
        self.openai_service = OpenAIService()
    
    def make_call(self, to_phone: str, twiml_url: str, status_callback_url: str = None) -> Optional[Dict]:
        """Realizar llamada telefónica"""
        try:
            url = f"{self.base_url}/Calls.json"
            
            data = {
                'From': self.from_phone,
                'To': to_phone,
                'Url': twiml_url,
                'Method': 'POST'
            }
            
            if status_callback_url:
                data['StatusCallback'] = status_callback_url
                data['StatusCallbackMethod'] = 'POST'
            
            response = requests.post(
                url,
                auth=(self.account_sid, self.auth_token),
                data=data
            )
            response.raise_for_status()
            
            logger.info(f"Call initiated to {to_phone}")
            return response.json()
            
        except Exception as e:
            logger.error(f"Error making call: {e}")
            return None
    
    def make_appointment_reminder_call(self, appointment_data: Dict) -> Optional[Dict]:
        """Realizar llamada de recordatorio de cita"""
        try:
            phone = appointment_data.get('customer_phone')
            customer_name = appointment_data.get('customer_name')
            appointment_date = appointment_data.get('appointment_date')
            appointment_time = appointment_data.get('appointment_time')
            service = appointment_data.get('service')
            business_name = appointment_data.get('business_name', 'Su cita')
            
            # Crear TwiML dinámico para el recordatorio
            twiml_url = f"{Config.BASE_URL}/api/calls/twiml/appointment-reminder"
            
            # Parámetros para el TwiML
            params = {
                'name': customer_name,
                'date': appointment_date,
                'time': appointment_time,
                'service': service,
                'business': business_name
            }
            
            full_url = f"{twiml_url}?{urlencode(params)}"
            
            return self.make_call(phone, full_url)
            
        except Exception as e:
            logger.error(f"Error making appointment reminder call: {e}")
            return None
    
    def make_interactive_call(self, to_phone: str, business_context: Dict) -> Optional[Dict]:
        """Realizar llamada interactiva con IA"""
        try:
            twiml_url = f"{Config.BASE_URL}/api/calls/twiml/interactive"
            status_callback_url = f"{Config.BASE_URL}/api/calls/status"
            
            # Parámetros del contexto del negocio
            params = {
                'business_name': business_context.get('business_name', 'Nuestro negocio'),
                'business_type': business_context.get('business_type', 'general'),
                'services': ','.join(business_context.get('services', [])),
                'hours': business_context.get('hours', 'Lunes a Viernes 9:00-18:00')
            }
            
            full_url = f"{twiml_url}?{urlencode(params)}"
            
            return self.make_call(to_phone, full_url, status_callback_url)
            
        except Exception as e:
            logger.error(f"Error making interactive call: {e}")
            return None
    
    def generate_twiml_response(self, prompt: str, business_context: Dict = None) -> str:
        """Generar respuesta TwiML usando OpenAI"""
        try:
            # Crear contexto para la llamada
            context = f"""
            Eres un asistente telefónico profesional para {business_context.get('business_name', 'un negocio')}.
            
            Información del negocio:
            - Tipo: {business_context.get('business_type', 'general')}
            - Servicios: {', '.join(business_context.get('services', []))}
            - Horarios: {business_context.get('hours', 'Consultar horarios')}
            
            Instrucciones:
            - Sé profesional y amigable
            - Habla claro y pausado
            - Ofrece ayuda específica
            - Si no puedes resolver algo, ofrece transferir a un humano
            - Mantén las respuestas concisas (máximo 2 frases)
            
            Pregunta del cliente: {prompt}
            
            Responde de manera natural y útil:
            """
            
            response = self.openai_service.generate_response(context, business_context)
            
            # Crear TwiML con la respuesta
            twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">{response}</Say>
    <Gather input="speech" timeout="5" action="/api/calls/process-speech" method="POST">
        <Say voice="alice" language="es">¿En qué más puedo ayudarte?</Say>
    </Gather>
    <Say voice="alice" language="es">Gracias por llamar. Que tenga un buen día.</Say>
</Response>"""
            
            return twiml
            
        except Exception as e:
            logger.error(f"Error generating TwiML: {e}")
            return self._get_fallback_twiml()
    
    def _get_fallback_twiml(self) -> str:
        """TwiML de respaldo en caso de error"""
        return """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">
        Disculpe, estoy teniendo problemas técnicos. 
        Por favor, intente llamar más tarde o envíe un mensaje de WhatsApp.
    </Say>
</Response>"""
    
    def get_call_recording_url(self, call_sid: str) -> Optional[str]:
        """Obtener URL de grabación de llamada"""
        try:
            url = f"{self.base_url}/Calls/{call_sid}/Recordings.json"
            
            response = requests.get(
                url,
                auth=(self.account_sid, self.auth_token)
            )
            response.raise_for_status()
            
            recordings = response.json().get('recordings', [])
            if recordings:
                return f"https://api.twilio.com{recordings[0]['uri'].replace('.json', '.mp3')}"
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting call recording: {e}")
            return None
