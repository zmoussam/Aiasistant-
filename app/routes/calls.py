from flask import Blueprint, request, Response, jsonify
from app.services.call_service import CallService
from app.services.openai_service import OpenAIService
from app.utils.database import db
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from datetime import datetime, timedelta
from urllib.parse import unquote

calls_bp = Blueprint('calls', __name__, url_prefix='/api/calls')
logger = logging.getLogger(__name__)

call_service = CallService()
openai_service = OpenAIService()

@calls_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_call_stats():
    """Obtener estadísticas de llamadas del usuario"""
    try:
        user_id = get_jwt_identity()

        # Obtener estadísticas de llamadas desde la base de datos
        # Por ahora simulamos los datos, luego se conectará con la tabla de analytics
        today = datetime.now().date()
        week_ago = today - timedelta(days=7)

        # Simular datos de llamadas (en producción vendría de la BD)
        call_stats = {
            "total_calls": 15,  # Total de llamadas atendidas
            "answered_calls": 12,  # Llamadas respondidas exitosamente
            "missed_calls": 3,   # Llamadas perdidas
            "avg_duration": "2:45",  # Duración promedio
            "success_rate": 80,  # Porcentaje de éxito
            "today_calls": 5,    # Llamadas de hoy
            "week_calls": 15,    # Llamadas de la semana
            "peak_hours": "10:00-12:00",  # Horario pico
        }

        return jsonify({
            "conversations": call_stats["total_calls"],
            "responses": call_stats["answered_calls"],
            "success_rate": call_stats["success_rate"],
            "avg_duration": call_stats["avg_duration"],
            "today_calls": call_stats["today_calls"],
            "details": call_stats
        }), 200

    except Exception as e:
        logger.error(f"Error getting call stats: {e}")
        return jsonify({"error": "Error obteniendo estadísticas"}), 500



from flask import Blueprint, request, Response, jsonify
from app.services.call_service import CallService
from app.services.openai_service import OpenAIService
from app.utils.database import db
import logging
from datetime import datetime
from urllib.parse import unquote

calls_bp = Blueprint('calls', __name__, url_prefix='/api/calls')
logger = logging.getLogger(__name__)

call_service = CallService()
openai_service = OpenAIService()

@calls_bp.route('/stats', methods=['GET'])
def get_calls_stats():
    """Obtener estadísticas de llamadas"""
    try:
        # Por ahora devolvemos datos simulados
        return jsonify({
            'conversations': 5,
            'responses': 4,
            'avg_response_time': '3.5 min',
            'status': 'active'
        })
    except Exception as e:
        print(f"Error getting calls stats: {e}")
        return jsonify({
            'conversations': 0,
            'responses': 0,
            'avg_response_time': 'N/A',
            'status': 'error'
        })

@calls_bp.route('/make-call', methods=['POST'])
def make_call():
    """Endpoint para realizar llamadas"""
    try:
        data = request.get_json()

        if not data or not data.get('phone'):
            return jsonify({"error": "Número de teléfono requerido"}), 400

        phone = data['phone']
        call_type = data.get('type', 'interactive')  # 'interactive', 'reminder', 'custom'

        if call_type == 'reminder' and data.get('appointment_data'):
            result = call_service.make_appointment_reminder_call(data['appointment_data'])
        elif call_type == 'interactive':
            business_context = data.get('business_context', {})
            result = call_service.make_interactive_call(phone, business_context)
        else:
            twiml_url = data.get('twiml_url')
            if not twiml_url:
                return jsonify({"error": "URL TwiML requerida para llamadas personalizadas"}), 400
            result = call_service.make_call(phone, twiml_url)

        if result:
            return jsonify({
                "success": True,
                "call_sid": result.get('sid'),
                "status": result.get('status')
            })
        else:
            return jsonify({"error": "Error al realizar la llamada"}), 500

    except Exception as e:
        logger.error(f"Error in make_call endpoint: {e}")
        return jsonify({"error": "Error interno del servidor"}), 500

@calls_bp.route('/twiml/appointment-reminder', methods=['GET', 'POST'])
def appointment_reminder_twiml():
    """Generar TwiML para recordatorio de citas"""
    try:
        # Obtener parámetros de la URL
        name = request.args.get('name', 'Estimado cliente')
        date = request.args.get('date', 'próximamente')
        time = request.args.get('time', 'a confirmar')
        service = request.args.get('service', 'su cita')
        business = request.args.get('business', 'Nuestro centro')

        # Decodificar parámetros URL
        name = unquote(name)
        service = unquote(service)
        business = unquote(business)

        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">
        Hola {name}. Le llamamos de {business} para recordarle su cita.
    </Say>
    <Pause length="1"/>
    <Say voice="alice" language="es">
        Su cita para {service} está programada para el {date} a las {time}.
    </Say>
    <Pause length="1"/>
    <Gather input="dtmf" numDigits="1" timeout="10" action="/api/calls/appointment-response" method="POST">
        <Say voice="alice" language="es">
            Si puede asistir, presione 1. Si necesita cancelar o reprogramar, presione 2.
        </Say>
    </Gather>
    <Say voice="alice" language="es">
        No recibimos respuesta. Le enviaremos un mensaje de confirmación. Gracias.
    </Say>
</Response>"""

        return Response(twiml, mimetype='application/xml')

    except Exception as e:
        logger.error(f"Error generating appointment reminder TwiML: {e}")
        return Response(call_service._get_fallback_twiml(), mimetype='application/xml')

@calls_bp.route('/twiml/interactive', methods=['GET', 'POST'])
def interactive_twiml():
    """Generar TwiML para llamadas interactivas"""
    try:
        business_name = request.args.get('business_name', 'Nuestro negocio')
        business_type = request.args.get('business_type', 'general')
        services = request.args.get('services', '').split(',') if request.args.get('services') else []
        hours = request.args.get('hours', 'Lunes a Viernes 9:00-18:00')

        business_context = {
            'business_name': unquote(business_name),
            'business_type': business_type,
            'services': [unquote(s.strip()) for s in services if s.strip()],
            'hours': unquote(hours)
        }

        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">
        Hola, gracias por llamar a {business_context['business_name']}. 
        Soy su asistente virtual y estoy aquí para ayudarle.
    </Say>
    <Gather input="speech" timeout="5" action="/api/calls/process-speech" method="POST">
        <Say voice="alice" language="es">
            ¿En qué puedo ayudarle hoy?
        </Say>
    </Gather>
    <Redirect>/api/calls/twiml/menu</Redirect>
</Response>"""

        return Response(twiml, mimetype='application/xml')

    except Exception as e:
        logger.error(f"Error generating interactive TwiML: {e}")
        return Response(call_service._get_fallback_twiml(), mimetype='application/xml')

@calls_bp.route('/process-speech', methods=['POST'])
def process_speech():
    """Procesar entrada de voz del usuario"""
    try:
        speech_result = request.form.get('SpeechResult', '')
        confidence = float(request.form.get('Confidence', 0))

        if confidence < 0.5:
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">
        Disculpe, no pude entender bien. ¿Podría repetir su pregunta?
    </Say>
    <Gather input="speech" timeout="5" action="/api/calls/process-speech" method="POST">
        <Say voice="alice" language="es">
            Escucho atentamente.
        </Say>
    </Gather>
    <Redirect>/api/calls/twiml/menu</Redirect>
</Response>"""
            return Response(twiml, mimetype='application/xml')

        # Obtener contexto del negocio (esto debería venir de la sesión o parámetros)
        business_context = {
            'business_name': 'Nuestro negocio',
            'business_type': 'general',
            'services': ['Consultoría', 'Asesoría'],
            'hours': 'Lunes a Viernes 9:00-18:00'
        }

        # Generar respuesta con OpenAI
        response_twiml = call_service.generate_twiml_response(speech_result, business_context)

        return Response(response_twiml, mimetype='application/xml')

    except Exception as e:
        logger.error(f"Error processing speech: {e}")
        return Response(call_service._get_fallback_twiml(), mimetype='application/xml')

@calls_bp.route('/appointment-response', methods=['POST'])
def appointment_response():
    """Procesar respuesta del recordatorio de cita"""
    try:
        digits = request.form.get('Digits', '')

        if digits == '1':
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">
        Perfecto, hemos confirmado su asistencia. Le esperamos puntualmente. Gracias.
    </Say>
</Response>"""
        elif digits == '2':
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">
        Entendido. Un miembro de nuestro equipo le contactará pronto para reprogramar. Gracias.
    </Say>
</Response>"""
        else:
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">
        Opción no válida. Le enviaremos un mensaje para confirmar su cita. Gracias.
    </Say>
</Response>"""

        return Response(twiml, mimetype='application/xml')

    except Exception as e:
        logger.error(f"Error processing appointment response: {e}")
        return Response(call_service._get_fallback_twiml(), mimetype='application/xml')

@calls_bp.route('/twiml/menu', methods=['GET', 'POST'])
def menu_twiml():
    """Menú principal de opciones"""
    twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather input="dtmf" numDigits="1" timeout="10" action="/api/calls/menu-option" method="POST">
        <Say voice="alice" language="es">
            Para agendar una cita, presione 1.
            Para información sobre servicios, presione 2.
            Para horarios de atención, presione 3.
            Para hablar con un representante, presione 0.
        </Say>
    </Gather>
    <Say voice="alice" language="es">
        Gracias por llamar. Que tenga un buen día.
    </Say>
</Response>"""

    return Response(twiml, mimetype='application/xml')

@calls_bp.route('/menu-option', methods=['POST'])
def menu_option():
    """Procesar selección del menú"""
    try:
        digits = request.form.get('Digits', '')

        if digits == '1':
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">
        Para agendar una cita, le recomendamos usar nuestro WhatsApp o sitio web. 
        Un representante le contactará pronto. Gracias.
    </Say>
</Response>"""
        elif digits == '2':
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">
        Ofrecemos servicios de consultoría, asesoría y gestión. 
        Para información detallada, visite nuestro sitio web o envíenos un WhatsApp.
    </Say>
</Response>"""
        elif digits == '3':
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">
        Nuestro horario de atención es de lunes a viernes de 9:00 a 18:00 horas.
    </Say>
</Response>"""
        elif digits == '0':
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">
        Le transferimos con un representante. Por favor espere en línea.
    </Say>
    <Dial timeout="30" callerId="+1234567890">
        <Number>+1234567890</Number>
    </Dial>
    <Say voice="alice" language="es">
        Lo sentimos, no hay representantes disponibles. Intente más tarde.
    </Say>
</Response>"""
        else:
            return Response("""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Redirect>/api/calls/twiml/menu</Redirect>
</Response>""", mimetype='application/xml')

        return Response(twiml, mimetype='application/xml')

    except Exception as e:
        logger.error(f"Error processing menu option: {e}")
        return Response(call_service._get_fallback_twiml(), mimetype='application/xml')

@calls_bp.route('/status', methods=['POST'])
def call_status():
    """Webhook para estado de llamadas"""
    try:
        call_sid = request.form.get('CallSid')
        call_status = request.form.get('CallStatus')
        duration = request.form.get('CallDuration', 0)

        # Registrar el estado de la llamada
        logger.info(f"Call {call_sid} status: {call_status}, duration: {duration}s")

        # Aquí podrías guardar en base de datos el estado de la llamada

        return jsonify({"status": "received"})

    except Exception as e:
        logger.error(f"Error processing call status: {e}")
        return jsonify({"error": "Error processing status"}), 500