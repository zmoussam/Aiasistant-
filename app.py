
from flask import Flask, send_from_directory
import os

app = Flask(__name__, static_folder='web')

@app.route('/')
def index():
    return send_from_directory('web', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('web', filename)

# API Mock endpoints for demo
@app.route('/api/auth/login', methods=['POST'])
def mock_login():
    return {
        "access_token": "demo_token_12345",
        "user": {
            "id": 1,
            "email": "demo@example.com",
            "business_name": "Empresa Demo",
            "phone": "+34123456789",
            "subscription_status": "active"
        }
    }

@app.route('/api/auth/register', methods=['POST'])
def mock_register():
    return {"message": "Usuario registrado exitosamente"}, 201

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
                "price": 29.99,
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
                "price": 79.99,
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

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
