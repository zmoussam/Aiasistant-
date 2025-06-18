
import requests
import json
import logging
from app.config import Config

logger = logging.getLogger(__name__)

class WhatsAppService:
    def __init__(self):
        self.token = Config.WHATSAPP_TOKEN
        self.verify_token = Config.WHATSAPP_VERIFY_TOKEN
        self.phone_number_id = Config.WHATSAPP_PHONE_NUMBER_ID
        self.base_url = f"https://graph.facebook.com/v18.0/{self.phone_number_id}"
        
    def verify_webhook(self, verify_token, challenge):
        """Verificar webhook de WhatsApp"""
        if verify_token == self.verify_token:
            return challenge
        return "Error de verificación"
    
    def send_message(self, to_phone, message_text):
        """Enviar mensaje de texto"""
        try:
            url = f"{self.base_url}/messages"
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "messaging_product": "whatsapp",
                "to": to_phone,
                "type": "text",
                "text": {"body": message_text}
            }
            
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            logger.info(f"Message sent to {to_phone}")
            return response.json()
            
        except Exception as e:
            logger.error(f"Error sending WhatsApp message: {e}")
            return None
    
    def send_template_message(self, to_phone, template_name, language_code="es", components=None):
        """Enviar mensaje de plantilla"""
        try:
            url = f"{self.base_url}/messages"
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "messaging_product": "whatsapp",
                "to": to_phone,
                "type": "template",
                "template": {
                    "name": template_name,
                    "language": {"code": language_code}
                }
            }
            
            if components:
                payload["template"]["components"] = components
            
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Error sending WhatsApp template: {e}")
            return None
    
    def send_interactive_message(self, to_phone, message_type, header, body, footer, action):
        """Enviar mensaje interactivo (botones, listas)"""
        try:
            url = f"{self.base_url}/messages"
            headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "messaging_product": "whatsapp",
                "to": to_phone,
                "type": "interactive",
                "interactive": {
                    "type": message_type,
                    "header": header,
                    "body": {"text": body},
                    "footer": {"text": footer},
                    "action": action
                }
            }
            
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Error sending interactive message: {e}")
            return None
