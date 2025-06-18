
from flask import Blueprint, request, jsonify, make_response
from app.services.voice_service import VoiceService
from app.services.notification_service import NotificationService
import logging

voice_bp = Blueprint('voice', __name__, url_prefix='/api/voice')
logger = logging.getLogger(__name__)

voice_service = VoiceService()
notification_service = NotificationService()

@voice_bp.route('/incoming', methods=['POST'])
def handle_incoming_call():
    """Manejar llamadas entrantes"""
    try:
        call_data = {
            'From': request.form.get('From'),
            'To': request.form.get('To'),
            'CallSid': request.form.get('CallSid'),
            'CallStatus': request.form.get('CallStatus')
        }
        
        logger.info(f"Incoming call from {call_data['From']} to {call_data['To']}")
        
        twiml_response = voice_service.handle_incoming_call(call_data)
        
        response = make_response(twiml_response)
        response.headers['Content-Type'] = 'application/xml'
        return response
        
    except Exception as e:
        logger.error(f"Error handling incoming call: {e}")
        error_twiml = voice_service._generate_error_twiml()
        response = make_response(error_twiml)
        response.headers['Content-Type'] = 'application/xml'
        return response

@voice_bp.route('/process_speech', methods=['POST'])
def process_speech():
    """Procesar reconocimiento de voz"""
    try:
        speech_data = {
            'SpeechResult': request.form.get('SpeechResult'),
            'From': request.form.get('From'),
            'To': request.form.get('To'),
            'CallSid': request.form.get('CallSid')
        }
        
        logger.info(f"Processing speech: {speech_data['SpeechResult']}")
        
        twiml_response = voice_service.process_speech(speech_data)
        
        response = make_response(twiml_response)
        response.headers['Content-Type'] = 'application/xml'
        return response
        
    except Exception as e:
        logger.error(f"Error processing speech: {e}")
        fallback_twiml = voice_service._generate_fallback_twiml()
        response = make_response(fallback_twiml)
        response.headers['Content-Type'] = 'application/xml'
        return response

@voice_bp.route('/appointment_menu', methods=['POST'])
def appointment_menu():
    """Manejar menú de citas telefónicas"""
    try:
        digits = request.form.get('Digits')
        caller_phone = request.form.get('From')
        
        logger.info(f"Appointment menu selection: {digits}")
        
        if digits == '1':
            # Agendar nueva cita
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">Perfecto, vamos a agendar tu cita. Primero, dime tu nombre completo.</Say>
    <Record timeout="10" transcribe="true" transcribeCallback="/api/voice/collect_appointment_data" action="/api/voice/collect_appointment_data" method="POST"/>
</Response>"""
        elif digits == '2':
            # Modificar cita existente
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">Para modificar tu cita, te voy a transferir con nuestro equipo de atención al cliente.</Say>
    <Dial timeout="30">
        <Number>+34123456789</Number>
    </Dial>
</Response>"""
        elif digits == '3':
            # Hablar con representante
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">Te transfiero con un representante. Un momento por favor.</Say>
    <Dial timeout="30">
        <Number>+34123456789</Number>
    </Dial>
</Response>"""
        else:
            # Opción inválida
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">Opción no válida.</Say>
    <Gather input="dtmf" numDigits="1" timeout="10" action="/api/voice/appointment_menu" method="POST">
        <Say voice="alice" language="es">Por favor, presiona 1 para agendar, 2 para modificar, o 3 para hablar con un representante.</Say>
    </Gather>
</Response>"""
        
        response = make_response(twiml)
        response.headers['Content-Type'] = 'application/xml'
        return response
        
    except Exception as e:
        logger.error(f"Error in appointment menu: {e}")
        return jsonify({"error": "Error interno"}), 500

@voice_bp.route('/collect_appointment_data', methods=['POST'])
def collect_appointment_data():
    """Recopilar datos para agendar cita"""
    try:
        recording_url = request.form.get('RecordingUrl')
        transcription = request.form.get('TranscriptionText', '')
        
        logger.info(f"Appointment data collected: {transcription}")
        
        # Aquí procesaríamos los datos de la cita
        # Por ahora, confirmamos recepción
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">Gracias por la información. Hemos registrado tus datos: {transcription}. 
    Nuestro equipo se pondrá en contacto contigo en breve para confirmar los detalles de tu cita.</Say>
    <Say voice="alice" language="es">Recibirás una confirmación por WhatsApp. ¡Que tengas un buen día!</Say>
    <Hangup/>
</Response>"""
        
        response = make_response(twiml)
        response.headers['Content-Type'] = 'application/xml'
        return response
        
    except Exception as e:
        logger.error(f"Error collecting appointment data: {e}")
        return jsonify({"error": "Error interno"}), 500

@voice_bp.route('/outbound_twiml', methods=['POST'])
def outbound_twiml():
    """TwiML para llamadas salientes"""
    try:
        # Este endpoint se usaría para llamadas salientes automatizadas
        twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">Este es un mensaje automatizado de recordatorio.</Say>
    <Hangup/>
</Response>"""
        
        response = make_response(twiml)
        response.headers['Content-Type'] = 'application/xml'
        return response
        
    except Exception as e:
        logger.error(f"Error in outbound TwiML: {e}")
        return jsonify({"error": "Error interno"}), 500

@voice_bp.route('/make_call', methods=['POST'])
def make_outbound_call():
    """Realizar llamada saliente"""
    try:
        data = request.get_json()
        to_phone = data.get('to_phone')
        message = data.get('message')
        business_context = data.get('business_context', {})
        
        if not to_phone or not message:
            return jsonify({"error": "Teléfono y mensaje son requeridos"}), 400
        
        result = voice_service.make_outbound_call(to_phone, message, business_context)
        
        if result:
            return jsonify({
                "success": True,
                "call_sid": result.get('sid'),
                "message": "Llamada iniciada exitosamente"
            })
        else:
            return jsonify({"error": "Error al iniciar llamada"}), 500
            
    except Exception as e:
        logger.error(f"Error making outbound call: {e}")
        return jsonify({"error": "Error interno"}), 500

@voice_bp.route('/send_reminder_call', methods=['POST'])
def send_reminder_call():
    """Enviar recordatorio de cita por llamada"""
    try:
        data = request.get_json()
        appointment_data = data.get('appointment_data')
        
        if not appointment_data:
            return jsonify({"error": "Datos de cita requeridos"}), 400
        
        success = voice_service.send_appointment_reminder_call(appointment_data)
        
        if success:
            return jsonify({
                "success": True,
                "message": "Recordatorio por llamada enviado exitosamente"
            })
        else:
            return jsonify({"error": "Error al enviar recordatorio"}), 500
            
    except Exception as e:
        logger.error(f"Error sending reminder call: {e}")
        return jsonify({"error": "Error interno"}), 500
from flask import Blueprint, request, Response, jsonify
from app.services.voice_service import VoiceService
from app.services.openai_service import OpenAIService
from app.utils.database import db
import logging
from datetime import datetime

voice_bp = Blueprint('voice', __name__, url_prefix='/api/voice')
logger = logging.getLogger(__name__)

voice_service = VoiceService()
openai_service = OpenAIService()

@voice_bp.route('/incoming', methods=['POST'])
def handle_incoming_call():
    """Manejar llamada entrante de Twilio"""
    try:
        call_data = {
            'From': request.form.get('From'),
            'To': request.form.get('To'),
            'CallSid': request.form.get('CallSid'),
            'CallStatus': request.form.get('CallStatus')
        }
        
        # Generar TwiML para la llamada entrante
        twiml_response = voice_service.handle_incoming_call(call_data)
        
        return Response(twiml_response, mimetype='application/xml')
        
    except Exception as e:
        logger.error(f"Error handling incoming call: {e}")
        return Response(voice_service._generate_error_twiml(), mimetype='application/xml')

@voice_bp.route('/process_speech', methods=['POST'])
def process_speech():
    """Procesar reconocimiento de voz"""
    try:
        speech_data = {
            'SpeechResult': request.form.get('SpeechResult', ''),
            'Confidence': request.form.get('Confidence', '0'),
            'From': request.form.get('From'),
            'To': request.form.get('To'),
            'CallSid': request.form.get('CallSid')
        }
        
        # Procesar el texto reconocido
        twiml_response = voice_service.process_speech(speech_data)
        
        return Response(twiml_response, mimetype='application/xml')
        
    except Exception as e:
        logger.error(f"Error processing speech: {e}")
        return Response(voice_service._generate_error_twiml(), mimetype='application/xml')

@voice_bp.route('/appointment_menu', methods=['POST'])
def appointment_menu():
    """Menú para gestión de citas por voz"""
    try:
        digits = request.form.get('Digits', '')
        
        if digits == '1':
            # Nueva cita
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">
        Para agendar una nueva cita, necesito algunos datos. 
        Le voy a transferir con nuestro sistema de reservas.
    </Say>
    <Gather input="speech" timeout="10" action="/api/voice/collect_appointment_data" method="POST">
        <Say voice="alice" language="es">
            Por favor, dígame su nombre completo.
        </Say>
    </Gather>
</Response>"""
        elif digits == '2':
            # Modificar cita
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">
        Para modificar su cita, le voy a transferir con un representante.
    </Say>
    <Dial timeout="30">
        <Number>+1234567890</Number>
    </Dial>
</Response>"""
        elif digits == '3':
            # Hablar con representante
            twiml = """<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">
        Le transfiero con un representante. Un momento por favor.
    </Say>
    <Dial timeout="30">
        <Number>+1234567890</Number>
    </Dial>
</Response>"""
        else:
            twiml = voice_service._generate_fallback_twiml()
        
        return Response(twiml, mimetype='application/xml')
        
    except Exception as e:
        logger.error(f"Error in appointment menu: {e}")
        return Response(voice_service._generate_error_twiml(), mimetype='application/xml')

@voice_bp.route('/outbound_twiml', methods=['GET', 'POST'])
def outbound_twiml():
    """TwiML para llamadas salientes"""
    try:
        message = request.args.get('message', 'Hola, este es un mensaje automático.')
        
        twiml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice" language="es">{message}</Say>
    <Pause length="1"/>
    <Say voice="alice" language="es">Gracias. Que tenga un buen día.</Say>
</Response>"""
        
        return Response(twiml, mimetype='application/xml')
        
    except Exception as e:
        logger.error(f"Error generating outbound TwiML: {e}")
        return Response(voice_service._generate_error_twiml(), mimetype='application/xml')
