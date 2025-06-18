
# AIAsistentPro - Dashboard Web

## Descripción
Dashboard web completo para el sistema SaaS de asistente virtual AIAsistentPro, desarrollado en HTML, CSS y JavaScript puro.

## Características

### 🔐 Autenticación
- Sistema de login y registro
- Gestión de sesiones con localStorage
- Validación de formularios

### 📊 Dashboard Principal
- Estadísticas en tiempo real
- Gráficos de actividad
- Métricas de rendimiento

### 📅 Gestión de Citas
- Crear, editar y eliminar citas
- Filtrado por estado
- Vista de tabla responsive

### 💬 Conversaciones WhatsApp
- Monitor de conversaciones
- Estadísticas de respuesta
- Historial de mensajes

### 💳 Gestión de Suscripciones
- Planes disponibles
- Estado de suscripción actual
- Integración con Stripe (preparada)

### ⚙️ Configuración
- Ajustes del negocio
- Configuración de WhatsApp
- Preferencias de usuario

## Estructura de Archivos

```
web/
├── index.html          # Página principal
├── styles.css          # Estilos CSS
├── script.js           # JavaScript principal
└── README.md          # Documentación
```

## Tecnologías Utilizadas

- **HTML5**: Estructura semántica
- **CSS3**: Diseño responsive con Grid y Flexbox
- **JavaScript ES6+**: Funcionalidades dinámicas
- **Chart.js**: Gráficos interactivos
- **Font Awesome**: Iconografía
- **API REST**: Integración con backend Flask

## Características Técnicas

### 🎨 Diseño
- Interfaz moderna y limpia
- Totalmente responsive
- Modo oscuro preparado
- Animaciones suaves

### 🔧 Funcionalidades
- Sistema de notificaciones
- Modales interactivos
- Validación de formularios
- Estado de carga

### 📱 Responsive Design
- Optimizado para desktop
- Adaptado para tablet
- Compatible con móviles

## Integración con API

La aplicación se conecta con el backend Flask a través de:

- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/register` - Registro de usuarios
- `GET /api/appointments/` - Obtener citas
- `POST /api/appointments/` - Crear cita
- `GET /api/payments/plans` - Obtener planes

## Instalación

1. Descargar los archivos
2. Abrir `index.html` en un navegador
3. Configurar la variable `API_BASE_URL` en `script.js`

## Uso

1. **Registro/Login**: Crear cuenta o iniciar sesión
2. **Dashboard**: Ver estadísticas generales
3. **Citas**: Gestionar citas de clientes
4. **Conversaciones**: Monitorear WhatsApp
5. **Suscripción**: Gestionar plan de pago
6. **Configuración**: Ajustar preferencias

## Demo

La aplicación incluye datos de demostración para probar todas las funcionalidades sin conexión al backend.

## Personalización

### Colores
Editar variables CSS en `:root` dentro de `styles.css`:

```css
:root {
    --primary-color: #4f46e5;
    --secondary-color: #64748b;
    --success-color: #10b981;
    /* ... */
}
```

### API URL
Cambiar la URL base en `script.js`:

```javascript
const API_BASE_URL = 'https://tu-api.com/api';
```

## Soporte

Para soporte técnico o consultas sobre implementación, contactar al equipo de desarrollo.
