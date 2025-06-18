from flask import Blueprint, request, jsonify
from app.services.openai_service import OpenAIService
from app.services.whatsapp_service import WhatsAppService
from app.utils.database import db
import logging
from datetime import datetime

whatsapp_bp = Blueprint('whatsapp', __name__, url_prefix='/api/whatsapp')
logger = logging.getLogger(__name__)

openai_service = OpenAIService()
whatsapp_service = WhatsAppService()

@whatsapp_bp.route('/webhook', methods=['GET'])
def verify_webhook():
    verify_token = request.args.get('hub.verify_token')
    challenge = request.args.get('hub.challenge')

    response = whatsapp_service.verify_webhook(verify_token, challenge)

    if response != "Error de verificación":
        return response, 200
    else:
        return "Error de verificación", 403

@whatsapp_bp.route('/webhook', methods=['POST'])
def handle_webhook():
    try:
        data = request.get_json()

        # Validar estructura del webhook
        if not data or 'entry' not in data:
            return jsonify({"status": "error", "message": "Invalid webhook data"}), 400

        for entry in data['entry']:
            if 'changes' in entry:
                for change in entry['changes']:
                    if change.get('field') == 'messages':
                        process_message(change['value'])

        return jsonify({"status": "success"}), 200

    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

def process_message(message_data):
    try:
        if 'messages' not in message_data:
            return

        for message in message_data['messages']:
            if message.get('type') == 'text':
                phone_number = message['from']
                text_message = message['text']['body']

                # Obtener contexto del negocio (opcional)
                business_context = get_business_context(phone_number)

                # Generar respuesta con OpenAI
                response = openai_service.generate_response(text_message, business_context)

                # Enviar respuesta
                whatsapp_service.send_message(phone_number, response)

                # Registrar conversación (opcional)
                log_conversation(phone_number, text_message, response)

    except Exception as e:
        logger.error(f"Process message error: {e}")

def get_business_context(phone_number):
    """Obtener contexto del negocio basado en el número de teléfono"""
    try:
        # Implementar lógica para obtener contexto del negocio
        # Por ejemplo, buscar en base de datos según el número
        return {
            "business_name": "Mi Negocio",
            "services": "Consultoría, Asesoría",
            "hours": "Lunes a Viernes 9:00-18:00"
        }
    except Exception as e:
        logger.error(f"Error getting business context: {e}")
        return None

def log_conversation(phone_number, message, response):
    """Registrar conversación en base de datos"""
    try:
        conversation_record = {
            "phone_number": phone_number,
            "user_message": message,
            "bot_response": response,
            "timestamp": datetime.utcnow().isoformat()
        }

        db.get_client().table("conversations").insert(conversation_record).execute()

    except Exception as e:
        logger.error(f"Error logging conversation: {e}")

@whatsapp_bp.route('/stats', methods=['GET'])
def get_whatsapp_stats():
    """Obtener estadísticas de WhatsApp"""
    try:
        # Por ahora devolvemos datos simulados
        return jsonify({
            'conversations': 24,
            'responses': 18,
            'avg_response_time': '1.8 min',
            'status': 'active'
        })
    except Exception as e:
        print(f"Error getting WhatsApp stats: {e}")
        return jsonify({
            'conversations': 0,
            'responses': 0,
            'avg_response_time': 'N/A',
            'status': 'error'
        })