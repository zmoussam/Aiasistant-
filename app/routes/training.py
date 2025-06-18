
from flask import Blueprint, request, jsonify
import logging
from app.models.training import TRAINING_TEMPLATES

logger = logging.getLogger(__name__)

training_bp = Blueprint('training', __name__, url_prefix='/api/training')

@training_bp.route('/upload', methods=['POST'])
def upload_training_data():
    """Subir datos de entrenamiento"""
    try:
        data = request.get_json()

        # Aquí procesarías los datos de entrenamiento
        return jsonify({
            "message": "Datos de entrenamiento subidos exitosamente",
            "status": "success"
        }), 200

    except Exception as e:
        logger.error(f"Error uploading training data: {e}")
        return jsonify({"error": str(e)}), 500

@training_bp.route('/status', methods=['GET'])
def get_training_status():
    """Obtener estado del entrenamiento"""
    return jsonify({
        "status": "ready",
        "models_available": ["gpt-3.5-turbo", "gpt-4"],
        "training_data_count": 0
    }), 200

@training_bp.route('/templates/<business_type>', methods=['GET'])
def get_training_templates(business_type):
    """Obtener plantillas de entrenamiento por tipo de negocio"""
    try:
        if business_type not in TRAINING_TEMPLATES:
            return jsonify({"error": "Tipo de negocio no válido"}), 400
        
        templates = TRAINING_TEMPLATES[business_type]
        return jsonify(templates), 200
        
    except Exception as e:
        logger.error(f"Error getting templates: {e}")
        return jsonify({"error": str(e)}), 500

@training_bp.route('/auto-train/<business_type>', methods=['POST'])
def auto_train_assistant(business_type):
    """Entrenar asistente automáticamente con plantillas predefinidas"""
    try:
        if business_type not in TRAINING_TEMPLATES:
            return jsonify({"error": "Tipo de negocio no válido"}), 400
        
        templates = TRAINING_TEMPLATES[business_type]
        training_data = []
        
        # Convertir plantillas en datos de entrenamiento
        for question_data in templates["sample_questions"]:
            training_item = {
                "training_type": "faq",
                "question": question_data["question"],
                "answer": question_data["answer"],
                "category": question_data["category"],
                "keywords": question_data["keywords"]
            }
            training_data.append(training_item)
        
        # Simular guardado en base de datos
        logger.info(f"Auto-training assistant with {len(training_data)} items for {business_type}")
        
        return jsonify({
            "message": f"Asistente entrenado exitosamente para {business_type}",
            "training_items_added": len(training_data),
            "categories": templates["categories"]
        }), 200
        
    except Exception as e:
        logger.error(f"Error auto-training assistant: {e}")
        return jsonify({"error": str(e)}), 500

@training_bp.route('/data', methods=['POST'])
def add_training_data():
    """Agregar datos de entrenamiento manualmente"""
    try:
        data = request.get_json()
        
        # Simular guardado en base de datos
        logger.info(f"Adding training data: {data}")
        
        return jsonify({
            "message": "Entrenamiento agregado exitosamente",
            "id": "training_" + str(hash(data.get('question', '')))
        }), 200
        
    except Exception as e:
        logger.error(f"Error adding training data: {e}")
        return jsonify({"error": str(e)}), 500

@training_bp.route('/data', methods=['GET'])
def get_training_data():
    """Obtener datos de entrenamiento del usuario"""
    try:
        # Por ahora retornar datos de ejemplo
        training_data = []
        
        return jsonify({
            "training_data": training_data,
            "total": len(training_data)
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting training data: {e}")
        return jsonify({"error": str(e)}), 500

@training_bp.route('/bulk-upload', methods=['POST'])
def bulk_upload_training():
    """Carga masiva de datos de entrenamiento"""
    try:
        data = request.get_json()
        training_data = data.get('training_data', [])
        
        # Simular procesamiento masivo
        logger.info(f"Bulk uploading {len(training_data)} training items")
        
        return jsonify({
            "message": "Carga masiva completada",
            "created_count": len(training_data)
        }), 200
        
    except Exception as e:
        logger.error(f"Error in bulk upload: {e}")
        return jsonify({"error": str(e)}), 500

@training_bp.route('/analyze-content', methods=['POST'])
def analyze_content():
    """Analizar contenido y generar sugerencias de entrenamiento"""
    try:
        data = request.get_json()
        content = data.get('content', '')
        business_type = data.get('business_type', '')
        
        # Generar sugerencias básicas basadas en el contenido
        suggestions = [
            {
                "question": "¿Cuáles son sus horarios de atención?",
                "answer": "Nuestros horarios son de lunes a viernes de 9:00 AM a 6:00 PM.",
                "category": "Información General",
                "keywords": ["horarios", "atención", "abierto"]
            },
            {
                "question": "¿Cómo puedo contactarlos?",
                "answer": "Puede contactarnos por teléfono, email o WhatsApp. Todos nuestros canales están disponibles durante horario comercial.",
                "category": "Contacto",
                "keywords": ["contacto", "teléfono", "email", "whatsapp"]
            }
        ]
        
        return jsonify({
            "suggestions": suggestions,
            "analysis_summary": f"Se analizaron {len(content.split())} palabras"
        }), 200
        
    except Exception as e:
        logger.error(f"Error analyzing content: {e}")
        return jsonify({"error": str(e)}), 500
