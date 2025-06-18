import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
from app.config import Config
from app.services.whatsapp_service import WhatsAppService
from app.services.sms_service import SMSService
from app.services.email_service import EmailService
from app.services.voice_service import VoiceService
from app.services.call_service import CallService
import logging
from typing import Dict, Optional, List

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.whatsapp_service = WhatsAppService()
        self.sms_service = SMSService()
        self.email_service = EmailService()
        self.voice_service = VoiceService()
        self.call_service = CallService()

    def send_appointment_reminder(self, appointment_data: Dict) -> bool:
        """Envía recordatorio de cita por WhatsApp"""
        try:
            phone = appointment_data.get('customer_phone')
            customer_name = appointment_data.get('customer_name')
            appointment_date = appointment_data.get('appointment_date')
            appointment_time = appointment_data.get('appointment_time')
            service = appointment_data.get('service')

            message = f"""
🔔 *Recordatorio de Cita*

Hola {customer_name},

Te recordamos tu cita programada para:
📅 Fecha: {appointment_date}
⏰ Hora: {appointment_time}
🏥 Servicio: {service}

Si necesitas reprogramar o cancelar, responde a este mensaje.

¡Te esperamos!
            """.strip()

            return self.whatsapp_service.send_message(phone, message)

        except Exception as e:
            logger.error(f"Error sending appointment reminder: {e}")
            return False

    def send_appointment_confirmation(self, appointment_data: Dict) -> bool:
        """Envía confirmación de cita por WhatsApp"""
        try:
            phone = appointment_data.get('customer_phone')
            customer_name = appointment_data.get('customer_name')
            appointment_date = appointment_data.get('appointment_date')
            appointment_time = appointment_data.get('appointment_time')
            service = appointment_data.get('service')

            message = f"""
✅ *Cita Confirmada*

Hola {customer_name},

Tu cita ha sido confirmada:
📅 Fecha: {appointment_date}
⏰ Hora: {appointment_time}
🏥 Servicio: {service}

Recibirás un recordatorio 24 horas antes.

¡Gracias por elegirnos!
            """.strip()

            return self.whatsapp_service.send_message(phone, message)

        except Exception as e:
            logger.error(f"Error sending appointment confirmation: {e}")
            return False

    def send_welcome_message(self, user_data: Dict) -> bool:
        """Envía mensaje de bienvenida"""
        try:
            phone = user_data.get('phone')
            business_name = user_data.get('business_name')

            if not phone:
                return True  # No phone number provided

            message = f"""
🎉 *¡Bienvenido a AIAsistentPro!*

Hola {business_name},

Tu asistente virtual ya está configurado y listo para ayudarte a:

✨ Gestionar citas automáticamente
📞 Responder consultas de clientes
⏰ Enviar recordatorios
📊 Generar reportes

¡Comienza a automatizar tu negocio hoy mismo!

Accede a tu dashboard: [LINK]
            """.strip()

            return self.whatsapp_service.send_message(phone, message)

        except Exception as e:
            logger.error(f"Error sending welcome message: {e}")
            return False

    def send_email_notification(self, to_email: str, subject: str, message: str) -> bool:
        """Envía notificación por email"""
        try:
            return self.email_service.send_email(to_email, subject, message)

        except Exception as e:
            logger.error(f"Error sending email notification: {e}")
            return False

    def send_call_reminder(self, appointment_data: Dict) -> bool:
        """Enviar recordatorio de cita por llamada telefónica"""
        try:
            return self.call_service.make_appointment_reminder_call(appointment_data)

        except Exception as e:
            logger.error(f"Error sending call reminder: {e}")
            return False

    def make_interactive_call(self, phone: str, business_context: Dict) -> bool:
        """Realizar llamada interactiva con IA"""
        try:
            return self.call_service.make_interactive_call(phone, business_context)

        except Exception as e:
            logger.error(f"Error making interactive call: {e}")
            return False

    def send_multi_channel_notification(self, customer_data: Dict, notification_data: Dict, channels: List[str] = None) -> Dict:
        """Enviar notificación por múltiples canales"""
        if channels is None:
            channels = ['whatsapp', 'sms', 'email']

        results = {}

        # WhatsApp
        if 'whatsapp' in channels and customer_data.get('customer_phone'):
            results['whatsapp'] = self.whatsapp_service.send_message(
                customer_data['customer_phone'], 
                notification_data['whatsapp_message']
            )

        # SMS
        if 'sms' in channels and customer_data.get('customer_phone'):
            results['sms'] = self.sms_service.send_sms(
                customer_data['customer_phone'], 
                notification_data['sms_message']
            )

        # Email
        if 'email' in channels and customer_data.get('customer_email'):
            results['email'] = self.email_service.send_email(
                customer_data['customer_email'],
                notification_data['email_subject'],
                notification_data['email_message']
            )

        # Voice Call
        if 'voice' in channels and customer_data.get('customer_phone'):
            results['voice'] = self.voice_service.make_outbound_call(
                customer_data['customer_phone'],
                notification_data['voice_message'],
                notification_data.get('business_context', {})
            )

        return results

    def send_appointment_reminder_call(self, appointment_data: Dict) -> bool:
        """Enviar recordatorio de cita por llamada telefónica"""
        try:
            return self.voice_service.send_appointment_reminder_call(appointment_data)

        except Exception as e:
            logger.error(f"Error sending appointment reminder call: {e}")
            return False