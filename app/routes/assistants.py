
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.assistant import (
    AssistantCreate, AssistantResponse, AssistantUpdate, 
    DEFAULT_BUSINESS_CONTEXTS, AssistantStatus
)
from app.utils.database import db
from app.services.openai_service import OpenAIService
import logging
from pydantic import ValidationError
import uuid

assistants_bp = Blueprint('assistants', __name__, url_prefix='/api/assistants')
logger = logging.getLogger(__name__)
openai_service = OpenAIService()

@assistants_bp.route('/', methods=['GET'])
@jwt_required()
def get_assistants():
    """Obtener todos los asistentes del usuario"""
    try:
        user_id = get_jwt_identity()
        
        result = db.get_client().table("assistants").select("*").eq("user_id", user_id).execute()
        
        assistants = []
        for assistant in result.data:
            assistants.append(AssistantResponse(**assistant))
        
        return jsonify({"assistants": [a.dict() for a in assistants]}), 200
        
    except Exception as e:
        logger.error(f"Get assistants error: {e}")
        return jsonify({"error": "Error obteniendo asistentes"}), 500

@assistants_bp.route('/', methods=['POST'])
@jwt_required()
def create_assistant():
    """Crear nuevo asistente virtual"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        data['user_id'] = user_id
        
        assistant_data = AssistantCreate(**data)
        
        # Obtener información del usuario para contexto
        user_result = db.get_client().table("users").select("*").eq("id", user_id).execute()
        if not user_result.data:
            return jsonify({"error": "Usuario no encontrado"}), 404
        
        user = user_result.data[0]
        business_type = user['business_type']
        
        # Si no se proporciona contexto, usar el predefinido
        if not assistant_data.business_context:
            assistant_data.business_context = DEFAULT_BUSINESS_CONTEXTS.get(business_type, {})
        
        # Crear registro del asistente
        assistant_record = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": assistant_data.name,
            "description": assistant_data.description,
            "personality": assistant_data.personality,
            "business_context": assistant_data.business_context,
            "welcome_message": assistant_data.welcome_message or f"¡Hola! Soy el asistente virtual de {user['business_name']}. ¿En qué puedo ayudarte?",
            "fallback_message": assistant_data.fallback_message or "Disculpa, no entendí tu pregunta. ¿Podrías reformularla?",
            "status": "active",
            "total_conversations": 0
        }
        
        result = db.get_client().table("assistants").insert(assistant_record).execute()
        
        if result.data:
            return jsonify({
                "message": "Asistente creado exitosamente",
                "assistant": result.data[0]
            }), 201
        
        return jsonify({"error": "Error creando asistente"}), 500
        
    except ValidationError as e:
        return jsonify({"error": "Datos inválidos", "details": e.errors()}), 400
    except Exception as e:
        logger.error(f"Create assistant error: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@assistants_bp.route('/<assistant_id>', methods=['PUT'])
@jwt_required()
def update_assistant(assistant_id):
    """Actualizar asistente existente"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        update_data = AssistantUpdate(**data)
        
        # Verificar que el asistente pertenece al usuario
        assistant_result = db.get_client().table("assistants").select("*").eq("id", assistant_id).eq("user_id", user_id).execute()
        
        if not assistant_result.data:
            return jsonify({"error": "Asistente no encontrado"}), 404
        
        # Preparar datos de actualización
        update_fields = {}
        for field, value in update_data.dict().items():
            if value is not None:
                update_fields[field] = value
        
        if update_fields:
            result = db.get_client().table("assistants").update(update_fields).eq("id", assistant_id).execute()
            
            if result.data:
                return jsonify({
                    "message": "Asistente actualizado exitosamente",
                    "assistant": result.data[0]
                }), 200
        
        return jsonify({"error": "No hay cambios para actualizar"}), 400
        
    except ValidationError as e:
        return jsonify({"error": "Datos inválidos", "details": e.errors()}), 400
    except Exception as e:
        logger.error(f"Update assistant error: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@assistants_bp.route('/<assistant_id>', methods=['DELETE'])
@jwt_required()
def delete_assistant(assistant_id):
    """Eliminar asistente"""
    try:
        user_id = get_jwt_identity()
        
        # Verificar que el asistente pertenece al usuario
        assistant_result = db.get_client().table("assistants").select("*").eq("id", assistant_id).eq("user_id", user_id).execute()
        
        if not assistant_result.data:
            return jsonify({"error": "Asistente no encontrado"}), 404
        
        # Eliminar asistente
        db.get_client().table("assistants").delete().eq("id", assistant_id).execute()
        
        return jsonify({"message": "Asistente eliminado exitosamente"}), 200
        
    except Exception as e:
        logger.error(f"Delete assistant error: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@assistants_bp.route('/<assistant_id>/chat', methods=['POST'])
@jwt_required()
def chat_with_assistant(assistant_id):
    """Chatear con el asistente"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        message = data.get('message', '')
        
        if not message:
            return jsonify({"error": "Mensaje requerido"}), 400
        
        # Obtener asistente
        assistant_result = db.get_client().table("assistants").select("*").eq("id", assistant_id).eq("user_id", user_id).execute()
        
        if not assistant_result.data:
            return jsonify({"error": "Asistente no encontrado"}), 404
        
        assistant = assistant_result.data[0]
        
        # Generar respuesta usando OpenAI
        response = openai_service.generate_response(
            message, 
            assistant['business_context'],
            assistant['personality']
        )
        
        # Incrementar contador de conversaciones
        db.get_client().table("assistants").update({
            "total_conversations": assistant['total_conversations'] + 1
        }).eq("id", assistant_id).execute()
        
        return jsonify({
            "response": response,
            "assistant_name": assistant['name']
        }), 200
        
    except Exception as e:
        logger.error(f"Chat with assistant error: {e}")
        return jsonify({"error": "Error procesando mensaje"}), 500
