
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.appointment import AppointmentCreate, AppointmentUpdate
from app.utils.database import db
import logging
from pydantic import ValidationError
from datetime import datetime

appointments_bp = Blueprint('appointments', __name__, url_prefix='/api/appointments')
logger = logging.getLogger(__name__)

@appointments_bp.route('/', methods=['GET'])
@jwt_required()
def get_appointments():
    try:
        user_id = get_jwt_identity()
        
        # Parámetros de consulta
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
        status = request.args.get('status')
        
        query = db.get_client().table("appointments").select("*").eq("user_id", user_id)
        
        if status:
            query = query.eq("status", status)
        
        # Paginación
        start = (page - 1) * limit
        end = start + limit - 1
        
        result = query.range(start, end).order("appointment_date", desc=True).execute()
        
        return jsonify({
            "appointments": result.data,
            "total": len(result.data),
            "page": page,
            "limit": limit
        }), 200
        
    except Exception as e:
        logger.error(f"Get appointments error: {e}")
        return jsonify({"error": "Error obteniendo citas"}), 500

@appointments_bp.route('/', methods=['POST'])
@jwt_required()
def create_appointment():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        appointment_data = AppointmentCreate(**data)
        
        # Crear registro de cita
        appointment_record = {
            "user_id": user_id,
            "customer_name": appointment_data.customer_name,
            "customer_phone": appointment_data.customer_phone,
            "customer_email": appointment_data.customer_email,
            "appointment_date": appointment_data.appointment_date.isoformat(),
            "appointment_time": appointment_data.appointment_time.isoformat(),
            "service": appointment_data.service,
            "status": "scheduled",
            "notes": appointment_data.notes
        }
        
        result = db.get_client().table("appointments").insert(appointment_record).execute()
        
        if result.data:
            return jsonify({
                "message": "Cita creada exitosamente",
                "appointment": result.data[0]
            }), 201
        
        return jsonify({"error": "Error creando cita"}), 500
        
    except ValidationError as e:
        return jsonify({"error": "Datos inválidos", "details": e.errors()}), 400
    except Exception as e:
        logger.error(f"Create appointment error: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@appointments_bp.route('/<appointment_id>', methods=['PUT'])
@jwt_required()
def update_appointment(appointment_id):
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        update_data = AppointmentUpdate(**data)
        
        # Verificar que la cita pertenece al usuario
        existing = db.get_client().table("appointments").select("id").eq("id", appointment_id).eq("user_id", user_id).execute()
        
        if not existing.data:
            return jsonify({"error": "Cita no encontrada"}), 404
        
        # Preparar datos de actualización
        update_record = {}
        for field, value in update_data.dict(exclude_unset=True).items():
            if field in ['appointment_date', 'appointment_time'] and value:
                update_record[field] = value.isoformat()
            else:
                update_record[field] = value
        
        if update_record:
            update_record['updated_at'] = datetime.utcnow().isoformat()
            
            result = db.get_client().table("appointments").update(update_record).eq("id", appointment_id).execute()
            
            return jsonify({
                "message": "Cita actualizada exitosamente",
                "appointment": result.data[0] if result.data else None
            }), 200
        
        return jsonify({"error": "No hay datos para actualizar"}), 400
        
    except ValidationError as e:
        return jsonify({"error": "Datos inválidos", "details": e.errors()}), 400
    except Exception as e:
        logger.error(f"Update appointment error: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@appointments_bp.route('/<appointment_id>', methods=['DELETE'])
@jwt_required()
def delete_appointment(appointment_id):
    try:
        user_id = get_jwt_identity()
        
        # Verificar que la cita pertenece al usuario
        result = db.get_client().table("appointments").delete().eq("id", appointment_id).eq("user_id", user_id).execute()
        
        if result.data:
            return jsonify({"message": "Cita eliminada exitosamente"}), 200
        
        return jsonify({"error": "Cita no encontrada"}), 404
        
    except Exception as e:
        logger.error(f"Delete appointment error: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500
