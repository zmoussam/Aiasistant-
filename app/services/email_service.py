
import requests
import json
import logging
from app.config import Config

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.api_key = Config.SENDGRID_API_KEY
        self.from_email = Config.FROM_EMAIL
        self.base_url = "https://api.sendgrid.com/v3"
    
    def send_email(self, to_email, subject, html_content, text_content=None):
        """Enviar email"""
        try:
            url = f"{self.base_url}/mail/send"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "personalizations": [{
                    "to": [{"email": to_email}],
                    "subject": subject
                }],
                "from": {"email": self.from_email},
                "content": [
                    {"type": "text/html", "value": html_content}
                ]
            }
            
            if text_content:
                payload["content"].append({
                    "type": "text/plain", 
                    "value": text_content
                })
            
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            logger.info(f"Email sent to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return False
    
    def send_template_email(self, to_email, template_id, dynamic_data=None):
        """Enviar email con plantilla"""
        try:
            url = f"{self.base_url}/mail/send"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "personalizations": [{
                    "to": [{"email": to_email}]
                }],
                "from": {"email": self.from_email},
                "template_id": template_id
            }
            
            if dynamic_data:
                payload["personalizations"][0]["dynamic_template_data"] = dynamic_data
            
            response = requests.post(url, headers=headers, json=payload)
            response.raise_for_status()
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending template email: {e}")
            return False
    
    def send_appointment_confirmation(self, to_email, appointment_data):
        """Enviar confirmación de cita"""
        subject = "Confirmación de Cita - AIAsistentPro"
        
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
                <h1>Confirmación de Cita</h1>
            </div>
            
            <div style="padding: 20px;">
                <h2>¡Hola {appointment_data.get('client_name', 'Cliente')}!</h2>
                
                <p>Tu cita ha sido confirmada con los siguientes detalles:</p>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Fecha:</strong> {appointment_data.get('date', 'N/A')}</p>
                    <p><strong>Hora:</strong> {appointment_data.get('time', 'N/A')}</p>
                    <p><strong>Servicio:</strong> {appointment_data.get('service', 'N/A')}</p>
                    <p><strong>Duración:</strong> {appointment_data.get('duration', '30')} minutos</p>
                </div>
                
                <p>Si necesitas cancelar o reprogramar tu cita, por favor contáctanos con al menos 24 horas de anticipación.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="tel:{appointment_data.get('business_phone', '')}" 
                       style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                        Llamar ahora
                    </a>
                </div>
                
                <p>¡Esperamos verte pronto!</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="font-size: 12px; color: #666;">
                    Este email fue enviado automáticamente por AIAsistentPro
                </p>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)
