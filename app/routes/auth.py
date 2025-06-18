
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models.user import UserCreate, UserLogin
from app.utils.database import db
import bcrypt
import logging
from pydantic import ValidationError

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
logger = logging.getLogger(__name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        user_data = UserCreate(**data)
        
        # Verificar si el usuario ya existe
        existing_user = db.get_client().table("users").select("id").eq("email", user_data.email).execute()
        
        if existing_user.data:
            return jsonify({"error": "El usuario ya existe"}), 400
        
        # Hash de la contraseña
        hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt())
        
        # Crear usuario en Supabase
        user_record = {
            "email": user_data.email,
            "password_hash": hashed_password.decode('utf-8'),
            "business_name": user_data.business_name,
            "business_type": user_data.business_type,
            "phone": user_data.phone,
            "website": user_data.website,
            "address": user_data.address,
            "subscription_status": "trial"  # Inicia con trial de 14 días
        }
        
        result = db.get_client().table("users").insert(user_record).execute()
        
        if result.data:
            access_token = create_access_token(identity=result.data[0]['id'])
            return jsonify({
                "message": "Usuario creado exitosamente",
                "access_token": access_token,
                "user": result.data[0]
            }), 201
        
        return jsonify({"error": "Error creando usuario"}), 500
        
    except ValidationError as e:
        return jsonify({"error": "Datos inválidos", "details": e.errors()}), 400
    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        login_data = UserLogin(**data)
        
        # Buscar usuario
        user_result = db.get_client().table("users").select("*").eq("email", login_data.email).execute()
        
        if not user_result.data:
            return jsonify({"error": "Credenciales inválidas"}), 401
        
        user = user_result.data[0]
        
        # Verificar contraseña
        if bcrypt.checkpw(login_data.password.encode('utf-8'), user['password_hash'].encode('utf-8')):
            access_token = create_access_token(identity=user['id'])
            
            # Remover hash de contraseña de la respuesta
            user.pop('password_hash', None)
            
            return jsonify({
                "message": "Login exitoso",
                "access_token": access_token,
                "user": user
            }), 200
        
        return jsonify({"error": "Credenciales inválidas"}), 401
        
    except ValidationError as e:
        return jsonify({"error": "Datos inválidos", "details": e.errors()}), 400
    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@auth_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = get_jwt_identity()
        
        user_result = db.get_client().table("users").select("*").eq("id", user_id).execute()
        
        if not user_result.data:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        user = user_result.data[0]
        user.pop('password_hash', None)
        
        return jsonify({"user": user}), 200
        
    except Exception as e:
        logger.error(f"Profile error: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500
