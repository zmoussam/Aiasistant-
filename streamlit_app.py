import streamlit as st
import requests
import pandas as pd
from datetime import datetime, date, time
import plotly.express as px

# Configuración de la página
st.set_page_config(
    page_title="AIAsistentPro Dashboard",
    page_icon="🤖",
    layout="wide",
    initial_sidebar_state="expanded"
)

# API Base URL
API_BASE_URL = "http://0.0.0.0:5000/api"

class APIClient:
    def __init__(self, base_url, token=None):
        self.base_url = base_url
        self.token = token
        self.headers = {"Content-Type": "application/json"}
        if token:
            self.headers["Authorization"] = f"Bearer {token}"

    def login(self, email, password):
        try:
            response = requests.post(
                f"{self.base_url}/auth/login",
                json={"email": email, "password": password}
            )
            return response
        except requests.exceptions.RequestException as e:
            st.error(f"Error de conexión: {e}")
            return None

    def register(self, email, password, business_name, phone=None):
        try:
            response = requests.post(
                f"{self.base_url}/auth/register",
                json={
                    "email": email,
                    "password": password,
                    "business_name": business_name,
                    "phone": phone
                }
            )
            return response
        except requests.exceptions.RequestException as e:
            st.error(f"Error de conexión: {e}")
            return None

    def get_appointments(self, page=1, limit=10, status=None):
        try:
            params = {"page": page, "limit": limit}
            if status:
                params["status"] = status

            response = requests.get(
                f"{self.base_url}/appointments/",
                headers=self.headers,
                params=params
            )
            return response
        except requests.exceptions.RequestException as e:
            st.error(f"Error de conexión: {e}")
            return None

    def create_appointment(self, appointment_data):
        try:
            response = requests.post(
                f"{self.base_url}/appointments/",
                headers=self.headers,
                json=appointment_data
            )
            return response
        except requests.exceptions.RequestException as e:
            st.error(f"Error de conexión: {e}")
            return None

    def get_plans(self):
        try:
            response = requests.get(f"{self.base_url}/payments/plans")
            return response
        except requests.exceptions.RequestException as e:
            st.error(f"Error de conexión: {e}")
            return None

def init_session_state():
    if 'logged_in' not in st.session_state:
        st.session_state.logged_in = False
    if 'token' not in st.session_state:
        st.session_state.token = None
    if 'user' not in st.session_state:
        st.session_state.user = None
    if 'api_client' not in st.session_state:
        st.session_state.api_client = APIClient(API_BASE_URL)

def login_page():
    st.title("🤖 AIAsistentPro")
    st.subheader("Iniciar Sesión")

    tab1, tab2 = st.tabs(["Iniciar Sesión", "Registrarse"])

    with tab1:
        with st.form("login_form"):
            email = st.text_input("Email")
            password = st.text_input("Contraseña", type="password")
            submit_button = st.form_submit_button("Iniciar Sesión")

            if submit_button:
                if email and password:
                    response = st.session_state.api_client.login(email, password)

                    if response and response.status_code == 200:
                        data = response.json()
                        st.session_state.logged_in = True
                        st.session_state.token = data['access_token']
                        st.session_state.user = data['user']
                        st.session_state.api_client = APIClient(API_BASE_URL, data['access_token'])
                        st.success("¡Login exitoso!")
                        st.rerun()
                    else:
                        st.error("Credenciales inválidas o error de conexión")
                else:
                    st.error("Por favor completa todos los campos")

    with tab2:
        with st.form("register_form"):
            reg_email = st.text_input("Email", key="reg_email")
            reg_password = st.text_input("Contraseña", type="password", key="reg_password")
            business_name = st.text_input("Nombre del Negocio")
            phone = st.text_input("Teléfono (opcional)")
            register_button = st.form_submit_button("Registrarse")

            if register_button:
                if reg_email and reg_password and business_name:
                    response = st.session_state.api_client.register(
                        reg_email, reg_password, business_name, phone
                    )

                    if response and response.status_code == 201:
                        st.success("¡Registro exitoso! Ahora puedes iniciar sesión.")
                    else:
                        st.error("Error en el registro")
                else:
                    st.error("Por favor completa todos los campos obligatorios")

def dashboard_page():
    st.title(f"📊 Dashboard - {st.session_state.user['business_name']}")

    # Sidebar
    with st.sidebar:
        st.write(f"👋 Bienvenido, {st.session_state.user['email']}")
        st.write(f"📈 Estado: {st.session_state.user['subscription_status']}")

        if st.button("Cerrar Sesión"):
            st.session_state.logged_in = False
            st.session_state.token = None
            st.session_state.user = None
            st.rerun()

    # Tabs principales
    tab1, tab2, tab3 = st.tabs(["📅 Citas", "💬 Conversaciones", "💳 Suscripción"])

    with tab1:
        appointments_tab()

    with tab2:
        conversations_tab()

    with tab3:
        subscription_tab()

def appointments_tab():
    st.header("Gestión de Citas")

    col1, col2 = st.columns([2, 1])

    with col1:
        st.subheader("Lista de Citas")

        # Filtros
        status_filter = st.selectbox(
            "Filtrar por estado:",
            ["Todas", "scheduled", "confirmed", "cancelled", "completed"]
        )

        # Obtener citas
        try:
            response = st.session_state.api_client.get_appointments(
                status=None if status_filter == "Todas" else status_filter
            )

            if response and response.status_code == 200:
                data = response.json()
                appointments = data['appointments']

                if appointments:
                    df = pd.DataFrame(appointments)

                    # Mostrar tabla
                    st.dataframe(
                        df[['customer_name', 'appointment_date', 'appointment_time', 'service', 'status']],
                        use_container_width=True
                    )

                    # Métricas
                    col_a, col_b, col_c = st.columns(3)
                    with col_a:
                        st.metric("Total Citas", len(appointments))
                    with col_b:
                        confirmed = len([a for a in appointments if a['status'] == 'confirmed'])
                        st.metric("Confirmadas", confirmed)
                    with col_c:
                        pending = len([a for a in appointments if a['status'] == 'scheduled'])
                        st.metric("Pendientes", pending)
                else:
                    st.info("No hay citas registradas")
            else:
                st.error("Error obteniendo citas")

        except Exception as e:
            st.error(f"Error de conexión: {e}")

    with col2:
        st.subheader("Nueva Cita")

        with st.form("new_appointment"):
            customer_name = st.text_input("Nombre del Cliente")
            customer_phone = st.text_input("Teléfono")
            customer_email = st.text_input("Email (opcional)")
            appointment_date = st.date_input("Fecha", min_value=date.today())
            appointment_time = st.time_input("Hora")
            service = st.text_input("Servicio")
            notes = st.text_area("Notas (opcional)")

            submit = st.form_submit_button("Crear Cita")

            if submit:
                if customer_name and customer_phone and service:
                    appointment_data = {
                        "customer_name": customer_name,
                        "customer_phone": customer_phone,
                        "customer_email": customer_email if customer_email else None,
                        "appointment_date": appointment_date.isoformat(),
                        "appointment_time": appointment_time.isoformat(),
                        "service": service,
                        "notes": notes if notes else None
                    }

                    try:
                        response = st.session_state.api_client.create_appointment(appointment_data)

                        if response and response.status_code == 201:
                            st.success("¡Cita creada exitosamente!")
                            st.rerun()
                        else:
                            st.error("Error creando la cita")
                    except Exception as e:
                        st.error(f"Error de conexión: {e}")
                else:
                    st.error("Por favor completa todos los campos obligatorios")

def conversations_tab():
    st.header("Conversaciones de WhatsApp")

    # Placeholder para estadísticas de conversaciones
    col1, col2, col3, col4 = st.columns(4)

    with col1:
        st.metric("Conversaciones Hoy", "12", "↑ 3")
    with col2:
        st.metric("Respuestas Automáticas", "28", "↑ 8")
    with col3:
        st.metric("Tiempo Promedio", "2.3 min", "↓ 0.5")
    with col4:
        st.metric("Satisfacción", "94%", "↑ 2%")

    # Gráfico de conversaciones por hora
    st.subheader("Actividad por Hora")

    # Datos de ejemplo
    hours = list(range(0, 24))
    conversations = [2, 1, 0, 0, 1, 3, 8, 12, 15, 18, 22, 20, 18, 16, 14, 12, 15, 18, 16, 12, 8, 6, 4, 3]

    fig = px.line(
        x=hours, 
        y=conversations,
        title="Conversaciones por Hora del Día",
        labels={"x": "Hora", "y": "Número de Conversaciones"}
    )
    st.plotly_chart(fig, use_container_width=True)

    # Últimas conversaciones
    st.subheader("Últimas Conversaciones")

    sample_conversations = [
        {"Teléfono": "+34123456789", "Mensaje": "¿Tienen cita disponible mañana?", "Respuesta": "Sí, tenemos disponibilidad a las 10:00 AM", "Hora": "14:30"},
        {"Teléfono": "+34987654321", "Mensaje": "¿Cuáles son sus servicios?", "Respuesta": "Ofrecemos consultoría empresarial y asesoría legal", "Hora": "13:45"},
        {"Teléfono": "+34555666777", "Mensaje": "Necesito cancelar mi cita", "Respuesta": "Entendido, ¿para qué fecha era su cita?", "Hora": "12:15"}
    ]

    st.dataframe(pd.DataFrame(sample_conversations), use_container_width=True)

def subscription_tab():
    st.header("Gestión de Suscripción")

    current_plan = st.session_state.user.get('subscription_status', 'inactive')

    col1, col2 = st.columns([1, 2])

    with col1:
        st.subheader("Plan Actual")

        if current_plan == 'active':
            st.success("✅ Plan Premium Activo")
            st.write("Renovación: 15 de Enero 2025")
        else:
            st.warning("⚠️ Sin Suscripción Activa")
            st.write("Funcionalidad limitada")

    with col2:
        st.subheader("Planes Disponibles")

        try:
            response = st.session_state.api_client.get_plans()

            if response and response.status_code == 200:
                plans_data = response.json()
                plans = plans_data['plans']

                for plan in plans:
                    with st.container():
                        st.write(f"**{plan['name']}**")
                        st.write(f"${plan['price']}/{plan['interval']}")

                        for feature in plan['features']:
                            st.write(f"• {feature}")

                        if st.button(f"Seleccionar {plan['name']}", key=f"plan_{plan['id']}"):
                            st.info("Funcionalidad de pago en desarrollo...")

                        st.divider()
            else:
                st.error("Error obteniendo planes")

        except Exception as e:
            st.error(f"Error de conexión: {e}")

def main():
    init_session_state()

    if not st.session_state.logged_in:
        login_page()
    else:
        dashboard_page()

if __name__ == "__main__":
    main()