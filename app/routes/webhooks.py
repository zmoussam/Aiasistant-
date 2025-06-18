
from flask import Blueprint, jsonify
from app.services.telegram_service import TelegramService
from app.config import Config
import logging

webhooks_bp = Blueprint('webhooks', __name__, url_prefix='/api/webhooks')
logger = logging.getLogger(__name__)

@webhooks_bp.route('/setup', methods=['POST'])
def setup_all_webhooks():
    """Configurar todos los webhooks"""
    results = {}
    
    try:
        # Configurar Telegram
        if Config.TELEGRAM_BOT_TOKEN and Config.TELEGRAM_WEBHOOK_URL:
            telegram_service = TelegramService()
            telegram_result = telegram_service.set_webhook(Config.TELEGRAM_WEBHOOK_URL)
            results['telegram'] = telegram_result
            
        # WhatsApp no necesita configuración adicional de webhook
        # ya que se configura directamente en Facebook Developer Console
        results['whatsapp'] = {'status': 'configured_externally'}
        
        return jsonify({
            "message": "Webhooks configurados exitosamente",
            "results": results
        }), 200
        
    except Exception as e:
        logger.error(f"Error setting up webhooks: {e}")
        return jsonify({"error": str(e)}), 500

@webhooks_bp.route('/status', methods=['GET'])
def webhook_status():
    """Verificar estado de los webhooks"""
    status = {
        "telegram": {
            "configured": bool(Config.TELEGRAM_BOT_TOKEN),
            "webhook_url": Config.TELEGRAM_WEBHOOK_URL
        },
        "whatsapp": {
            "configured": bool(Config.WHATSAPP_TOKEN),
            "verify_token": bool(Config.WHATSAPP_VERIFY_TOKEN)
        },
        "email": {
            "configured": bool(Config.SENDGRID_API_KEY)
        }
    }
    
    return jsonify(status), 200
