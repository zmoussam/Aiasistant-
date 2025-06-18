from flask import Flask, send_from_directory, request, g
import os
import logging
from app.config import config
from app.middleware.auth import require_auth, generate_token, verify_token
from app.middleware.rate_limit import rate_limit
from app.middleware.logging import setup_logging, log_request, log_response
from app.services.database import db_manager

def create_app(config_name=None):
    """Application factory pattern"""
    app = Flask(__name__, static_folder='web')
    
    # Load configuration
    config_name = config_name or os.environ.get('FLASK_ENV', 'development')
    app.config.from_object(config[config_name])
    
    # Setup logging
    setup_logging(app)
    
    # Initialize database
    try:
        db_manager.init_db()
        app.logger.info("Database initialized successfully")
    except Exception as e:
        app.logger.error(f"Database initialization failed: {e}")
    
    # Request logging middleware
    @app.before_request
    def before_request():
        log_request()
    
    @app.after_request
    def after_request(response):
        return log_response(response)
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        db_healthy = db_manager.health_check()
        status = 'healthy' if db_healthy else 'unhealthy'
        return {'status': status, 'database': db_healthy}, 200 if db_healthy else 503
    
    return app

app = create_app()

@app.route('/')
def index():
    return send_from_directory('web', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('web', filename)

# Training routes
try:
    from app.routes.training import training_bp
    app.register_blueprint(training_bp)
except ImportError:
    print("Warning: Training blueprint not found, skipping...")

# API Mock endpoints for demo
@app.route('/api/auth/login', methods=['POST'])
@rate_limit(limit=5, window=300)  # 5 attempts per 5 minutes
def mock_login():
    try:
        data = request.get_json()
        if not data:
            return {"error": "No se recibieron datos"}, 400

        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return {"error": "Email y contraseña son requeridos"}, 400

        # Para demo, aceptamos cualquier email válido con contraseña específica
        # En producción esto se conectaría a una base de datos real
        if '@' in email and len(password) >= 6:
            return {
                "access_token": f"demo_token_{email}_{password[:3]}",
                "user": {
                    "id": 1,
                    "email": email,
                    "business_name": "Mi Empresa",
                    "phone": "+34123456789",
                    "subscription_status": "active"
                }
            }, 200
        else:
            return {"error": "Credenciales inválidas"}, 401

    except Exception as e:
        return {"error": "Error interno del servidor"}, 500

@app.route('/api/auth/register', methods=['POST'])
def mock_register():
    try:
        data = request.get_json()
        if not data:
            return {"error": "No se recibieron datos"}, 400

        email = data.get('email')
        password = data.get('password')
        business_name = data.get('business_name')

        if not email or not password or not business_name:
            return {"error": "Todos los campos son requeridos"}, 400

        if '@' not in email:
            return {"error": "Email inválido"}, 400

        if len(password) < 6:
            return {"error": "La contraseña debe tener al menos 6 caracteres"}, 400

        # Simular registro exitoso
        return {
            "message": "Usuario registrado exitosamente",
            "access_token": f"demo_token_{email}_{password[:3]}",
            "user": {
                "id": 2,
                "email": email,
                "business_name": business_name,
                "phone": data.get('phone', ''),
                "subscription_status": "trial"
            }
        }, 201

    except Exception as e:
        return {"error": "Error interno del servidor"}, 500

@app.route('/api/appointments/', methods=['GET'])
def mock_appointments():
    return {
        "appointments": [
            {
                "id": 1,
                "customer_name": "Juan Pérez",
                "customer_phone": "+34123456789",
                "appointment_date": "2024-06-15",
                "appointment_time": "10:00",
                "service": "Consultoría",
                "status": "confirmed"
            },
            {
                "id": 2,
                "customer_name": "María García",
                "customer_phone": "+34987654321",
                "appointment_date": "2024-06-16",
                "appointment_time": "14:30",
                "service": "Asesoría Legal",
                "status": "scheduled"
            }
        ],
        "total": 2
    }

@app.route('/api/appointments/', methods=['POST'])
def mock_create_appointment():
    return {"message": "Cita creada exitosamente", "id": 3}, 201

@app.route('/api/payments/plans', methods=['GET'])
def mock_plans():
    return {
        "plans": [
            {
                "id": 1,
                "name": "Plan Básico",
                "price": 29.00,
                "interval": "mes",
                "features": [
                    "Hasta 100 conversaciones/mes",
                    "1 asistente virtual",
                    "Recordatorios básicos",
                    "Soporte por email"
                ]
            },
            {
                "id": 2,
                "name": "Plan Premium",
                "price": 59.00,
                "interval": "mes",
                "features": [
                    "Conversaciones ilimitadas",
                    "Múltiples asistentes virtuales",
                    "Recordatorios avanzados",
                    "Llamadas inteligentes",
                    "Analytics avanzados",
                    "Soporte prioritario"
                ]
            }
        ]
    }

@app.route('/api/contact', methods=['POST'])
@rate_limit(limit=3, window=300)  # 3 messages per 5 minutes
def mock_contact():
    try:
        data = request.get_json()
        if not data:
            return {"error": "No se recibieron datos"}, 400

        # Validar campos requeridos
        required_fields = ['name', 'email', 'subject', 'message']
        for field in required_fields:
            if not data.get(field):
                return {"error": f"El campo {field} es requerido"}, 400

        # Validar email
        if '@' not in data.get('email', ''):
            return {"error": "Email inválido"}, 400

        # Simular procesamiento del mensaje
        return {
            "message": "Mensaje enviado exitosamente",
            "id": f"contact_{data['name'].replace(' ', '_').lower()}_{hash(data['email']) % 10000}"
        }, 200

    except Exception as e:
        return {"error": "Error interno del servidor"}, 500

@app.route('/api/payments/create-payment-intent', methods=['POST'])
def create_payment_intent():
    try:
        data = request.get_json()
        if not data:
            return {"error": "No se recibieron datos"}, 400

        plan_type = data.get('plan_type')
        user_email = data.get('user_email')

        if not plan_type or not user_email:
            return {"error": "plan_type y user_email son requeridos"}, 400

        # Precios de los planes (base sin IVA)
        plan_prices = {
            'basic': 29.00,
            'premium': 59.00,
            'enterprise': 99.00
        }

        # Calcular precio con IVA del 21%
        base_price = plan_prices[plan_type]
        iva = base_price * 0.21
        amount = base_price + iva

        if plan_type not in plan_prices:
            return {"error": "Plan no válido"}, 400

        # Simular creación de payment intent (en producción usarías Stripe)
        payment_intent = {
            "id": f"pi_{plan_type}_{hash(user_email) % 100000}",
            "client_secret": f"pi_{plan_type}_{hash(user_email) % 100000}_secret_demo",
            "amount": int(amount * 100),  # Convertir a centavos
            "currency": "eur",
            "status": "requires_payment_method"
        }

        return {
            "payment_intent": payment_intent,
            "publishable_key": "pk_test_demo_key"  # En producción sería tu clave real
        }, 200

    except Exception as e:
        return {"error": "Error interno del servidor"}, 500

@app.route('/api/payments/confirm-payment', methods=['POST'])
def confirm_payment():
    try:
        data = request.get_json()
        if not data:
            return {"error": "No se recibieron datos"}, 400

        payment_intent_id = data.get('payment_intent_id')
        user_email = data.get('user_email')
        plan_type = data.get('plan_type')

        if not payment_intent_id or not user_email or not plan_type:
            return {"error": "Faltan datos requeridos"}, 400

        # Simular confirmación de pago exitoso
        # En producción aquí verificarías el estado del payment intent con Stripe

        subscription_id = f"sub_{plan_type}_{hash(user_email) % 100000}"

        return {
            "success": True,
            "subscription_id": subscription_id,
            "plan_type": plan_type,
            "status": "active",
            "message": "Pago procesado exitosamente"
        }, 200

    except Exception as e:
        return {"error": "Error interno del servidor"}, 500

@app.route('/api/payments/checkout-session', methods=['POST'])
def create_checkout_session():
    try:
        data = request.get_json()
        if not data:
            return {"error": "No se recibieron datos"}, 400

        plan_type = data.get('plan_type')
        user_email = data.get('user_email')
        success_url = data.get('success_url', request.host_url)
        cancel_url = data.get('cancel_url', request.host_url)

        if not plan_type or not user_email:
            return {"error": "plan_type y user_email son requeridos"}, 400

        # Información de los planes
        plans_info = {
            'basic': {
                'name': 'Plan Básico',
                'price': 35.09,
                'description': 'Perfecto para empezar'
            },
            'premium': {
                'name': 'Plan Premium', 
                'price': 71.39,
                'description': 'Para negocios en crecimiento'
            },
            'enterprise': {
                'name': 'Plan Enterprise',
                'price': 119.79,
                'description': 'Para empresas grandes'
            }
        }

        if plan_type not in plans_info:
            return {"error": "Plan no válido"}, 400

        plan = plans_info[plan_type]

        # Simular creación de sesión de checkout
        session_id = f"cs_{plan_type}_{hash(user_email) % 100000}"
        checkout_url = f"{request.host_url}payment?session_id={session_id}&plan={plan_type}"

        return {
            "checkout_url": checkout_url,
            "session_id": session_id
        }, 200

    except Exception as e:
        return {"error": "Error interno del servidor"}, 500

# WhatsApp Stats endpoint
@app.route('/api/whatsapp/stats', methods=['GET'])
def whatsapp_stats():
    return {
        "conversations": 24,
        "responses": 18,
        "success_rate": 85,
        "avg_response_time": "1.8 min"
    }, 200

# Telegram Stats endpoint  
@app.route('/api/telegram/stats', methods=['GET'])
def telegram_stats():
    return {
        "conversations": 12,
        "responses": 10,
        "success_rate": 90,
        "avg_response_time": "2.1 min"
    }, 200

# Email Stats endpoint
@app.route('/api/email/stats', methods=['GET'])
def email_stats():
    return {
        "conversations": 8,
        "responses": 7,
        "success_rate": 95,
        "avg_response_time": "4.2 min"
    }, 200

# Calls Stats endpoint
@app.route('/api/calls/stats', methods=['GET'])
def calls_stats():
    return {
        "conversations": 5,
        "responses": 4,
        "success_rate": 80,
        "avg_response_time": "3.5 min"
    }, 200

# Registrar blueprints opcionales si están disponibles
    optional_blueprints = [
        ('app.routes.whatsapp', 'whatsapp_bp', '/api/whatsapp'),
        ('app.routes.telegram', 'telegram_bp', '/api/telegram'),
        ('app.routes.calls', 'calls_bp', '/api/calls'),
        ('app.routes.voice', 'voice_bp', '/api/voice')
    ]

    for module_name, blueprint_name, url_prefix in optional_blueprints:
        try:
            module = __import__(module_name, fromlist=[blueprint_name])
            blueprint = getattr(module, blueprint_name)
            app.register_blueprint(blueprint, url_prefix=url_prefix)
            print(f"✓ {blueprint_name} registered successfully")
        except (ImportError, AttributeError) as e:
            print(f"⚠ {blueprint_name} not available: {e}")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)