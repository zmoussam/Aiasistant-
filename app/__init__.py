from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from app.config import Config
import logging

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Configurar logging
    logging.basicConfig(level=logging.INFO)

    # Extensions
    CORS(app)
    jwt = JWTManager(app)

    # Routes
    from app.routes.auth import auth_bp
    from app.routes.appointments import appointments_bp
    from app.routes.payments import payments_bp
    from app.routes.whatsapp import whatsapp_bp
    from app.routes.telegram import telegram_bp
    from app.routes.assistants import assistants_bp
    from app.routes.webhooks import webhooks_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(appointments_bp)
    app.register_blueprint(payments_bp)
    app.register_blueprint(whatsapp_bp)
    app.register_blueprint(telegram_bp)
    app.register_blueprint(assistants_bp)
    app.register_blueprint(webhooks_bp)

    # Configurar webhooks automáticamente
    with app.app_context():
        setup_webhooks()

    return app

def setup_webhooks():
    """Configurar webhooks automáticamente"""
    try:
        from app.services.telegram_service import TelegramService
        from app.config import Config

        if Config.TELEGRAM_BOT_TOKEN and Config.TELEGRAM_WEBHOOK_URL:
            telegram_service = TelegramService()
            telegram_service.set_webhook(Config.TELEGRAM_WEBHOOK_URL)
            logging.info("Telegram webhook configured successfully")

    except Exception as e:
        logging.error(f"Error setting up webhooks: {e}")