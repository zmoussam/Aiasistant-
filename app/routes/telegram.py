from flask import Blueprint, request, jsonify
from app.services.openai_service import OpenAIService
from app.services.telegram_service import TelegramService
from app.services.email_service import EmailService
import logging
from datetime import datetime

telegram_bp = Blueprint('telegram', __name__, url_prefix='/api/telegram')
logger = logging.getLogger(__name__)

openai_service = OpenAIService()
telegram_service = TelegramService()
email_service = EmailService()

@telegram_bp.route('/webhook', methods=['POST'])
def telegram_webhook():
    try:
        data = request.get_json()

        if 'message' in data:
            process_message(data['message'])
        elif 'callback_query' in data:
            process_callback_query(data['callback_query'])

        return jsonify({"status": "ok"}), 200

    except Exception as e:
        logger.error(f"Telegram webhook error: {e}")
        return jsonify({"error": "Internal server error"}), 500

def process_message(message):
    try:
        chat_id = message['chat']['id']

        if 'text' in message:
            text = message['text']

            # Comandos especiales
            if text.startswith('/start'):
                send_welcome_message(chat_id, message['from'])
                return
            elif text.startswith('/help'):
                send_help_message(chat_id)
                return
            elif text.startswith('/agendar'):
                send_appointment_options(chat_id)
                return

            # Procesar mensaje con OpenAI
            business_context = get_business_context_telegram(chat_id)
            response = openai_service.generate_response(text, business_context)

            telegram_service.send_message(chat_id, response)

            # Registrar conversación
            log_telegram_conversation(chat_id, text, response)

    except Exception as e:
        logger.error(f"Process Telegram message error: {e}")

def process_callback_query(callback_query):
    try:
        chat_id = callback_query['message']['chat']['id']
        data = callback_query['data']

        if data.startswith('schedule_'):
            service_type = data.replace('schedule_', '')
            handle_appointment_scheduling(chat_id, service_type)
        elif data.startswith('confirm_'):
            appointment_id = data.replace('confirm_', '')
            confirm_appointment(chat_id, appointment_id)

    except Exception as e:
        logger.error(f"Process callback query error: {e}")

def send_welcome_message(chat_id, user):
    welcome_text = f"""
🤖 <b>¡Hola {user.get('first_name', 'Usuario')}!</b>

Soy tu asistente virtual de AIAsistentPro. Estoy aquí para ayudarte con:

✅ Información sobre servicios
✅ Agendar citas
✅ Consultas generales
✅ Soporte 24/7

<b>Comandos disponibles:</b>
/help - Ver ayuda
/agendar - Programar una cita

¿En qué puedo ayudarte hoy?
    """

    keyboard = telegram_service.create_inline_keyboard([
        [
            {"text": "📅 Agendar Cita", "callback_data": "schedule_general"},
            {"text": "ℹ️ Información", "callback_data": "info_services"}
        ],
        [
            {"text": "📞 Contacto", "callback_data": "contact_info"},
            {"text": "❓ Ayuda", "callback_data": "help_menu"}
        ]
    ])

    telegram_service.send_message(chat_id, welcome_text, reply_markup=keyboard)

def send_help_message(chat_id):
    help_text = """
📚 <b>Ayuda - AIAsistentPro</b>

<b>¿Cómo puedo ayudarte?</b>

🔹 <b>Agendar citas:</b> Usa /agendar o simplemente dime "quiero agendar una cita"

🔹 <b>Información:</b> Pregúntame sobre servicios, horarios, precios

🔹 <b>Soporte:</b> Estoy disponible 24/7 para responder tus dudas

🔹 <b>Contacto directo:</b> Si necesitas hablar con un humano, te conectaré

<b>Ejemplos de preguntas:</b>
• "¿Qué servicios ofrecen?"
• "¿Qué servicios ofrecen?"
• "¿Cuáles son sus horarios?"
• "Quiero cancelar mi cita"
• "¿Cuánto cuesta una consulta?"

¡Escríbeme cualquier cosa y te ayudaré!
    """

    telegram_service.send_message(chat_id, help_text)

def send_appointment_options(chat_id):
    keyboard = telegram_service.create_inline_keyboard([
        [
            {"text": "🏥 Consulta Médica", "callback_data": "schedule_medical"},
            {"text": "💼 Consultoría", "callback_data": "schedule_consulting"}
        ],
        [
            {"text": "🏢 Gestoría", "callback_data": "schedule_management"},
            {"text": "🏠 Admin. Fincas", "callback_data": "schedule_property"}
        ],
        [
            {"text": "📋 Ver mis citas", "callback_data": "view_appointments"}
        ]
    ])

    telegram_service.send_message(
        chat_id, 
        "📅 <b>Selecciona el tipo de servicio:</b>", 
        reply_markup=keyboard
    )

def handle_appointment_scheduling(chat_id, service_type):
    service_names = {
        'medical': 'Consulta Médica',
        'consulting': 'Consultoría',
        'management': 'Gestoría',
        'property': 'Administración de Fincas'
    }

    service_name = service_names.get(service_type, 'Servicio')

    text = f"""
📅 <b>Agendar {service_name}</b>

Para programar tu cita, necesito algunos datos:

🔸 Nombre completo
🔸 Teléfono de contacto  
🔸 Email
🔸 Fecha preferida
🔸 Hora preferida
🔸 Motivo de la consulta

Por favor, escríbeme esta información y procesaré tu solicitud inmediatamente.

<b>Ejemplo:</b>
"Juan Pérez, 123456789, juan@email.com, 15 de enero, 10:00 AM, consulta general"
    """

    telegram_service.send_message(chat_id, text)

def get_business_context_telegram(chat_id):
    """Obtener contexto del negocio para Telegram"""
    return {
        "business_name": "AIAsistentPro",
        "services": "Consultas médicas, Consultoría empresarial, Gestoría, Administración de fincas",
        "hours": "Lunes a Viernes 9:00-18:00",
        "phone": "+34 123 456 789",
        "email": "info@aiasistentpro.com",
        "platform": "Telegram"
    }

def log_telegram_conversation(chat_id, message, response):
    """Registrar conversación de Telegram"""
    try:
        # Aquí implementarías el guardado en base de datos
        logger.info(f"Telegram conversation - Chat: {chat_id}, Message: {message}, Response: {response}")
    except Exception as e:
        logger.error(f"Error logging Telegram conversation: {e}")

def confirm_appointment(chat_id, appointment_id):
    """Confirmar cita"""
    text = f"""
✅ <b>Cita Confirmada</b>

Tu cita ha sido confirmada exitosamente.

📧 Recibirás un email de confirmación con todos los detalles.

🔔 Te enviaremos recordatorios automáticos antes de tu cita.

¿Necesitas algo más?
    """

    telegram_service.send_message(chat_id, text)

@telegram_bp.route('/stats', methods=['GET'])
def get_telegram_stats():
    """Obtener estadísticas de Telegram"""
    try:
        # Por ahora devolvemos datos simulados
        return jsonify({
            'conversations': 12,
            'responses': 10,
            'avg_response_time': '2.1 min',
            'status': 'active'
        })
    except Exception as e:
        print(f"Error getting Telegram stats: {e}")
        return jsonify({
            'conversations': 0,
            'responses': 0,
            'avg_response_time': 'N/A',
            'status': 'error'
        })