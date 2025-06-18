
import requests
import json
import logging
from app.config import Config

logger = logging.getLogger(__name__)

class TelegramService:
    def __init__(self):
        self.token = Config.TELEGRAM_BOT_TOKEN
        self.base_url = f"https://api.telegram.org/bot{self.token}"
    
    def send_message(self, chat_id, text, parse_mode="HTML", reply_markup=None):
        """Enviar mensaje de texto"""
        try:
            url = f"{self.base_url}/sendMessage"
            
            payload = {
                "chat_id": chat_id,
                "text": text,
                "parse_mode": parse_mode
            }
            
            if reply_markup:
                payload["reply_markup"] = json.dumps(reply_markup)
            
            response = requests.post(url, json=payload)
            response.raise_for_status()
            
            logger.info(f"Telegram message sent to {chat_id}")
            return response.json()
            
        except Exception as e:
            logger.error(f"Error sending Telegram message: {e}")
            return None
    
    def send_photo(self, chat_id, photo_url, caption=None):
        """Enviar foto"""
        try:
            url = f"{self.base_url}/sendPhoto"
            
            payload = {
                "chat_id": chat_id,
                "photo": photo_url
            }
            
            if caption:
                payload["caption"] = caption
            
            response = requests.post(url, json=payload)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Error sending Telegram photo: {e}")
            return None
    
    def send_document(self, chat_id, document_url, caption=None):
        """Enviar documento"""
        try:
            url = f"{self.base_url}/sendDocument"
            
            payload = {
                "chat_id": chat_id,
                "document": document_url
            }
            
            if caption:
                payload["caption"] = caption
            
            response = requests.post(url, json=payload)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Error sending Telegram document: {e}")
            return None
    
    def set_webhook(self, webhook_url):
        """Configurar webhook"""
        try:
            url = f"{self.base_url}/setWebhook"
            
            payload = {
                "url": webhook_url,
                "allowed_updates": ["message", "callback_query"]
            }
            
            response = requests.post(url, json=payload)
            response.raise_for_status()
            
            return response.json()
            
        except Exception as e:
            logger.error(f"Error setting Telegram webhook: {e}")
            return None
    
    def create_inline_keyboard(self, buttons):
        """Crear teclado inline"""
        return {
            "inline_keyboard": buttons
        }
    
    def create_reply_keyboard(self, buttons, resize_keyboard=True, one_time_keyboard=False):
        """Crear teclado de respuesta"""
        return {
            "keyboard": buttons,
            "resize_keyboard": resize_keyboard,
            "one_time_keyboard": one_time_keyboard
        }
