
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import stripe
from app.config import Config
from app.utils.database import db
import logging
from datetime import datetime

payments_bp = Blueprint('payments', __name__, url_prefix='/api/payments')
logger = logging.getLogger(__name__)

stripe.api_key = Config.STRIPE_SECRET_KEY

@payments_bp.route('/plans', methods=['GET'])
def get_plans():
    """Obtener planes de suscripción disponibles"""
    try:
        business_type = request.args.get('business_type', 'clinic')
        
        from app.models.subscription import BUSINESS_PLANS
        
        if business_type not in BUSINESS_PLANS:
            return jsonify({"error": "Tipo de negocio no válido"}), 400
        
        plans_data = BUSINESS_PLANS[business_type]
        plans = []
        
        for plan_id, plan_info in plans_data.items():
            plan = {
                "id": f"{business_type}_{plan_id}",
                "name": plan_info["name"],
                "price": plan_info["price_monthly"],
                "currency": "usd",
                "interval": "month",
                "business_type": business_type,
                "description": plan_info["description"],
                "features": plan_info["includes"],
                "technical_features": plan_info["features"],
                "stripe_price_id": f"price_{business_type}_{plan_id}_monthly"
            }
            plans.append(plan)
        
        return jsonify({"plans": plans, "business_type": business_type}), 200
        
    except Exception as e:
        logger.error(f"Get plans error: {e}")
        return jsonify({"error": "Error obteniendo planes"}), 500

@payments_bp.route('/business-types', methods=['GET'])
def get_business_types():
    """Obtener tipos de negocio disponibles"""
    try:
        business_types = [
            {
                "id": "clinic",
                "name": "Clínica/Consultorio Médico",
                "description": "Gestión de citas médicas, recordatorios de consultas y seguimiento de pacientes",
                "icon": "fas fa-user-md",
                "color": "#3b82f6"
            },
            {
                "id": "management",
                "name": "Gestoría/Despacho",
                "description": "Gestión de trámites administrativos, fiscales y consultoría empresarial",
                "icon": "fas fa-briefcase",
                "color": "#10b981"
            },
            {
                "id": "property_admin",
                "name": "Administración de Fincas",
                "description": "Gestión de propiedades, inquilinos y mantenimiento de inmuebles",
                "icon": "fas fa-building",
                "color": "#f59e0b"
            },
            {
                "id": "ecommerce",
                "name": "Tienda Online/E-commerce",
                "description": "Atención al cliente, seguimiento de pedidos y soporte de ventas",
                "icon": "fas fa-shopping-cart",
                "color": "#8b5cf6"
            }
        ]
        
        return jsonify({"business_types": business_types}), 200
        
    except Exception as e:
        logger.error(f"Get business types error: {e}")
        return jsonify({"error": "Error obteniendo tipos de negocio"}), 500

@payments_bp.route('/create-subscription', methods=['POST'])
@jwt_required()
def create_subscription():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        price_id = data.get('price_id')
        if not price_id:
            return jsonify({"error": "price_id es requerido"}), 400
        
        # Obtener información del usuario
        user_result = db.get_client().table("users").select("*").eq("id", user_id).execute()
        
        if not user_result.data:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        user = user_result.data[0]
        
        # Crear customer en Stripe si no existe
        stripe_customer_id = user.get('stripe_customer_id')
        
        if not stripe_customer_id:
            customer = stripe.Customer.create(
                email=user['email'],
                name=user['business_name']
            )
            stripe_customer_id = customer.id
            
            # Actualizar usuario con customer_id
            db.get_client().table("users").update({
                "stripe_customer_id": stripe_customer_id
            }).eq("id", user_id).execute()
        
        # Crear suscripción
        subscription = stripe.Subscription.create(
            customer=stripe_customer_id,
            items=[{'price': price_id}],
            payment_behavior='default_incomplete',
            payment_settings={'save_default_payment_method': 'on_subscription'},
            expand=['latest_invoice.payment_intent'],
        )
        
        return jsonify({
            "subscription_id": subscription.id,
            "client_secret": subscription.latest_invoice.payment_intent.client_secret
        }), 200
        
    except Exception as e:
        logger.error(f"Create subscription error: {e}")
        return jsonify({"error": "Error creando suscripción"}), 500
