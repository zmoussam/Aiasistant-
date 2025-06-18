import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Database
    SUPABASE_URL = os.getenv('SUPABASE_URL')
    SUPABASE_KEY = os.getenv('SUPABASE_KEY')

    # OpenAI
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

    # Stripe
    STRIPE_PUBLISHABLE_KEY = os.getenv('STRIPE_PUBLISHABLE_KEY')
    STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
    STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')

    # WhatsApp
    WHATSAPP_TOKEN = os.getenv('WHATSAPP_TOKEN')
    WHATSAPP_VERIFY_TOKEN = os.getenv('WHATSAPP_VERIFY_TOKEN')
    WHATSAPP_PHONE_NUMBER_ID = os.getenv('WHATSAPP_PHONE_NUMBER_ID')

    # Telegram
    TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
    TELEGRAM_WEBHOOK_URL = os.getenv('TELEGRAM_WEBHOOK_URL')

    # Email
    SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY')
    FROM_EMAIL = os.getenv('FROM_EMAIL', 'noreply@aiasistentpro.com')

    # Twilio SMS y Voice
    TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID')
    TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN')
    TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER')
    TWILIO_VOICE_WEBHOOK_URL = os.getenv('TWILIO_VOICE_WEBHOOK_URL')
    TWILIO_VOICE_FALLBACK_URL = os.getenv('TWILIO_VOICE_FALLBACK_URL')

    # Base URL for webhooks
    BASE_URL = os.getenv('BASE_URL', 'https://your-repl.replit.app')

    # URLs
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')

    # Application
    SECRET_KEY = os.getenv('SECRET_KEY', 'fallback-secret-key-change-this')
    DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

    # JWT
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-change-this')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(seconds=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES', 3600)))

    # Plans Configuration
    PLANS = {
        'basic': {
            'name': 'Plan Básico',
            'price_monthly': 29.99,
            'max_conversations': 100,
            'max_assistants': 1,
            'has_advanced_analytics': False,
            'has_priority_support': False,
            'has_phone_calls': False
        },
        'premium': {
            'name': 'Plan Premium',
            'price_monthly': 79.99,
            'max_conversations': None,  # Unlimited
            'max_assistants': 5,
            'has_advanced_analytics': True,
            'has_priority_support': True,
            'has_phone_calls': True
        }
    }
import os
from typing import Optional

class Config:
    """Base configuration class"""
    
    # Security
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-change-in-production'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or SECRET_KEY
    
    # Database
    DATABASE_URL = os.environ.get('DATABASE_URL') or 'sqlite:///app.db'
    
    # External APIs
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    WHATSAPP_TOKEN = os.environ.get('WHATSAPP_TOKEN')
    WHATSAPP_VERIFY_TOKEN = os.environ.get('WHATSAPP_VERIFY_TOKEN')
    TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
    
    # Payment
    STRIPE_PUBLIC_KEY = os.environ.get('STRIPE_PUBLIC_KEY')
    STRIPE_SECRET_KEY = os.environ.get('STRIPE_SECRET_KEY')
    STRIPE_WEBHOOK_SECRET = os.environ.get('STRIPE_WEBHOOK_SECRET')
    
    # Email
    SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
    
    # App settings
    DEBUG = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    TESTING = False
    
    # Rate limiting
    RATELIMIT_STORAGE_URL = os.environ.get('REDIS_URL') or 'memory://'
    
    @classmethod
    def validate_config(cls):
        """Validate required configuration"""
        required_vars = []
        
        if not cls.OPENAI_API_KEY:
            required_vars.append('OPENAI_API_KEY')
        
        if not cls.STRIPE_SECRET_KEY:
            required_vars.append('STRIPE_SECRET_KEY')
        
        if required_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(required_vars)}")

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    
    @classmethod
    def validate_config(cls):
        super().validate_config()
        
        if cls.SECRET_KEY == 'dev-secret-change-in-production':
            raise ValueError("SECRET_KEY must be set in production")

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DATABASE_URL = 'sqlite:///:memory:'

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
