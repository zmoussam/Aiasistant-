
import requests
import logging
from app.config import Config

logger = logging.getLogger(__name__)

class SMSService:
    def __init__(self):
        self.account_sid = Config.TWILIO_ACCOUNT_SID
        self.auth_token = Config.TWILIO_AUTH_TOKEN
        self.from_phone = Config.TWILIO_PHONE_NUMBER
        self.base_url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}"
    
    def send_sms(self, to_phone, message_text):
        """Enviar SMS usando Twilio"""
        try:
            url = f"{self.base_url}/Messages.json"
            
            response = requests.post(
                url,
                auth=(self.account_sid, self.auth_token),
                data={
                    'From': self.from_phone,
                    'To': to_phone,
                    'Body': message_text
                }
            )
            response.raise_for_status()
            
            logger.info(f"SMS sent to {to_phone}")
            return response.json()
            
        except Exception as e:
            logger.error(f"Error sending SMS: {e}")
            return None
    
    def send_appointment_reminder_sms(self, appointment_data):
        """Enviar recordatorio de cita por SMS"""
        try:
            phone = appointment_data.get('customer_phone')
            customer_name = appointment_data.get('customer_name')
            appointment_date = appointment_data.get('appointment_date')
            appointment_time = appointment_data.get('appointment_time')
            service = appointment_data.get('service')
            business_name = appointment_data.get('business_name', 'Su cita')
            
            message = f"""Recordatorio {business_name}: 
{customer_name}, su cita para {service} es el {appointment_date} a las {appointment_time}. 
Para cancelar/reprogramar responda CANCELAR."""
            
            return self.send_sms(phone, message)
            
        except Exception as e:
            logger.error(f"Error sending SMS reminder: {e}")
            return False
