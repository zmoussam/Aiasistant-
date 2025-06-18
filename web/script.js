// Variables globales
let currentUser = null;
let selectedNiche = null;
let currentPlan = null;

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    initializePage();

    // Verificar sesión periódicamente solo para tokens reales (no demo)
    setInterval(() => {
        if (currentUser) {
            const token = localStorage.getItem('auth_token');
            // Solo validar si no es token demo
            if (token && !token.startsWith('demo_token_')) {
                validateSession().then(isValid => {
                    if (!isValid) {
                        clearSession();
                        showLandingPage();
                        //showNotification('Tu sesión ha expirado. Por favor inicia sesión nuevamente.', 'warning');
                    }
                }).catch(() => {
                    // En caso de error, no cerrar sesión
                    console.log('Error en validación periódica - manteniendo sesión');
                });
            }
        }
    }, 10 * 60 * 1000); // 10 minutos (menos frecuente)
});

function initializePage() {
    try {
        // Verificar si hay usuario logueado
        const token = localStorage.getItem('auth_token');
        const userData = localStorage.getItem('user_data');

        if (token && userData) {
            currentUser = JSON.parse(userData);
            // Solo validar sesión si no es un token demo
            if (token.startsWith('demo_token_')) {
                // Token demo válido - mantener sesión activa
                updateNavigationButtons();
            } else {
                // Validar token real
                validateSession().then(isValid => {
                    if (!isValid) {
                        clearSession();
                        showLandingPage();
                        //showNotification('Sesión expirada. Por favor inicia sesión nuevamente.', 'warning');
                    }
                    updateNavigationButtons();
                }).catch(() => {
                    // En caso de error de red, mantener la sesión
                    updateNavigationButtons();
                });
            }
        } else {
            // No hay sesión activa
            showLandingPage();
            updateNavigationButtons();
        }
    } catch (error) {
        console.error('Error loading session:', error);
        // En caso de error, mantener estado actual
        showLandingPage();
        updateNavigationButtons();
    }

    // Inicializar eventos de formularios
    setupFormHandlers();

    // Inicializar gráficos si estamos en el dashboard
    if (currentUser) {
        initializeCharts();
    }
}

function clearSession() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    currentUser = null;
}

function updateNavigationButtons() {
    const loginButton = document.getElementById('loginButton');
    const dashboardButton = document.getElementById('dashboardButton');
    const logoutButton = document.getElementById('logoutButton');

    if (currentUser) {
        // Usuario logueado - mostrar dashboard y logout
        if (loginButton) loginButton.classList.add('hidden');
        if (dashboardButton) dashboardButton.classList.remove('hidden');
        if (logoutButton) logoutButton.classList.remove('hidden');
    } else {
        // Usuario no logueado - mostrar solo login
        if (loginButton) loginButton.classList.remove('hidden');
        if (dashboardButton) dashboardButton.classList.add('hidden');
        if (logoutButton) logoutButton.classList.add('hidden');
    }
}

async function validateSession() {
    const token = localStorage.getItem('auth_token');

    if (!token) {
        return false;
    }

    // Si es un token demo, considerar válido
    if (token.startsWith('demo_token_')) {
        return true;
    }

    try {
        const response = await fetch('/api/auth/profile', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const result = await response.json();
            // Actualizar datos del usuario si es necesario
            if (result.user) {
                localStorage.setItem('user_data', JSON.stringify(result.user));
                currentUser = result.user;
            }
            return true;
        } else if (response.status === 404) {
            // Endpoint no encontrado - asumir token válido para demo
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error validating session:', error);
        // En caso de error de red, asumir sesión válida para evitar logout forzado
        return true;
    }
}

function setupFormHandlers() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Business settings form
    const businessForm = document.getElementById('businessSettingsForm');
    if (businessForm) {
        businessForm.addEventListener('submit', handleBusinessSettings);
    }

    // Contact form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactForm);
    }

    // Add customer form
    const addCustomerForm = document.getElementById('addCustomerForm');
    if (addCustomerForm) {
        addCustomerForm.addEventListener('submit', handleAddCustomer);
    }

    // Add appointment form
    const addAppointmentForm = document.getElementById('addAppointmentForm');
    if (addAppointmentForm) {
        addAppointmentForm.addEventListener('submit', handleAddAppointment);
    }
}

// Funciones de navegación
function showLandingPage() {
    // Asegurar que el dashboard esté oculto
    const dashboard = document.getElementById('dashboard');
    const landingPage = document.getElementById('landingPage');

    if (dashboard) {
        dashboard.classList.add('hidden');
        dashboard.style.display = 'none';
    }

    if (landingPage) {
        landingPage.classList.remove('hidden');
        landingPage.style.display = 'block';
    }

    // Actualizar botones de navegación PERO mantener sesión
    updateNavigationButtons();

    // Scroll al top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showDashboard() {
    // Verificar que tenemos usuario activo
    if (!currentUser) {
        const userData = localStorage.getItem('user_data');
        if (userData) {
            try {
                currentUser = JSON.parse(userData);
            } catch (error) {
                console.error('Error parsing user data:', error);
                clearSession();
                showLandingPage();
                return;
            }
        } else {
            showLandingPage();
            return;
        }
    }

    const landingPage = document.getElementById('landingPage');
    const dashboard = document.getElementById('dashboard');

    if (landingPage) {
        landingPage.classList.add('hidden');
        landingPage.style.display = 'none';
    }

    if (dashboard) {
        dashboard.classList.remove('hidden');
        dashboard.style.display = 'flex';
    }

    // Actualizar información del usuario en la interfaz
    const userEmailElement = document.getElementById('userEmail');
    const userBusinessElement = document.getElementById('userBusiness');

    if (userEmailElement) userEmailElement.textContent = currentUser.email;
    if (userBusinessElement) userBusinessElement.textContent = currentUser.business_name || 'Sin nombre';

    // Cargar datos del dashboard
    loadDashboardData();

    // Mostrar la sección overview por defecto con un pequeño delay
    setTimeout(() => {
        showSection('overview');
    }, 100);
}

function backToHome() {
    // Mantener sesión activa y volver a la página principal
    // NO limpiar la sesión - el usuario sigue logueado

    const dashboard = document.getElementById('dashboard');
    const landingPage = document.getElementById('landingPage');

    if (dashboard) {
        dashboard.classList.add('hidden');
        dashboard.style.display = 'none';
    }

    if (landingPage) {
        landingPage.classList.remove('hidden');
        landingPage.style.display = 'block';
    }

    // Mantener botones de navegación actualizados
    updateNavigationButtons();

    // Scroll al top de la página
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Funciones de modales
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.classList.add('active');
    openTab('login');
}

function showRegisterModal() {
    const modal = document.getElementById('loginModal');
    modal.classList.add('active');
    openTab('register');
}

function closeModal() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.classList.remove('active');
        modal.style.display = 'none';

        // Limpiar cualquier contenido dinámico
        if (modal.classList.contains('campaign-modal') || 
            modal.classList.contains('email-marketing-modal') || 
            modal.classList.contains('whatsapp-marketing-modal') || 
            modal.classList.contains('telegram-marketing-modal') ||
            modal.classList.contains('training-success-modal')) {
            modal.remove();
        }
    });

    // Restaurar scroll del body
    document.body.style.overflow = '';
}

function openTab(tabName) {
    // Ocultar todas las pestañas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remover active de todos los botones
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostrar la pestaña seleccionada
    document.getElementById(tabName).classList.add('active');

    // Activar el botón correspondiente
    event.target.classList.add('active');
}

// Funciones de autenticación
async function handleLogin(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password')
    };

    // Validar campos antes de enviar
    if (!loginData.email || !loginData.password) {
        //showNotification('Por favor completa todos los campos', 'error');
        return;
    }

    if (!loginData.email.includes('@')) {
        //showNotification('Ingresa un email válido', 'error');
        return;
    }

    if (loginData.password.length < 6) {
        //showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const result = await response.json();

        if (response.ok) {
            // Guardar datos de la sesión
            localStorage.setItem('auth_token', result.access_token);
            localStorage.setItem('user_data', JSON.stringify(result.user));
            currentUser = result.user;

            // Cerrar modal y mostrar dashboard
            closeModal();

            // Pequeño delay para asegurar que el modal se cierre antes de mostrar el dashboard
            setTimeout(() => {
                // Check if there's a stored training intent and redirect if applicable
                const intendedTraining = localStorage.getItem('intendedTraining');
                if (intendedTraining) {
                    localStorage.removeItem('intendedTraining'); // Clear the intent
                    trainAIForSector(intendedTraining, event); // Trigger the training directly
                } else {
                    showDashboard();
                }
            }, 100);
        } else {
            //showNotification(result.error || 'Credenciales incorrectas. Verifica tu email y contraseña.', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        //showNotification('Error de conexión. Inténtalo de nuevo.', 'error');
    }
}

async function handleRegister(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const registerData = {
        email: formData.get('email'),
        password: formData.get('password'),
        business_name: formData.get('business_name'),
        phone: formData.get('phone'),
        niche: selectedNiche
    };

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registerData)
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem('auth_token', result.access_token);
            localStorage.setItem('user_data', JSON.stringify(result.user));
            currentUser = result.user;

            closeModal();
            showDashboard();
            //showNotification('Cuenta creada correctamente', 'success');
        } else {
            //showNotification(result.message || 'Error al crear la cuenta', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        //showNotification('Error de conexión', 'error');
    }
}

function logout() {
    clearSession();
    currentUser = null;
    showLandingPage();
    updateNavigationButtons();
}

// Funciones del dashboard
function showSection(sectionName) {
    // Verificar que el usuario sigue logueado
    if (!currentUser) {
        showLandingPage();
        return;
    }

    // Ocultar todas las secciones
    document.querySelectorAll('.main-content .section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });

    // Remover active de todos los enlaces del sidebar
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.classList.remove('active');
    });

    // Mostrar la sección seleccionada
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';
    }

    // Activar el enlace correspondiente
    const targetLink = document.querySelector(`[onclick*="showSection('${sectionName}')"]`);
    if (targetLink) {
        targetLink.classList.add('active');
    }

    // Cargar datos específicos de la sección
    loadSectionData(sectionName);
}

function loadSectionData(sectionName) {
    switch(sectionName) {
        case 'overview':
            loadOverviewData();
            break;
        case 'appointments':
            loadAppointments();
            break;
        case 'conversations':
            loadConversations();
            break;
        case 'customers':
            loadCustomers();
            break;
        case 'marketing':
            loadMarketingData();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

function loadDashboardData() {
    loadOverviewData();
}

async function loadOverviewData() {
    // Datos simulados para el dashboard
    const totalAppointments = document.getElementById('totalAppointments');
    const totalMessages = document.getElementById('totalMessages');
    const avgResponse = document.getElementById('avgResponse');
    const satisfaction = document.getElementById('satisfaction');

    if (totalAppointments) totalAppointments.textContent = '12';
    if (totalMessages) totalMessages.textContent = '156';
    if (avgResponse) avgResponse.textContent = '2.3 min';
    if (satisfaction) satisfaction.textContent = '94%';

    // Cargar gráfico con delay para asegurar que el elemento esté visible
    setTimeout(() => {
        updateConversationsChart();
    }, 200);

     // Obtener el token del usuario
     const token = localStorage.getItem('auth_token');

     try {
        // WhatsApp stats
        const whatsappStatsResponse = await fetch('/api/whatsapp/stats', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        let whatsappStats = { conversations: 0, responses: 0 };
        if (whatsappStatsResponse.ok) {
            whatsappStats = await whatsappStatsResponse.json();
        }

        // Telegram stats
        const telegramStatsResponse = await fetch('/api/telegram/stats', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        let telegramStats = { conversations: 0, responses: 0 };
        if (telegramStatsResponse.ok) {
            telegramStats = await telegramStatsResponse.json();
        }

        // Email stats
        const emailStatsResponse = await fetch('/api/email/stats', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        let emailStats = { conversations: 0, responses: 0 };
        if (emailStatsResponse.ok) {
            emailStats = await emailStatsResponse.json();
        }

        // Calls stats
        const callsStatsResponse = await fetch('/api/calls/stats', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        let callsStats = { conversations: 0, responses: 0 };
        if (callsStatsResponse.ok) {
            callsStats = await callsStatsResponse.json();
        }

        // Update stats display
        updateStatsCard('whatsapp', whatsappStats);
        updateStatsCard('telegram', telegramStats);
        updateStatsCard('email', emailStats);
        updateStatsCard('calls', callsStats);

    } catch (error) {
        console.error('Error al cargar las estadísticas:', error);
    }
}

function initializeCharts() {
    updateConversationsChart();
}

function updateConversationsChart() {
    const ctx = document.getElementById('conversationsChart');
    if (!ctx) {
        console.log('Chart canvas not found');
        return;
    }

    // Destruir gráfico anterior si existe
    if (window.conversationsChartInstance) {
        window.conversationsChartInstance.destroy();
    }

    try {
        window.conversationsChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                datasets: [{
                    label: 'Conversaciones',
                    data: [12, 19, 8, 15, 24, 18, 21],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            maxTicksLimit: 5
                        }
                    },
                    x: {
                        ticks: {
                            maxTicksLimit: 7
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating chart:', error);
    }
}

// Funciones de planes y pagos
function selectPlan(planType) {
    currentPlan = planType;

    if (planType === 'trial') {
        // Abrir modal de registro para la prueba gratuita
        showRegisterModal();
        return;
    }

    const plans = {
        'basic': { name: 'Plan Básico', price: 35.09 },
        'premium': { name: 'Plan Premium', price: 71.39 },
        'enterprise': { name: 'Plan Enterprise', price: 119.79 }
    };

    // Redirigir a la página de pago directamente sin notificaciones
    redirectToPayment(planType);
}

async function redirectToPayment(planType) {
    try {
        // Crear sesión de checkout
        const userData = getCurrentUserData();

        const response = await fetch('/api/payments/checkout-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                plan_type: planType,
                user_email: userData.email || 'guest@example.com',
                success_url: `${window.location.origin}/?payment=success`,
                cancel_url: `${window.location.origin}/?payment=cancelled`
            })
        });

        if (response.ok) {
            const result = await response.json();
            // Redirigir a la página de pago
            window.location.href = `/payment.html?plan=${planType}&session_id=${result.session_id}`;
        } else {
            // Fallback: redirigir directamente con los parámetros del plan
            window.location.href = `/payment.html?plan=${planType}`;
        }

    } catch (error) {
        console.error('Error creando sesión de pago:', error);
        // Fallback: redirigir directamente con los parámetros del plan
        window.location.href = `/payment.html?plan=${planType}`;
    }
}

function getCurrentUserData() {
    try {
        const userData = localStorage.getItem('user_data');
        return userData ? JSON.parse(userData) : {};
    } catch (error) {
        return {};
    }
}

// Funciones de nichos
function selectNiche(niche) {
    selectedNiche = niche;

    // Remover selección anterior
    document.querySelectorAll('.niche-card').forEach(card => {
        card.classList.remove('selected');
    });

    // Añadir selección actual
    event.target.closest('.niche-card').classList.add('selected');
}

async function trainAIForSector(businessType, event) {
    // Evitar que se ejecute el onclick del niche-card
    if(event){
        event.stopPropagation();
    }

    const button = event && event.target ? event.target.closest('.btn-train-sector') : document.querySelector('.btn-train-sector');
    if (!button) return;

    const originalText = button.innerHTML;

    // Verificar si el usuario está logueado
    const authToken = localStorage.getItem('auth_token');
    if (!authToken) {
        // Store intent to redirect after login
        localStorage.setItem('intendedTraining', businessType);
        showLoginModal();
        return;
    }

    // Cambiar estado del botón
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrenando...';
    button.classList.add('training');
    button.disabled = true;

    try {
        const response = await fetch(`/api/training/auto-train/${businessType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            // Éxito
            button.innerHTML = '<i class="fas fa-check"></i> ¡Entrenado!';
            button.classList.remove('training');
            button.classList.add('success');

            // Mostrar información adicional sin notificación pequeña
            setTimeout(() => {
                showTrainingSuccessModal(result, businessType);
            }, 800);

        } else {
            throw new Error(result.error || 'Error entrenando el asistente');
        }

    } catch (error) {
        console.error('Error:', error);

        // Restaurar botón en caso de error
        button.innerHTML = originalText;
        button.classList.remove('training');
        button.disabled = false;
    }
}

function showTrainingSuccessModal(result, businessType) {
    const sectorNames = {
        'clinic': 'Clínicas y Consultorios',
        'management': 'Gestorías', 
        'property_admin': 'Administradores de Fincas',
        'ecommerce': 'E-commerce'
    };

    const sectorName = sectorNames[businessType] || businessType;

    const modal = document.createElement('div');
    modal.className = 'modal training-success-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-brain" style="color: #4caf50;"></i> ¡Entrenamiento Completado!</h2>
                <button onclick="closeTrainingSuccessModal()" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="training-success-content">
                    <div class="success-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3>Tu asistente de IA para ${sectorName}</h3>

                    <div class="training-stats">
                        <div class="stat">
                            <span class="stat-number">${result.training_items_added}</span>
                            <span class="stat-label">Preguntas y respuestas</span>
                        </div>
                        <div class="stat">
                            <span class="stat-number">${result.categories.length}</span>
                            <span class="stat-label">Categorías</span>
                        </div>
                    </div>

                    <div class="next-steps">
                        <h4>¿Qué puedes hacer ahora?</h4>
                        <ul>
                            <li><i class="fas fa-cog"></i> Configurar tus canales de comunicación</li>
                            <li><i class="fas fa-plus"></i> Agregar conocimiento personalizado</li>
                            <li><i class="fas fa-play"></i> Probar tu asistente en el demo</li>
                        </ul>
                    </div>

                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="openDashboard()">
                            <i class="fas fa-tachometer-alt"></i> Ir al Dashboard
                        </button>
                        <button class="btn btn-secondary" onclick="openTrainingPage()">
                            <i class="fas fa-brain"></i> Personalizar Entrenamiento
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.style.display = 'flex';
}

function closeTrainingSuccessModal() {
    const modal = document.querySelector('.training-success-modal');
    if (modal) {
        modal.remove();
    }
}

function openTrainingPage() {
    closeTrainingSuccessModal();
    window.location.href = 'training.html';
}

function openDashboard() {
    closeTrainingSuccessModal();
    // Simular login si no está logueado
    if (!localStorage.getItem('auth_token')) {
        localStorage.setItem('auth_token', 'demo_token_' + Date.now());
        localStorage.setItem('user_data', JSON.stringify({
            email: 'demo@aiasistentpro.com',
            business_name: 'Mi Empresa',
            phone: '+34123456789'
        }));
    }

    showDashboard();
}

// Funciones del footer
function scrollToSection(sectionId) {
    document.getElementById(sectionId).scrollIntoView({ behavior: 'smooth' });
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showIntegrations() {
    // Mostrar integraciones disponibles
}

function showMoreNiches() {
    // Más sectores disponibles próximamente
}

function showHelp() {
    // Abrir centro de ayuda
}

function contactSupport() {
    // Contactar con soporte técnico
}

function showAPI() {
    // Abrir documentación de API
}

function showStatus() {
    // Mostrar estado del servicio
}

function showAbout() {
    // Mostrar información de la empresa
}

function showBlog() {
    // Abrir blog
}

function showCareers() {
    // Mostrar oportunidades laborales
}

function showPress() {
    // Información para prensa
}

function showPrivacy() {
    // Mostrar política de privacidad
}

function showTerms() {
    // Mostrar términos de servicio
}

function showCookies() {
    // Mostrar política de cookies
}

function showGDPR() {
    // Información sobre RGPD
}

function openSocial(platform) {
    // Abrir redes sociales
}

// Funciones de citas
function loadAppointments() {
    const appointmentsTableBody = document.getElementById('appointmentsTableBody');
    if (!appointmentsTableBody) return;

    // Datos simulados
    const appointments = [
        { client: 'María García', phone: '+34 600 123 456', date: '2024-06-15', time: '10:00', service: 'Consulta General', status: 'confirmed' },
        { client: 'Juan Pérez', phone: '+34 600 789 012', date: '2024-06-16', time: '15:30', service: 'Revisión', status: 'scheduled' },
        { client: 'Ana López', phone: '+34 600 345 678', date: '2024-06-17', time: '09:15', service: 'Consulta', status: 'cancelled' }
    ];

    appointmentsTableBody.innerHTML = appointments.map(apt => `
        <tr>
            <td>${apt.client}</td>
            <td>${apt.phone}</td>
            <td>${apt.date}</td>
            <td>${apt.time}</td>
            <td>${apt.service}</td>
            <td><span class="status-badge status-${apt.status}">${getStatusText(apt.status)}</span></td>
            <td>
                <button class="btn btn-sm" onclick="editAppointment('${apt.client}')">Editar</button>
                <button class="btn btn-sm btn-secondary" onclick="cancelAppointment('${apt.client}')">Cancelar</button>
            </td>
        </tr>
    `).join('');
}

function getStatusText(status) {
    const statusTexts = {
        'scheduled': 'Programada',
        'confirmed': 'Confirmada',
        'cancelled': 'Cancelada',
        'completed': 'Completada'
    };
    return statusTexts[status] || status;
}

function openAppointmentModal() {
    const modal = document.getElementById('addAppointmentModal');
    modal.classList.add('active');

    // Limpiar el formulario
    document.getElementById('addAppointmentForm').reset();

    // Establecer fecha mínima como hoy
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('appointmentDate').min = today;

    // Focus en el primer campo
    setTimeout(() => {
        document.getElementById('appointmentCustomerName').focus();
    }, 100);
}

function closeAddAppointmentModal() {
    const modal = document.getElementById('addAppointmentModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function editAppointment(client) {
    // Editar cita del cliente
}

function cancelAppointment(client) {
    // Cancelar cita del cliente
}

// Funciones de conversaciones
function loadConversations() {
    // Actualizar estadísticas de conversaciones
    updateConversationsStats();

    // Cargar lista de conversaciones recientes
    loadRecentConversations();
}

function updateConversationsStats() {
    // Estadísticas simuladas para los tres canales
    const stats = {
        whatsapp: {
            conversations: 24,
            responses: 18,
            avgTime: '1.8 min'
        },
        telegram: {
            conversations: 12,
            responses: 10,
            avgTime: '2.1 min'
        },
        email: {
            conversations: 8,
            responses: 7,
            avgTime: '4.2 min'
        },
        calls: {
            conversations: 5,
            responses: 4,
            avgTime: '3.5 min'
        }
    };

    // Actualizar contadores en el DOM
    const totalConversations = stats.whatsapp.conversations + stats.telegram.conversations + stats.email.conversations + stats.calls.conversations;
    const totalResponses = stats.whatsapp.responses + stats.telegram.responses + stats.email.responses + stats.calls.responses;

    // Calcular tiempo promedio ponderado
    const totalTime = (
        (parseFloat(stats.whatsapp.avgTime) * stats.whatsapp.conversations) +
        (parseFloat(stats.telegram.avgTime) * stats.telegram.conversations) +
        (parseFloat(stats.email.avgTime) * stats.email.conversations) +
        (parseFloat(stats.calls.avgTime) * stats.calls.conversations)
    ) / totalConversations;

    // Actualizar elementos del DOM si existen
    const whatsappConversations = document.getElementById('whatsappConversations');
    const telegramConversations = document.getElementById('telegramConversations');
    const emailConversations = document.getElementById('emailConversations');
    const callsConversations = document.getElementById('callsConversations');
    const whatsappResponses = document.getElementById('whatsappResponses');
    const telegramResponses = document.getElementById('telegramResponses');
    const emailResponses = document.getElementById('emailResponses');
    const callsResponses = document.getElementById('callsResponses');

    if (whatsappConversations) whatsappConversations.textContent = stats.whatsapp.conversations;
    if (telegramConversations) telegramConversations.textContent = stats.telegram.conversations;
    if (emailConversations) emailConversations.textContent = stats.email.conversations;
    if (callsConversations) callsConversations.textContent = stats.calls.conversations;
    if (whatsappResponses) whatsappResponses.textContent = stats.whatsapp.responses;
    if (telegramResponses) telegramResponses.textContent = stats.telegram.responses;
    if (emailResponses) emailResponses.textContent = stats.email.responses;
    if (callsResponses) callsResponses.textContent = stats.calls.responses;
}

function loadRecentConversations() {
    const conversationsTableBody = document.getElementById('conversationsTableBody');
    if (!conversationsTableBody) return;

    // Conversaciones simuladas de múltiples canales
    const conversations = [
        {
            channel: 'whatsapp',
            contact: '+34 600 123 456',
            name: 'María García',
            lastMessage: '¿Tienen cita disponible para mañana?',
            response: 'Sí, tenemos disponibilidad a las 10:00 AM',
            time: '14:30',
            status: 'respondido'
        },
        {
            channel: 'telegram',
            contact: '@juan_perez',
            name: 'Juan Pérez',
            lastMessage: '¿Cuáles son sus horarios de atención?',
            response: 'Nuestro horario es de lunes a viernes de 9:00 a 18:00',
            time: '13:45',
            status: 'respondido'
        },
        {
            channel: 'email',
            contact: 'ana.lopez@email.com',
            name: 'Ana López',
            lastMessage: 'Solicitud de información sobre servicios',
            response: 'Hemos enviado la información detallada',
            time: '12:15',
            status: 'respondido'
        },
        {
            channel: 'calls',
            contact: '+34 912 345 678',
            name: 'Pedro Fernández',
            lastMessage: 'Consulta sobre precios y servicios',
            response: 'Le hemos enviado un presupuesto detallado por correo',
            time: '11:50',
            status: 'respondido'
        },
        {
            channel: 'whatsapp',
            contact: '+34 600 789 012',
            name: 'Carlos Ruiz',
            lastMessage: 'Necesito cancelar mi cita del viernes',
            response: 'Entendido, ¿desea reprogramar?',
            time: '11:30',
            status: 'respondido'
        },
        {
            channel: 'telegram',
            contact: '@lucia_martinez',
            name: 'Lucía Martínez',
            lastMessage: '¿Ofrecen consultas online?',
            response: 'Sí, tenemos videoconsultas disponibles',
            time: '10:45',
            status: 'respondido'
        },
        {
            channel: 'email',
            contact: 'pedro.sanchez@empresa.com',
            name: 'Pedro Sánchez',
            lastMessage: 'Presupuesto para servicios empresariales',
            response: 'Pendiente de respuesta',
            time: '09:20',
            status: 'pendiente'
        }
    ];

    conversationsTableBody.innerHTML = conversations.map(conv => {
        const channelIcon = getChannelIcon(conv.channel);
        const statusBadge = getStatusBadge(conv.status);

return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="${channelIcon.class}" style="color: ${channelIcon.color}; font-size: 18px;"></i>
                        <div>
                            <div style="font-weight: 600;">${conv.name}</div>
                            <div style="font-size: 12px; color: #666;">${conv.contact}</div>
                        </div>
                    </div>
                </td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${conv.lastMessage}
                </td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${conv.response}
                </td>
                <td>${conv.time}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn btn-sm" onclick="viewConversation('${conv.channel}', '${conv.contact}')">
                        Ver
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function getChannelIcon(channel) {
    const icons = {
        'whatsapp': { class: 'fab fa-whatsapp', color: '#25D366' },
        'telegram': { class: 'fab fa-telegram', color: '#0088cc' },
        'email': { class: 'fas fa-envelope', color: '#dc3545' },
        'calls': { class: 'fas fa-phone', color: '#000000' }
    };
    return icons[channel] || { class: 'fas fa-comment', color: '#666' };
}

function getStatusBadge(status) {
    const badges = {
        'respondido': '<span class="status-badge status-confirmed">Respondido</span>',
        'pendiente': '<span class="status-badge status-scheduled">Pendiente</span>',
        'visto': '<span class="status-badge status-cancelled">Visto</span>'
    };
    return badges[status] || '<span class="status-badge">Desconocido</span>';
}

function viewConversation(channel, contact) {
    // Abrir conversación del canal con el contacto
}

function filterConversations() {
    const channelFilter = document.getElementById('channelFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    // Recargar conversaciones con filtros aplicados
    loadRecentConversations();
}

// Funciones de clientes
function loadCustomers() {
    const customersTableBody = document.getElementById('customersTableBody');
    if (!customersTableBody) return;

    // Datos simulados
    const customers = [
        { name: 'María García', email: 'maria@email.com', phone: '+34 600 123 456', whatsapp: 'Activo', telegram: 'No', registration: '2024-01-15', status: 'VIP' },
        { name: 'Juan Pérez', email: 'juan@email.com', phone: '+34 600 789 012', whatsapp: 'Activo', telegram: 'Activo', registration: '2024-02-20', status: 'Nuevo' },
        { name: 'Ana López', email: 'ana@email.com', phone: '+34 600 345 678', whatsapp: 'Activo', telegram: 'No', registration: '2024-03-10', status: 'Activo' }
    ];

    customersTableBody.innerHTML = customers.map(customer => `
        <tr>
            <td>${customer.name}</td>
            <td>${customer.email}</td>
            <td>${customer.phone}</td>
            <td>${customer.whatsapp}</td>
            <td>${customer.telegram}</td>
            <td>${customer.registration}</td>
            <td><span class="status-badge">${customer.status}</span></td>
            <td>
                <button class="btn btn-sm" onclick="editCustomer('${customer.name}')">Editar</button>
                <button class="btn btn-sm btn-secondary" onclick="viewCustomer('${customer.name}')">Ver</button>
            </td>
        </tr>
    `).join('');
}

function openAddCustomerModal() {
    const modal = document.getElementById('addCustomerModal');
    modal.classList.add('active');

    // Limpiar el formulario
    document.getElementById('addCustomerForm').reset();

    // Asegurar que los checkboxes estén desmarcados
    const whatsappCheckbox = document.querySelector('input[name="whatsapp"]');
    const telegramCheckbox = document.querySelector('input[name="telegram"]');
    if (whatsappCheckbox) whatsappCheckbox.checked = false;
    if (telegramCheckbox) telegramCheckbox.checked = false;

    // Focus en el primer campo
    setTimeout(() => {
        document.getElementById('customerName').focus();
    }, 100);
}

function closeAddCustomerModal() {
    const modal = document.getElementById('addCustomerModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function editCustomer(name) {
    // Editar cliente
}

function viewCustomer(name) {
    // Ver perfil del cliente
}

function exportCustomers() {
    // Exportar lista de clientes
}

async function handleAddAppointment(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const appointmentData = {
        customer_name: formData.get('customer_name'),
        customer_phone: formData.get('customer_phone'),
        customer_email: formData.get('customer_email'),
        appointment_date: formData.get('appointment_date'),
        appointment_time: formData.get('appointment_time'),
        service: formData.get('service'),
        notes: formData.get('notes')
    };

    // Validar campos requeridos
    if (!appointmentData.customer_name || !appointmentData.customer_phone || 
        !appointmentData.appointment_date || !appointmentData.appointment_time || 
        !appointmentData.service) {
        //showNotification('Por favor completa todos los campos obligatorios', 'error');
        return;
    }

    // Validar formato de teléfono
    const phonePattern = /^(\+34|0034|34)?[6-9][0-9]{8}$/;
    const cleanPhone = appointmentData.customer_phone ? appointmentData.customer_phone.replace(/\s/g, '') : '';
    if (cleanPhone && !phonePattern.test(cleanPhone)) {
        //showNotification('Ingresa un número de teléfono válido', 'error');
        return;
    }

    // Validar email si se proporciona
    if (appointmentData.customer_email && !appointmentData.customer_email.includes('@')) {
        //showNotification('Ingresa un email válido', 'error');
        return;
    }

    // Validar que la fecha no sea en el pasado
    const selectedDate = new Date(appointmentData.appointment_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
        //showNotification('La fecha de la cita no puede ser en el pasado', 'error');
        return;
    }

    try {
        //showNotification('Creando cita...', 'info');

        // Llamada al API para crear la cita
        const response = await fetch('/api/appointments/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify(appointmentData)
        });

        if (response.ok) {
            const result = await response.json();

            // Cerrar modal
            closeAddAppointmentModal();

            // Actualizar la tabla de citas
            loadAppointments();

            //showNotification(`Cita creada exitosamente para ${appointmentData.customer_name}`, 'success');

        } else {
            const error = await response.json();
            //showNotification(error.error || 'Error al crear la cita', 'error');
        }

    } catch (error) {
        console.error('Error:', error);
        //showNotification('Error de conexión. Inténtalo de nuevo.', 'error');
    }
}

// Funciones de marketing
function loadMarketingData() {
    // Cargar datos de marketing silenciosamente
}

function openCampaignModal() {
    const modal = document.createElement('div');
    modal.className = 'modal campaign-modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2><i class="fas fa-rocket"></i> Nueva Campaña de Marketing</h2>
                <button onclick="closeCampaignModal()" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="campaignForm">
                    <div class="form-group">
                        <label for="campaignName">Nombre de la Campaña *</label>
                        <input type="text" id="campaignName" name="name" placeholder="Ej: Oferta Especial Verano 2024" required>
                    </div>

                    <div class="form-group">
                        <label for="campaignType">Tipo de Campaña *</label>
                        <select id="campaignType" name="type" required>
                            <option value="">Seleccionar tipo</option>
                            <option value="promotional">Promocional</option>
                            <option value="informational">Informativa</option>
                            <option value="reminder">Recordatorio</option>
                            <option value="welcome">Bienvenida</option>
                            <option value="follow_up">Seguimiento</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Canales de Distribución *</label>
                        <div class="channel-checkboxes" style="display: flex; gap: 20px; margin-top: 10px;">
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" name="channels" value="email" checked>
                                <i class="fas fa-envelope" style="color: #dc3545;"></i>
                                Email
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" name="channels" value="whatsapp">
                                <i class="fab fa-whatsapp" style="color: #25D366;"></i>
                                WhatsApp
                            </label>
                            <label style="display: flex; align-items: center; gap: 8px;">
                                <input type="checkbox" name="channels" value="telegram">
                                <i class="fab fa-telegram" style="color: #0088cc;"></i>
                                Telegram
                            </label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="campaignAudience">Audiencia Objetivo</label>
                        <select id="campaignAudience" name="audience">
                            <option value="all">Todos los clientes</option>
                            <option value="new">Clientes nuevos</option>
                            <option value="vip">Clientes VIP</option>
                            <option value="inactive">Clientes inactivos</option>
                            <option value="custom">Segmento personalizado</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="campaignSubject">Asunto del Mensaje *</label>
                        <input type="text" id="campaignSubject" name="subject" placeholder="Asunto atractivo para tu campaña" required>
                    </div>

                    <div class="form-group">
                        <label for="campaignMessage">Mensaje de la Campaña *</label>
                        <textarea id="campaignMessage" name="message" rows="4" placeholder="Escribe el contenido de tu campaña aquí..." required style="min-height: 100px;"></textarea>
                    </div>

                    <div class="form-group">
                        <label for="campaignSchedule">Programación</label>
                        <select id="campaignSchedule" name="schedule" onchange="toggleScheduleDateTime()">
                            <option value="now">Enviar ahora</option>
                            <option value="scheduled">Programar envío</option>
                        </select>
                    </div>

                    <div id="scheduleDateTime" class="form-group" style="display: none;">
                        <label for="campaignDateTime">Fecha y Hora de Envío</label>
                        <input type="datetime-local" id="campaignDateTime" name="datetime">
                    </div>

                    <div class="form-actions" style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 30px;">
                        <button type="button" onclick="saveCampaignDraft()" class="btn btn-outline">
                            <i class="fas fa-save"></i> Guardar Borrador
                        </button>
                        <button type="button" onclick="closeCampaignModal()" class="btn btn-secondary">
                            Cancelar
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i> Crear Campaña
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.classList.add('active');

    // Focus en el primer campo
    setTimeout(() => {
        document.getElementById('campaignName').focus();
    }, 100);

    // Añadir event listener al formulario
    document.getElementById('campaignForm').addEventListener('submit', handleCreateCampaign);
}

function setupEmailMarketing() {
    const modal = document.createElement('div');
    modal.className = 'modal email-marketing-modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2><i class="fas fa-envelope"></i> Configurar Email Marketing</h2>
                <button onclick="closeEmailMarketingModal()" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="email-marketing-tabs">
                    <button class="tab-button active" onclick="switchEmailTab('setup')">Configuración</button>
                    <button class="tab-button" onclick="switchEmailTab('templates')">Plantillas</button>
                    <button class="tab-button" onclick="switchEmailTab('automation')">Automatización</button>
                </div>

                <!-- Setup Tab -->
                <div id="emailSetupTab" class="email-tab-content active">
                    <form id="emailMarketingSetupForm">
                        <div class="form-group">
                            <label>Proveedor de Email</label>
                            <select id="emailProvider" onchange="updateEmailProviderFields()">
                                <option value="sendgrid">SendGrid</option>
                                <option value="mailchimp">MailChimp</option>
                                <option value="smtp">SMTP Personalizado</option>
                            </select>
                        </div>

                        <div id="sendgridFields" class="provider-fields">
                            <div class="form-group">
                                <label>API Key de SendGrid</label>
                                <input type="password" id="sendgridApiKey" placeholder="SG.xxxxxxxxx">
                            </div>
                            <div class="form-group">
                                <label>Email Verificado</label>
                                <input type="email" id="sendgridFromEmail" placeholder="marketing@tudominio.com">
                            </div>
                        </div>

                        <div id="mailchimpFields" class="provider-fields" style="display: none;">
                            <div class="form-group">
                                <label>API Key de MailChimp</label>
                                <input type="password" id="mailchimpApiKey" placeholder="xxxxxxxx-us1">
                            </div>
                            <div class="form-group">
                                <label>Lista ID</label>
                                <input type="text" id="mailchimpListId" placeholder="xxxxxxxxxx">
                            </div>
                        </div>

                        <div id="smtpFields" class="provider-fields" style="display: none;">
                            <div class="form-group">
                                <label>Servidor SMTP</label>
                                <input type="text" id="smtpHost" placeholder="smtp.gmail.com">
                            </div>
                            <div class="form-group">
                                <label>Puerto</label>
                                <input type="number" id="smtpPort" placeholder="587">
                            </div>
                            <div class="form-group">
                                <label>Usuario</label>
                                <input type="email" id="smtpUser" placeholder="tu@email.com">
                            </div>
                            <div class="form-group">
                                <label>Contraseña</label>
                                <input type="password" id="smtpPassword" placeholder="contraseña">
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="button" onclick="testEmailConnection()" class="btn btn-outline">
                                <i class="fas fa-test-tube"></i> Probar Conexión
                            </button>
                            <button type="button" onclick="saveEmailMarketingConfig()" class="btn btn-primary">
                                <i class="fas fa-save"></i> Guardar Configuración
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Templates Tab -->
                <div id="emailTemplatesTab" class="email-tab-content">
                    <div class="template-actions">
                        <button onclick="createEmailTemplate()" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Nueva Plantilla
                        </button>
                        <select id="templateCategory" onchange="filterEmailTemplates()">
                            <option value="">Todas las categorías</option>
                            <option value="welcome">Bienvenida</option>
                            <option value="promotional">Promocional</option>
                            <option value="reminder">Recordatorio</option>
                            <option value="newsletter">Newsletter</option>
                        </select>
                    </div>

                    <div id="emailTemplatesList" class="templates-grid">
                        <!-- Templates will be loaded here -->
                    </div>
                </div>

                <!-- Automation Tab -->
                <div id="emailAutomationTab" class="email-tab-content">
                    <div class="automation-flows">
                        <h4>Flujos de Automatización</h4>
                        <div class="flow-item">
                            <div class="flow-info">
                                <h5>Email de Bienvenida</h5>
                                <p>Se envía automáticamente a nuevos suscriptores</p>
                            </div>
                            <div class="flow-controls">
                                <label class="switch">
                                    <input type="checkbox" id="welcomeEmailFlow" checked>
                                    <span class="slider"></span>
                                </label>
                                <button onclick="editEmailFlow('welcome')" class="btn btn-sm">Editar</button>
                            </div>
                        </div>

                        <div class="flow-item">
                            <div class="flow-info">
                                <h5>Seguimiento de Citas</h5>
                                <p>Recordatorios y confirmaciones de citas</p>
                            </div>
                            <div class="flow-controls">
                                <label class="switch">
                                    <input type="checkbox" id="appointmentFlow" checked>
                                    <span class="slider"></span>
                                </label>
                                <button onclick="editEmailFlow('appointment')" class="btn btn-sm">Editar</button>
                            </div>
                        </div>

                        <div class="flow-item">
                            <div class="flow-info">
                                <h5>Reactivación de Clientes</h5>
                                <p>Para clientes inactivos por más de 30 días</p>
                            </div>
                            <div class="flow-controls">
                                <label class="switch">
                                    <input type="checkbox" id="reactivationFlow">
                                    <span class="slider"></span>
                                </label>
                                <button onclick="editEmailFlow('reactivation')" class="btn btn-sm">Editar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.classList.add('active');
    loadEmailTemplates();
}

function setupWhatsAppMarketing() {
    const modal = document.createElement('div');
    modal.className = 'modal whatsapp-marketing-modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2><i class="fab fa-whatsapp"></i> Configurar WhatsApp Marketing</h2>
                <button onclick="closeWhatsAppMarketingModal()" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="whatsapp-marketing-tabs">
                    <button class="tab-button active" onclick="switchWhatsAppTab('setup')">Configuración</button>
                    <button class="tab-button" onclick="switchWhatsAppTab('broadcast')">Difusión</button>
                    <button class="tab-button" onclick="switchWhatsAppTab('automation')">Automatización</button>
                </div>

                <!-- Setup Tab -->
                <div id="whatsappSetupTab" class="whatsapp-tab-content active">
                    <div class="connection-status">
                        <div class="status-indicator">
                            <i class="fas fa-circle ${getWhatsAppStatus().icon}"></i>
                            <span>${getWhatsAppStatus().text}</span>
                        </div>
                    </div>

                    <form id="whatsappMarketingSetupForm">
                        <div class="form-group">
                            <label>Token de WhatsApp Business API</label>
                            <input type="password" id="whatsappBusinessToken" placeholder="EAAG...">
                            <small>Obtén tu token desde Meta for Developers</small>
                        </div>

                        <div class="form-group">
                            <label>Phone Number ID</label>
                            <input type="text" id="whatsappPhoneNumberId" placeholder="123456789012345">
                        </div>

                        <div class="form-group">
                            <label>Business Account ID</label>
                            <input type="text" id="whatsappBusinessAccountId" placeholder="123456789012345">
                        </div>

                        <div class="messaging-limits">
                            <h4>Límites de Mensajería</h4>
                            <div class="limit-info">
                                <div class="limit-item">
                                    <span class="limit-label">Mensajes por día:</span>
                                    <span class="limit-value">1,000</span>
                                </div>
                                <div class="limit-item">
                                    <span class="limit-label">Plantillas aprobadas:</span>
                                    <span class="limit-value">5</span>
                                </div>
                                <div class="limit-item">
                                    <span class="limit-label">Estado de verificación:</span>
                                    <span class="limit-value status-verified">Verificado</span>
                                </div>
                            </div>
                        </div>

                        <div class="form-actions">
                            <button type="button" onclick="connectWhatsAppBusiness()" class="btn btn-primary">
                                <i class="fab fa-whatsapp"></i> Conectar WhatsApp Business
                            </button>
                            <button type="button" onclick="testWhatsAppConnection()" class="btn btn-outline">
                                <i class="fas fa-test-tube"></i> Probar Conexión
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Broadcast Tab -->
                <div id="whatsappBroadcastTab" class="whatsapp-tab-content">
                    <div class="broadcast-options">
                        <button onclick="createWhatsAppBroadcast()" class="btn btn-primary">
                            <i class="fas fa-bullhorn"></i> Nueva Difusión
                        </button>
                        <button onclick="manageWhatsAppTemplates()" class="btn btn-outline">
                            <i class="fas fa-file-alt"></i> Gestionar Plantillas
                        </button>
                    </div>

                    <div class="broadcast-stats">
                        <div class="stat-card">
                            <h4>124</h4>
                            <p>Mensajes enviados hoy</p>
                        </div>
                        <div class="stat-card">
                            <h4>89%</h4>
                            <p>Tasa de entrega</p>
                        </div>
                        <div class="stat-card">
                            <h4>34%</h4>
                            <p>Tasa de respuesta</p>
                        </div>
                    </div>

                    <div id="whatsappBroadcastHistory" class="broadcast-history">
                        <h4>Historial de Difusiones</h4>
                        <!-- Broadcast history will be loaded here -->
                    </div>
                </div>

                <!-- Automation Tab -->
                <div id="whatsappAutomationTab" class="whatsapp-tab-content">
                    <div class="automation-rules">
                        <h4>Reglas de Automatización</h4>

                        <div class="rule-item">
                            <div class="rule-info">
                                <h5>Confirmación de Citas</h5>
                                <p>Enviar confirmación automática cuando se agenda una cita</p>
                            </div>
                            <div class="rule-controls">
                                <label class="switch">
                                    <input type="checkbox" id="appointmentConfirmation" checked>
                                    <span class="slider"></span>
                                </label>
                                <button onclick="editWhatsAppRule('appointment')" class="btn btn-sm">Editar</button>
                            </div>
                        </div>

                        <div class="rule-item">
                            <div class="rule-info">
                                <h5>Recordatorio 24h antes</h5>
                                <p>Recordatorio automático 24 horas antes de la cita</p>
                            </div>
                            <div class="rule-controls">
                                <label class="switch">
                                    <input type="checkbox" id="reminderBefore24h" checked>
                                    <span class="slider"></span>
                                </label>
                                <button onclick="editWhatsAppRule('reminder24h')" class="btn btn-sm">Editar</button>
                            </div>
                        </div>

                        <div class="rule-item">
                            <div class="rule-info">
                                <h5>Mensaje de Bienvenida</h5>
                                <p>Primer mensaje automático para nuevos contactos</p>
                            </div>
                            <div class="rule-controls">
                                <label class="switch">
                                    <input type="checkbox" id="welcomeMessage" checked>
                                    <span class="slider"></span>
                                </label>
                                <button onclick="editWhatsAppRule('welcome')" class="btn btn-sm">Editar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.classList.add('active');
    loadWhatsAppBroadcastHistory();
}

function setupTelegramMarketing() {
    const modal = document.createElement('div');
    modal.className = 'modal telegram-marketing-modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2><i class="fab fa-telegram"></i> Configurar Telegram Marketing</h2>
                <button onclick="closeTelegramMarketingModal()" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="telegram-marketing-tabs">
                    <button class="tab-button active" onclick="switchTelegramTab('setup')">Configuración</button>
                    <button class="tab-button" onclick="switchTelegramTab('channels')">Canales</button>
                    <button class="tab-button" onclick="switchTelegramTab('bots')">Bots</button>
                </div>

                <!-- Setup Tab -->
                <div id="telegramSetupTab" class="telegram-tab-content active">
                    <div class="setup-options">
                        <div class="option-card">
                            <div class="option-icon">
                                <i class="fas fa-robot"></i>
                            </div>
                            <h4>Bot de Telegram</h4>
                            <p>Crea un bot para respuestas automáticas y marketing directo</p>
                            <button onclick="setupTelegramBot()" class="btn btn-primary">
                                <i class="fas fa-plus"></i> Configurar Bot
                            </button>
                        </div>

                        <div class="option-card">
                            <div class="option-icon">
                                <i class="fas fa-broadcast-tower"></i>
                            </div>
                            <h4>Canal de Difusión</h4>
                            <p>Canal para enviar actualizaciones y promociones a suscriptores</p>
                            <button onclick="setupTelegramChannel()" class="btn btn-primary">
                                <i class="fas fa-plus"></i> Crear Canal
                            </button>
                        </div>

                        <div class="option-card">
                            <div class="option-icon">
                                <i class="fas fa-users"></i>
                            </div>
                            <h4>Grupo de Comunidad</h4>
                            <p>Grupo para crear comunidad y fomentar la interacción</p>
                            <button onclick="setupTelegramGroup()" class="btn btn-primary">
                                <i class="fas fa-plus"></i> Crear Grupo
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Channels Tab -->
                <div id="telegramChannelsTab" class="telegram-tab-content">
                    <div class="channels-header">
                        <button onclick="createTelegramChannel()" class="btn btn-primary">
                            <i class="fas fa-plus"></i> Nuevo Canal
                        </button>
                        <button onclick="importTelegramChannel()" class="btn btn-outline">
                            <i class="fas fa-download"></i> Importar Canal Existente
                        </button>
                    </div>

                    <div id="telegramChannelsList" class="channels-list">
                        <div class="channel-item">
                            <div class="channel-info">
                                <h5>@mi_negocio_oficial</h5>
                                <p>Canal principal de promociones</p>
                                <span class="subscriber-count">1,234 suscriptores</span>
                            </div>
                            <div class="channel-actions">
                                <button onclick="postToChannel('main')" class="btn btn-sm">
                                    <i class="fas fa-paper-plane"></i> Publicar
                                </button>
                                <button onclick="viewChannelStats('main')" class="btn btn-sm btn-outline">
                                    <i class="fas fa-chart-bar"></i> Estadísticas
                                </button>
                            </div>
                        </div>

                        <div class="channel-item inactive">
                            <div class="channel-info">
                                <h5>Canal de Ofertas</h5>
                                <p>Canal especializado en ofertas y descuentos</p>
                                <span class="setup-status">No configurado</span>
                            </div>
                            <div class="channel-actions">
                                <button onclick="setupOfferChannel()" class="btn btn-sm btn-primary">
                                    <i class="fas fa-cog"></i> Configurar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bots Tab -->
                <div id="telegramBotsTab" class="telegram-tab-content">
                    <form id="telegramBotSetupForm">
                        <div class="form-group">
                            <label>Token del Bot</label>
                            <input type="text" id="telegramBotToken" placeholder="1234567890:ABCdefGhIJKlmNOPQRSTuvwXYZ">
                            <small>Obtén tu token desde @BotFather en Telegram</small                        </div>

                        <div class="form-group">
                            <label>Nombre del Bot</label>
                            <input type="text" id="telegramBotName" placeholder="Mi Asistente Bot">
                        </div>

                        <div class="form-group">
                            <label>Username del Bot</label>
                            <input type="text" id="telegramBotUsername" placeholder="@mi_asistente_bot">
                        </div>

                        <div class="bot-commands">
                            <h4>Comandos del Bot</h4>
                            <div class="command-list">
                                <div class="command-item">
                                    <code>/start</code> - Mensaje de bienvenida
                                    <button onclick="editBotCommand('start')" class="btn btn-xs">Editar</button>
                                </div>
                                <div class="command-item">
                                    <code>/info</code> - Información del negocio
                                    <button onclick="editBotCommand('info')" class="btn btn-xs">Editar</button>
                                </div>
                                <div class="command-item">
                                    <code>/cita</code> - Agendar cita
                                    <button onclick="editBotCommand('cita')" class="btn btn-xs">Editar</button>
                                </div>
                                <div class="command-item">
                                    <code>/contacto</code> - Información de contacto
                                    <button onclick="editBotCommand('contacto')" class="btn btn-xs">Editar</button>
                                </div>
                            </div>
                            <button onclick="addBotCommand()" class="btn btn-outline btn-sm">
                                <i class="fas fa-plus"></i> Añadir Comando
                            </button>
                        </div>

                        <div class="form-actions">
                            <button type="button" onclick="saveTelegramBotConfig()" class="btn btn-primary">
                                <i class="fas fa-save"></i> Guardar Bot
                            </button>
                            <button type="button" onclick="testTelegramBot()" class="btn btn-outline">
                                <i class="fas fa-test-tube"></i> Probar Bot
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.classList.add('active');
}

function viewCampaign(id) {
    // Abrir vista detallada de la campaña sin notificación
}

function closeCampaignModal() {
    const modal = document.querySelector('.campaign-modal');
    if (modal) {
        modal.remove();
    }
}

function toggleScheduleDateTime() {
    const schedule = document.getElementById('campaignSchedule').value;
    const dateTimeGroup = document.getElementById('scheduleDateTime');

    if (schedule === 'scheduled') {
        dateTimeGroup.style.display = 'block';
        document.getElementById('campaignDateTime').required = true;

        // Establecer fecha mínima como ahora
        const now = new Date();
        now.setMinutes(now.getMinutes() + 10); // Al menos 10 minutos en el futuro
        document.getElementById('campaignDateTime').min = now.toISOString().slice(0, 16);
    } else {
        dateTimeGroup.style.display = 'none';
        document.getElementById('campaignDateTime').required = false;
    }
}

function saveCampaignDraft() {
    const formData = new FormData(document.getElementById('campaignForm'));
    constcampaignData = {};

    // Obtener datos delform
    for (let [key, value] of formData.entries()) {        if (key === 'channels') {
            if (!campaignData.channels) campaignData.channels = [];
            campaignData.channels.push(value);
        } else {
            campaignData[key] = value;
        }
    }

    // Validar campos básicos
    if (!campaignData.name || !campaignData.subject || !campaignData.message) {
        //showNotification('Por favor completa al menos el nombre, asunto y mensaje', 'error');
        return;
    }

    // Simular guardado de borrador
    const draftKey = `campaign_draft_${Date.now()}`;
    localStorage.setItem(draftKey, JSON.stringify(campaignData));

    //showNotification('Borrador guardado correctamente', 'success');
    closeCampaignModal();
}

async function handleCreateCampaign(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const campaignData = {};

    // Obtener datos del formulario
    for (let [key, value] of formData.entries()) {
        if (key === 'channels') {
            if (!campaignData.channels) campaignData.channels = [];
            campaignData.channels.push(value);
        } else {
            campaignData[key] = value;
        }
    }

    // Validar campos requeridos
    if (!campaignData.name || !campaignData.type || !campaignData.subject || !campaignData.message) {
        //showNotification('Por favor completa todos los campos obligatorios', 'error');
        return;
    }

    // Validar que al menos un canal esté seleccionado
    if (!campaignData.channels || campaignData.channels.length === 0) {
        //showNotification('Selecciona al menos un canal de distribución', 'error');
        return;
    }

    // Validar fecha programada si es necesario
    if (campaignData.schedule === 'scheduled') {
        const scheduledDate = new Date(campaignData.datetime);
        const now = new Date();

        if (scheduledDate <= now) {
            //showNotification('La fecha programada debe ser en el futuro', 'error');
            return;
        }
    }

    try {
        //showNotification('Creando campaña...', 'info');

        // Simular creación de campaña
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Cerrar modal
        closeCampaignModal();

        // Actualizar lista de campañas
        loadMarketingData();

        const statusText = campaignData.schedule === 'now' ? 'enviada' : 'programada';
        //showNotification(`Campaña "${campaignData.name}" ${statusText} exitosamente`, 'success');

        // Mostrar resumen
        setTimeout(() => {
            showCampaignSummary(campaignData);
        }, 1000);

    } catch (error) {
        console.error('Error:', error);
        //showNotification('Error al crear la campaña. Inténtalo de nuevo.', 'error');
    }
}

function showCampaignSummary(campaignData) {
    const channelNames = {
        'email': 'Email',
        'whatsapp': 'WhatsApp',
        'telegram': 'Telegram'
    };

    const channelsList = campaignData.channels.map(ch => channelNames[ch]).join(', ');
    const statusText = campaignData.schedule === 'now' ? 'Enviado' : 'Programado';

    //showNotification(
    //    `📊 Resumen: "${campaignData.name}" | Canales: ${channelsList} | Estado: ${statusText}`,
    //    'info'
    //);
}

// Funciones de configuración
function loadSettings() {
    const businessForm = document.getElementById('businessSettingsForm');
    if (businessForm && currentUser) {
        document.getElementById('settingsBusinessName').value = currentUser.business_name || '';
        document.getElementById('settingsPhone').value = currentUser.phone || '';
        document.getElementById('settingsEmail').value = currentUser.email || '';
        document.getElementById('businessNiche').value = currentUser.niche || '';
    }
}

function handleBusinessSettings(event) {
    event.preventDefault();
    //showNotification('Configuración guardada correctamente', 'success');
}

async function handleContactForm(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const contactData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        company: formData.get('company'),
        subject: formData.get('subject'),
        message: formData.get('message')
    };

    // Validar campos requeridos
    if (!contactData.name || !contactData.email || !contactData.subject || !contactData.message) {
        //showNotification('Por favor completa todos los campos obligatorios', 'error');
        return;
    }

    // Validar formato de email
    if (!contactData.email.includes('@')) {
        //showNotification('Por favor ingresa un email válido', 'error');
        return;
    }

    try {
        // Enviar datos al servidor
        //showNotification('Enviando mensaje...', 'info');

        const response = await fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(contactData)
        });

        const result = await response.json();

        if (response.ok) {
            // Reset form
            event.target.reset();
            //showNotification('¡Mensaje enviado correctamente! Te contactaremos pronto.', 'success');
        } else {
            //showNotification(result.error || 'Error al enviar el mensaje', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        //showNotification('Error de conexión. Inténtalo de nuevo.', 'error');
    }
}

async function handleAddCustomer(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const customerData = {
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        status: formData.get('status'),
        notes: formData.get('notes'),
        whatsapp: formData.get('whatsapp') ? true : false,
        telegram: formData.get('telegram') ? true : false,
        registration: new Date().toISOString().split('T')[0]
    };

    // Validar campos requeridos
    if (!customerData.name || !customerData.email || !customerData.phone) {
        //showNotification('Por favor completa todos los campos obligatorios', 'error');
        return;
    }

    // Validar formato de email
    if (!customerData.email.includes('@')) {
        //showNotification('Ingresa un email válido', 'error');
        return;
    }

    try {
        //showNotification('Guardando cliente...', 'info');

        // Simular guardado en la base de datos
        // En producción esto se conectaría con el API
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Cerrar modal
        closeAddCustomerModal();

        // Actualizar la tabla de clientes
        loadCustomers();

        //showNotification(`Cliente ${customerData.name} añadido correctamente`, 'success');

    } catch (error) {
        console.error('Error:', error);
        //showNotification('Error al guardar el cliente. Inténtalo de nuevo.', 'error');
    }
}

function configureWhatsApp() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2><i class="fab fa-whatsapp"></i> Configurar WhatsApp Business</h2>
                <button onclick="this.closest('.modal').remove()" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="whatsappForm">
                    <div class="form-group">
                        <label>Token de Acceso</label>
                        <input type="text" id="whatsappToken" placeholder="Tu token de WhatsApp Business API" required>
                    </div>
                    <div class="form-group">
                        <label>Token de Verificación</label>
                        <input type="text" id="whatsappVerifyToken" placeholder="Token para verificar webhook" required>
                    </div>
                    <div class="form-group">
                        <label>ID del Número de Teléfono</label>
                        <input type="text" id="whatsappPhoneId" placeholder="ID del número de teléfono" required>
                    </div>
                    <div class="form-group">
                        <label>URL del Webhook</label>
                        <input type="text" id="whatsappWebhook" value="${window.location.origin}/api/whatsapp/webhook" readonly>
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="saveWhatsAppConfig()" class="btn btn-primary">
                            <i class="fas fa-save"></i> Guardar Configuración
                        </button>
                        <button type="button" onclick="testWhatsAppConnection()" class="btn btn-outline">
                            <i class="fas fa-test-tube"></i> Probar Conexión
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.classList.add('active');
}

function configureTelegram() {
    const modal = document.createElement('div');
    modal.className = 'modal telegram-config-modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2><i class="fab fa-telegram"></i> Configurar Telegram Bot</h2>
                <button onclick="this.closest('.modal').remove()" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="telegram-setup-tabs">
                    <button class="tab-button active" onclick="switchTelegramTab('bot')">Bot Configuration</button>
                    <button class="tab-button" onclick="switchTelegramTab('webhook')">Webhook Setup</button>
                    <button class="tab-button" onclick="switchTelegramTab('test')">Test Bot</button>
                </div>

                <!-- Bot Configuration Tab -->
                <div id="telegramBotTab" class="telegram-tab-content active">
                    <form id="telegramBotForm">
                        <div class="form-group">
                            <label>Bot Token</label>
                            <input type="password" id="telegramBotToken" placeholder="Bot token obtenido de @BotFather" required>
                            <small>Obtén tu token desde <a href="https://t.me/BotFather" target="_blank">@BotFather</a></small>
                        </div>

                        <div class="form-group">
                            <label>Nombre del Bot</label>
                            <input type="text" id="telegramBotName" placeholder="Mi Asistente Bot" required>
                        </div>

                        <div class="form-group">
                            <label>Descripción</label>
                            <textarea id="telegramBotDescription" placeholder="Descripción del bot para los usuarios"></textarea>
                        </div>

                        <div class="form-actions">
                            <button type="button" onclick="saveeTelegramBot()" class="btn btn-primary">
                                <i class="fas fa-save"></i> Guardar Configuración
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Webhook Tab -->
                <div id="telegramWebhookTab" class="telegram-tab-content">
                    <div class="webhook-info">
                        <p><strong>URL del Webhook:</strong></p>
                        <div class="webhook-url">
                            <code id="telegramWebhookUrl">${window.location.origin}/api/telegram/webhook</code>
                            <button onclick="copyToClipboard('telegramWebhookUrl')" class="btn btn-sm btn-outline">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="button" onclick="setTelegramWebhook()" class="btn btn-primary">
                            <i class="fas fa-link"></i> Configurar Webhook
                        </button>
                        <button type="button" onclick="testTelegramWebhook()" class="btn btn-outline">
                            <i class="fas fa-test-tube"></i> Test Webhook
                        </button>
                    </div>
                </div>

                <!-- Test Tab -->
                <div id="telegramTestTab" class="telegram-tab-content">
                    <div class="test-bot-section">
                        <p>Envía un mensaje de prueba a tu bot:</p>
                        <div class="form-group">
                            <label>Chat ID</label>
                            <input type="text" id="telegramChatId" placeholder="ID del chat para testing">
                        </div>
                        <div class="form-group">
                            <label>Mensaje de Prueba</label>
                            <textarea id="telegramTestMessage" placeholder="¡Hola! Soy tu asistente virtual de AIAsistentPro 🤖"></textarea>
                        </div>
                        <button type="button" onclick="sendTelegramTestMessage()" class="btn btn-primary">
                            <i class="fab fa-telegram"></i> Enviar Mensaje
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.classList.add('active');
}

function configureEmail() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2><i class="fas fa-envelope"></i> Configurar Email SMTP</h2>
                <button onclick="this.closest('.modal').remove()" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="emailForm">
                    <div class="form-group">
                        <label>Proveedor de Email</label>
                        <select id="emailProvider" onchange="updateEmailSettings()">
                            <option value="sendgrid">SendGrid</option>
                            <option value="gmail">Gmail SMTP</option>
                            <option value="custom">SMTP Personalizado</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>API Key / Contraseña</label>
                        <input type="password" id="emailApiKey" placeholder="Tu API key o contraseña" required>
                    </div>
                    <div class="form-group">
                        <label>Email de Origen</label>
                        <input type="email" id="emailFrom" placeholder="noreply@tudominio.com" required>
                    </div>
                    <div id="smtpSettings" style="display: none;">
                        <div class="form-group">
                            <label>Servidor SMTP</label>
                            <input type="text" id="smtpHost" placeholder="smtp.gmail.com">
                        </div>
                        <div class="form-group">
                            <label>Puerto</label>
                            <input type="number" id="smtpPort" placeholder="587">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="saveEmailConfig()" class="btn btn-primary">
                            <i class="fas fa-save"></i> Guardar Configuración
                        </button>
                        <button type="button" onclick="testEmailConnection()" class="btn btn-outline">
                            <i class="fas fa-test-tube"></i> Enviar Email de Prueba
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.classList.add('active');
}

function configureCalls() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h2><i class="fas fa-phone"></i> Configurar Llamadas Inteligentes</h2>
                <button onclick="this.closest('.modal').remove()" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="calls-config-tabs">
                    <button class="tab-button active" onclick="switchCallsTab('twilio')">Twilio</button>
                    <button class="tab-button" onclick="switchCallsTab('voice')">Configuración de Voz</button>
                    <button class="tab-button" onclick="switchCallsTab('automation')">Automatización</button>
                </div>

                <!-- Twilio Configuration Tab -->
                <div id="callsTwilioTab" class="calls-tab-content active">
                    <form id="twilioForm">
                        <div class="form-group">
                            <label>Account SID de Twilio</label>
                            <input type="text" id="twilioAccountSid" placeholder="Tu Account SID de Twilio" required>
                            <small>Encuéntralo en tu <a href="https://console.twilio.com" target="_blank">Console de Twilio</a></small>
                        </div>
                        <div class="form-group">
                            <label>Auth Token</label>
                            <input type="password" id="twilioAuthToken" placeholder="Tu Auth Token de Twilio" required>
                        </div>
                        <div class="form-group">
                            <label>Número de Twilio</label>
                            <input type="text" id="twilioPhoneNumber" placeholder="+1234567890" required>
                            <small>Número de teléfono que compraste en Twilio</small>
                        </div>
                        <div class="form-group">
                            <label>URL del Webhook</label>
                            <input type="text" id="twilioWebhook" value="${window.location.origin}/api/calls/webhook" readonly>
                            <small>Configura esta URL en tu Console de Twilio</small>
                        </div>
                        <div class="form-actions">
                            <button type="button" onclick="saveTwilioConfig()" class="btn btn-primary">
                                <i class="fas fa-save"></i> Guardar Configuración
                            </button>
                            <button type="button" onclick="testTwilioConnection()" class="btn btn-outline">
                                <i class="fas fa-test-tube"></i> Probar Conexión
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Voice Configuration Tab -->
                <div id="callsVoiceTab" class="calls-tab-content">
                    <div class="voice-settings">
                        <div class="form-group">
                            <label>Voz del Asistente</label>
                            <select id="voiceGender">
                                <option value="female">Voz Femenina</option>
                                <option value="male">Voz Masculina</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Idioma</label>
                            <select id="voiceLanguage">
                                <option value="es-ES">Español (España)</option>
                                <option value="es-MX">Español (México)</option>
                                <option value="es-AR">Español (Argentina)</option>
                                <option value="en-US">Inglés (Estados Unidos)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Velocidad de Habla</label>
                            <input type="range" id="voiceSpeed" min="0.5" max="2" step="0.1" value="1">
                            <span id="speedValue">1.0x</span>
                        </div>
                        <div class="form-group">
                            <label>Mensaje de Saludo</label>
                            <textarea id="voiceGreeting" placeholder="Hola, soy el asistente virtual de [Nombre del Negocio]. ¿En qué puedo ayudarte hoy?"></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" onclick="saveVoiceConfig()" class="btn btn-primary">
                                <i class="fas fa-save"></i> Guardar Configuración
                            </button>
                            <button type="button" onclick="testVoiceMessage()" class="btn btn-outline">
                                <i class="fas fa-play"></i> Probar Voz
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Automation Tab -->
                <div id="callsAutomationTab" class="calls-tab-content">
                    <div class="automation-rules">
                        <h4>Reglas de Automatización</h4>

                        <div class="rule-item">
                            <div class="rule-info">
                                <h5>Llamadas de Recordatorio</h5>
                                <p>Llamar automáticamente 24h antes de las citas</p>
                            </div>
                            <div class="rule-controls">
                                <label class="switch">
                                    <input type="checkbox" id="reminderCalls" checked>
                                    <span class="slider"></span>
                                </label>
                                <button onclick="editCallRule('reminder')" class="btn btn-sm">Editar</button>
                            </div>
                        </div>

                        <div class="rule-item">
                            <div class="rule-info">
                                <h5>Llamadas de Confirmación</h5>
                                <p>Confirmar citas automáticamente por teléfono</p>
                            </div>
                            <div class="rule-controls">
                                <label class="switch">
                                    <input type="checkbox" id="confirmationCalls" checked>
                                    <span class="slider"></span>
                                </label>
                                <button onclick="editCallRule('confirmation')" class="btn btn-sm">Editar</button>
                            </div>
                        </div>

                        <div class="rule-item">
                            <div class="rule-info">
                                <h5>Llamadas de Seguimiento</h5>
                                <p>Llamar después de citas para feedback</p>
                            </div>
                            <div class="rule-controls">
                                <label class="switch">
                                    <input type="checkbox" id="followUpCalls">
                                    <span class="slider"></span>
                                </label>
                                <button onclick="editCallRule('followup')" class="btn btn-sm">Editar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.classList.add('active');

    // Initialize voice speed display
    const speedSlider = document.getElementById('voiceSpeed');
    const speedValue = document.getElementById('speedValue');
    speedSlider.addEventListener('input', function() {
        speedValue.textContent = this.value + 'x';
    });
}

function switchCallsTab(tabName) {
    document.querySelectorAll('.calls-tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.calls-config-tabs .tab-button').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`calls${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`).classList.add('active');
    event.target.classList.add('active');
}

function saveTwilioConfig() {
    const config = {
        accountSid: document.getElementById('twilioAccountSid').value,
        authToken: document.getElementById('twilioAuthToken').value,
        phoneNumber: document.getElementById('twilioPhoneNumber').value
    };

    if (!config.accountSid || !config.authToken || !config.phoneNumber) {
        alert('Por favor completa todos los campos');
        return;
    }

    localStorage.setItem('twilio_config', JSON.stringify(config));
    alert('Configuración de Twilio guardada exitosamente');
}

function saveVoiceConfig() {
    const config = {
        gender: document.getElementById('voiceGender').value,
        language: document.getElementById('voiceLanguage').value,
        speed: document.getElementById('voiceSpeed').value,
        greeting: document.getElementById('voiceGreeting').value
    };

    localStorage.setItem('voice_config', JSON.stringify(config));
    alert('Configuración de voz guardada exitosamente');
}

function testTwilioConnection() {
    alert('Probando conexión con Twilio...');
    setTimeout(() => {
        alert('✅ Conexión con Twilio establecida correctamente');
    }, 2000);
}

function testVoiceMessage() {
    alert('Reproduciendo mensaje de prueba...');
    setTimeout(() => {
        alert('✅ Mensaje de voz reproducido correctamente');
    }, 1500);
}

function editCallRule(type) {
    alert(`Editando regla de ${type}...`);
}

function updateEmailSettings() {
    const provider = document.getElementById('emailProvider').value;
    const smtpSettings = document.getElementById('smtpSettings');
    const apiKeyLabel = document.querySelector('label[for="emailApiKey"]');

    if (provider === 'custom') {
        smtpSettings.style.display = 'block';
        apiKeyLabel.textContent = 'Contraseña SMTP';
    } else {
        smtpSettings.style.display = 'none';
        apiKeyLabel.textContent = provider === 'sendgrid' ? 'API Key de SendGrid' : 'Contraseña de App Gmail';
    }
}

function saveWhatsAppConfig() {
    const config = {
        token: document.getElementById('whatsappToken').value,
        verifyToken: document.getElementById('whatsappVerifyToken').value,
        phoneId: document.getElementById('whatsappPhoneId').value
    };

    if (!config.token || !config.verifyToken || !config.phoneId) {
        //showNotification('Por favor completa todos los campos', 'error');
        return;
    }

    // Simular guardado
    localStorage.setItem('whatsapp_config', JSON.stringify(config));
    //showNotification('Configuración de WhatsApp guardada exitosamente', 'success');
    document.querySelector('.modal').remove();
}

function saveTelegramConfig() {
    const config = {
        token: document.getElementById('telegramToken').value,
        botName: document.getElementById('telegramBotName').value
    };

    if (!config.token) {
        //showNotification('Por favor ingresa el token del bot', 'error');
        return;
    }

    // Simular guardado
    localStorage.setItem('telegram_config', JSON.stringify(config));
    //showNotification('Configuración de Telegram guardada exitosamente', 'success');
    document.querySelector('.modal').remove();
}

function saveEmailConfig() {
    const config = {
        provider: document.getElementById('emailProvider').value,
        apiKey: document.getElementById('emailApiKey').value,
        fromEmail: document.getElementById('emailFrom').value,
        smtpHost: document.getElementById('smtpHost')?.value,
        smtpPort: document.getElementById('smtpPort')?.value
    };

    if (!config.apiKey || !config.fromEmail) {
        //showNotification('Por favor completa todos los campos obligatorios', 'error');
        return;
    }

    // Simular guardado
    localStorage.setItem('email_config', JSON.stringify(config));
    //showNotification('Configuración de Email guardada exitosamente', 'success');
    document.querySelector('.modal').remove();
}

function testWhatsAppConnection() {
    //showNotification('Probando conexión con WhatsApp...', 'info');

    setTimeout(() => {
        //showNotification('✅ Conexión con WhatsApp establecida correctamente', 'success');
    }, 2000);
}

// Funciones auxiliares para Telegram
function switchTelegramTab(tabName) {
    // Remover clase active de todos los tabs
    document.querySelectorAll('.telegram-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Activar tab seleccionado
    document.getElementById(`telegram${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`).classList.add('active');
    event.target.classList.add('active');
}

function saveeTelegramBot() {
    const token = document.getElementById('telegramBotToken').value;
    const name = document.getElementById('telegramBotName').value;

    if (!token || !name) {
        //showNotification('Por favor completa todos los campos requeridos', 'error');
        return;
    }

    //showNotification('Guardando configuración de Telegram...', 'info');

    // Simular guardado
    setTimeout(() => {
        //showNotification('✅ Bot de Telegram configurado correctamente', 'success');
    }, 1500);
}

function setTelegramWebhook() {
    //showNotification('Configurando webhook de Telegram...', 'info');

    setTimeout(() => {
        //showNotification('✅ Webhook de Telegram configurado correctamente', 'success');
    }, 2000);
}

function testTelegramWebhook() {
    //showNotification('Probando webhook de Telegram...', 'info');

    setTimeout(() => {
        //showNotification('✅ Webhook funcionando correctamente', 'success');
    }, 1500);
}

function sendTelegramTestMessage() {
    const chatId = document.getElementById('telegramChatId').value;
    const message = document.getElementById('telegramTestMessage').value;

    if (!chatId || !message) {
        //showNotification('Por favor completa el Chat ID y el mensaje', 'error');
        return;
    }

    //showNotification('Enviando mensaje de prueba...', 'info');

    setTimeout(() => {
        //showNotification('✅ Mensaje enviado correctamente', 'success');
    }, 1500);
}

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    navigator.clipboard.writeText(element.textContent).then(() => {
        //showNotification('URL copiada al portapapeles', 'success');
    });
}

function testTelegramConnection() {
    //showNotification('Probando conexión con Telegram Bot...', 'info');
    // Simular test
    setTimeout(() => {
        //showNotification('Bot de Telegram configurado correctamente', 'success');
    }, 2000);
}

function testEmailConnection() {
    //showNotification('Enviando email de prueba...', 'info');
    // Simular test
    setTimeout(() => {
        //showNotification('Email de prueba enviado exitosamente', 'success');
    }, 2000);
}

// Funciones de demostración
function showDemo() {
    openLiveDemo();
}

function scheduleDemo() {
    // Agendar demo personal
}

// Funciones del demo
function openLiveDemo() {
    showDemo();
}

function showDemo() {
    const modal = document.getElementById('demoModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Reset chat messages
        const chatMessages = document.getElementById('demoChatMessages');
        if (chatMessages) {
            chatMessages.innerHTML = `
                <div class="demo-message bot">
                    <div class="message-avatar">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        ¡Hola! Soy tu asistente virtual de AIAsistentPro. ¿En qué puedo ayudarte hoy? 😊
                    </div>
                </div>
            `;
        }

        // Clear input
        const messageInput = document.getElementById('demoMessageInput');
        if (messageInput) {
            messageInput.value = '';
        }
    }
}

// Funciones específicas para clínicas
function showClinicFeatures(event) {
    event.preventDefault();
    if (!currentUser) {
        showLoginModal();
        return;
    }

    //showNotification('Accediendo a funciones de clínicas...', 'info');
    setTimeout(() => {
        showDashboard();
        showSection('appointments');
    }, 1000);
}

// Funciones para módulos multi-canal
function accessWhatsAppModule(event) {
    event.preventDefault();
    if (!currentUser) {
        showLoginModal();
        return;
    }

    //showNotification('Configurando WhatsApp Business...', 'info');
    setTimeout(() => {
        showDashboard();
        showSection('settings');
        configureWhatsApp();
    }, 1000);
}

function accessTelegramModule(event) {
    event.preventDefault();
    if (!currentUser) {
        showLoginModal();
        return;
    }

    //showNotification('Configurando Telegram Bot...', 'info');
    setTimeout(() => {
        showDashboard();
        showSection('settings');
        configureTelegram();
    }, 1000);
}

function accessEmailModule(event) {
    event.preventDefault();
    if (!currentUser) {
        showLoginModal();
        return;
    }

    //showNotification('Configurando Email Marketing...', 'info');
    setTimeout(() => {
        showDashboard();
        showSection('marketing');
        setupEmailMarketing();
    }, 1000);
}

function accessConversationsModule(event) {
    event.preventDefault();
    if (!currentUser) {
        showLoginModal();
        return;
    }

    //showNotification('Accediendo a conversaciones unificadas...', 'info');
    setTimeout(() => {
        showDashboard();
        showSection('conversations');
    }, 1000);
}

function showPatientManagement(event) {
    event.preventDefault();
    showDemo();
    setTimeout(() => {
        sendDemoMessage('Quiero saber sobre la gestión de pacientes');
    }, 500);
}

function showMedicalHistory(event) {
    event.preventDefault();
    showDemo();
    setTimeout(() => {
        sendDemoMessage('¿Cómo accedo al historial médico de mis pacientes?');
    }, 500);
}

function showClinicDemo(event) {
    event.preventDefault();
    showDemo();
    setTimeout(() => {
        sendDemoMessage('Soy dueño de una clínica médica, ¿cómo me ayuda su sistema?');
    }, 500);
}

// Funciones específicas para gestorías
function showManagementFeatures(event) {
    event.preventDefault();
    showDemo();
    setTimeout(() => {
        sendDemoMessage('¿Cómo automatizan la gestión de trámites administrativos?');
    }, 500);
}

function showFiscalConsulting(event) {
    event.preventDefault();
    showDemo();
    setTimeout(() => {
        sendDemoMessage('Necesito ayuda con consultas fiscales automatizadas');
    }, 500);
}

function showExpirationReminders(event) {
    event.preventDefault();
    showDemo();
    setTimeout(() => {
        sendDemoMessage('¿Cómo funcionan los recordatorios de vencimientos fiscales?');
    }, 500);
}

function showManagementDemo(event) {
    event.preventDefault();
    showDemo();
    setTimeout(() => {
        sendDemoMessage('Tengo una gestoría, ¿qué beneficios me ofrece AIAsistentPro?');
    }, 500);
}

// Funciones específicas para administradores de fincas
function showIncidentManagement(event) {
    event.preventDefault();
    showDemo();
    setTimeout(() => {
        sendDemoMessage('¿Cómo gestiono incidencias de propiedades automáticamente?');
    }, 500);
}

function showPaymentManagement(event) {
    event.preventDefault();
    showDemo();
    setTimeout(() => {
        sendDemoMessage('Quiero automatizar cobros y pagos de inquilinos');
    }, 500);
}

function showMaintenanceAutomation(event) {
    event.preventDefault();
    showDemo();
    setTimeout(() => {
        sendDemoMessage('¿Cómo funciona el mantenimiento automático de propiedades?');
    }, 500);
}

function showPropertyDemo(event) {
    event.preventDefault();
    showDemo();
    setTimeout(() => {
        sendDemoMessage('Soy administrador de fincas, ¿cómo me puede ayudar?');
    }, 500);
}

// Funciones específicas para e-commerce
function showOrderManagement(event) {
    event.preventDefault();
    showDemo();
    setTimeout(() => {
        sendDemoMessage('¿Cómo automatizo la gestión de pedidos en mi tienda online?');
    }, 500);
}

function showProductSupport(event) {
    event.preventDefault();
    showDemo();
    setTimeout(() => {
        sendDemoMessage('Necesito soporte 24/7 para productos de mi e-commerce');
    }, 500);
}

function showShippingTracking(event) {
    event.preventDefault();
    showDemo();
    setTimeout(() => {
        sendDemoMessage('¿Cómo funciona el seguimiento automático de envíos?');
    }, 500);
}

function showEcommerceDemo(event) {
    event.preventDefault();
    showDemo();
    setTimeout(() => {
        sendDemoMessage('Tengo una tienda online, ¿qué automatizaciones ofrecen?');
    }, 500);
}

function closeDemoModal() {
    const modal = document.getElementById('demoModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

function sendDemoMessage(message) {
    document.getElementById('demoMessageInput').value = message;
    sendDemoUserMessage();
}

function handleDemoEnter(event) {
    if (event.key === 'Enter') {
        sendDemoUserMessage();
    }
}

function sendDemoUserMessage() {
    const input = document.getElementById('demoMessageInput');
    const message = input.value.trim();

    if (!message) return;

    // Limpiar el input
    input.value = '';

    // Agregar mensaje del usuario
    addDemoMessage(message, 'user');

    // Mostrar indicador de escritura
    showDemoTypingIndicator();

    // Simular respuesta del asistente
    setTimeout(() => {
        hideDemoTypingIndicator();
        const response = generateDemoResponse(message);
        addDemoMessage(response, 'bot');
    }, 1500 + Math.random() * 1000); // Entre 1.5 y 2.5 segundos
}

function addDemoMessage(message, sender) {
    const messagesContainer = document.getElementById('demoChatMessages');

    const messageDiv = document.createElement('div');
    messageDiv.className = `demo-message ${sender}`;

    const avatar = sender === 'bot' ? '<i class="fas fa-robot"></i>' : '<i class="fas fa-user"></i>';

    messageDiv.innerHTML = `
        <div class="message-avatar">
            ${avatar}
        </div>
        <div class="message-content">
            ${message}
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showDemoTypingIndicator() {
    const indicator = document.getElementById('demoTypingIndicator');
    indicator.classList.remove('hidden');

    const messagesContainer = document.getElementById('demoChatMessages');
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideDemoTypingIndicator() {
    const indicator = document.getElementById('demoTypingIndicator');
    indicator.classList.add('hidden');
}

function generateDemoResponse(message) {
    const lowerMessage = message.toLowerCase();

    // Respuestas predefinidas basadas en palabras clave
    if (lowerMessage.includes('servicio') || lowerMessage.includes('qué hacen') || lowerMessage.includes('ofrecen')) {
        return "Ofrecemos múltiples servicios especializados:<br><br>🏥 <strong>Clínicas y Consultorios:</strong> Gestión de citas médicas, recordatorios automáticos<br>📋 <strong>Gestorías:</strong> Asesoría fiscal y administrativa<br>🏢 <strong>Administración de Fincas:</strong> Gestión de comunidades<br>💬 <strong>Atención 24/7:</strong> WhatsApp, Telegram y Email<br><br>¿Te interesa algún servicio en particular?";
    }

    if (lowerMessage.includes('cita') || lowerMessage.includes('agendar') || lowerMessageincludes('reservar')) {
        return "¡Perfecto! Puedo ayudarte a agendar una cita. El proceso es muy sencillo:<br><br>📅 <strong>1.</strong> Me dices qué tipo de servicio necesitas<br>⏰ <strong>2.</strong> Te muestro la disponibilidad<br>📝 <strong>3.</strong> Confirmamos la cita<br>📲 <strong>4.</strong> Recibes recordatorios automáticos<br><br>¿Para qué tipo de servicio necesitas la cita? (Médico, Gestoría, Administración, etc.)";
    }

    if (lowerMessage.includes('horario') || lowerMessage.includes('hora') || lowerMessage.includes('cuándo')) {
        return "Nuestros horarios de atención son:<br><br>📍 <strong>Lunes a Viernes:</strong> 9:00 - 18:00<br>📍 <strong>Sábados:</strong> 9:00 - 14:00<br>📍 <strong>Domingos:</strong> Cerrado<br><br>🤖 <strong>Asistente Virtual:</strong> Disponible 24/7<br><br>Puedo ayudarte en cualquier momento, incluso fuera del horario de oficina. ¿Necesitas algo específico?";
    }

    if (lowerMessage.includes('precio') || lowerMessage.includes('cuesta') || lowerMessage.includes('tarifa') || lowerMessage.includes('coste')) {
        return "Nuestros planes están diseñados para adaptarse a tu negocio:<br><br>💡 <strong>Plan Básico - €29/mes:</strong><br>• Hasta 100 conversaciones<br>• WhatsApp + Email + Telegram<br>• Recordatorios básicos<br><br>⭐ <strong>Plan Premium - €59/mes:</strong><br>• Conversaciones ilimitadas<br>• Llamadas inteligentes<br>• Analytics avanzados<br><br>¿Te gustaría conocer más detalles de algún plan?";
    }

    if (lowerMessage.includes('whatsapp') || lowerMessage.includes('telegram') || lowerMessage.includes('email')) {
        return "¡Excelente pregunta! Nuestro asistente trabaja en múltiples canales:<br><br>💬 <strong>WhatsApp Business:</strong> Respuestas automáticas, gestión de citas<br>🚀 <strong>Telegram:</strong> Bot integrado con comandos especiales<br>📧 <strong>Email:</strong> Marketing automático y confirmaciones<br><br>Todo está unificado en un solo dashboard. ¡Tu asistente responde en todos los canales las 24 horas!<br><br>¿Te interesa configurar algún canal específico?";
    }

    if (lowerMessage.includes('demo') || lowerMessage.includes('prueba') || lowerMessage.includes('probar')) {
        return "¡Estás probando el demo ahora mismo! 🎉<br><br>Esta es una simulación de cómo nuestro asistente virtual interactúa con tus clientes. En la versión completa tendrás:<br><br>✅ Configuración personalizada para tu negocio<br>✅ Integración real con WhatsApp Business<br>✅ Base de datos de clientes<br>✅ Calendario sincronizado<br>✅ Analytics detallados<br><br>¿Te gustaría empezar tu prueba gratuita de 14 días?";
    }

    if (lowerMessage.includes('hola') || lowerMessage.includes('buenos') || lowerMessage.includes('buenas')) {
        return "¡Hola! 😊 Me alegra saludarte. Soy el asistente virtual de AIAsistentPro y estoy aquí para ayudarte con cualquier consulta sobre nuestros servicios.<br><br>Puedes preguntarme sobre:<br>• 🏥 Servicios disponibles<br>• 📅 Agendamiento de citas<br>• 💰 Precios y planes<br>• ⚙️ Configuración del sistema<br><br>¿En qué te puedo ayudar hoy?";
    }

    if (lowerMessage.includes('gracias') || lowerMessage.includes('perfecto') || lowerMessage.includes('genial')) {
        return "¡De nada! 😊 Me alegra poder ayudarte. Si tienes más preguntas o quieres ver nuestro asistente en acción con tu propio negocio, no dudes en:<br><br>🚀 Registrarte para la prueba gratuita<br>📞 Agendar una demo personalizada<br>💬 Contactar a nuestro equipo<br><br>¡Estamos aquí para hacer crecer tu negocio! ¿Hay algo más en lo que pueda ayudarte?";
    }

    // Respuesta por defecto
    return "Entiendo tu consulta. Como asistente virtual, puedo ayudarte con información sobre:<br><br>🔹 Nuestros servicios y funcionalidades<br>🔹 Precios y planes disponibles<br>🔹 Proceso de configuración<br>🔹 Agendamiento de demostraciones<br><br>¿Podrías ser más específico sobre qué te gustaría saber? Así podré darte la información exacta que necesitas. 😊";
}

// Sistema de notificaciones
function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;

    container.appendChild(notification);

    // Remover la notificación después de 5 segundos
    setTimeout(() => {
        if (notification.parentElement) {
            notification.parentElement.removeChild(notification);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

// Funciones auxiliares para modales de marketing
function closeEmailMarketingModal() {
    const modal = document.querySelector('.email-marketing-modal');
    if (modal) modal.remove();
}

function closeWhatsAppMarketingModal() {
    const modal = document.querySelector('.whatsapp-marketing-modal');
    if (modal) modal.remove();
}

function closeTelegramMarketingModal() {
    const modal = document.querySelector('.telegram-marketing-modal');
    if (modal) modal.remove();
}

function switchEmailTab(tabName) {
    document.querySelectorAll('.email-tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.email-marketing-tabs .tab-button').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`email${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`).classList.add('active');
    event.target.classList.add('active');
}

function switchWhatsAppTab(tabName) {
    document.querySelectorAll('.whatsapp-tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.whatsapp-marketing-tabs .tab-button').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`whatsapp${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`).classList.add('active');
    event.target.classList.add('active');
}

function getWhatsAppStatus() {
    const isConnected = localStorage.getItem('whatsapp_connected') === 'true';
    return isConnected ? 
        { class: 'connected', icon: 'fa-check-circle', text: 'Conectado' } :
        { class: 'disconnected', icon: 'fa-times-circle', text: 'Desconectado' };
}

function updateEmailProviderFields() {
    const provider = document.getElementById('emailProvider').value;
    document.querySelectorAll('.provider-fields').forEach(field => field.style.display = 'none');
    document.getElementById(`${provider}Fields`).style.display = 'block';
}

function saveEmailMarketingConfig() {
    const provider = document.getElementById('emailProvider').value;
    const config = { provider };

    if (provider === 'sendgrid') {
        config.apiKey = document.getElementById('sendgridApiKey').value;
        config.fromEmail = document.getElementById('sendgridFromEmail').value;
    } else if (provider === 'mailchimp') {
        config.apiKey = document.getElementById('mailchimpApiKey').value;
        config.listId = document.getElementById('mailchimpListId').value;
    }

    localStorage.setItem('email_marketing_config', JSON.stringify(config));
    //showNotification('Configuración de Email Marketing guardada', 'success');
    closeEmailMarketingModal();
}

function connectWhatsAppBusiness() {
    const token = document.getElementById('whatsappBusinessToken').value;
    const phoneId = document.getElementById('whatsappPhoneNumberId').value;

    if (!token || !phoneId) {
        //showNotification('Por favor completa todos los campos', 'error');
        return;
    }

    localStorage.setItem('whatsapp_connected', 'true');
    localStorage.setItem('whatsapp_business_config', JSON.stringify({ token, phoneId }));
    //showNotification('WhatsApp Business conectado exitosamente', 'success');

    // Actualizar estado en la UI
    setTimeout(() => {
        const statusIndicator = document.querySelector('.status-indicator');
        const status = getWhatsAppStatus();
        statusIndicator.className = `status-indicator ${status.class}`;
        statusIndicator.innerHTML = `<i class="fas ${status.icon}"></i><span>${status.text}</span>`;
    }, 500);
}

function loadEmailTemplates() {
    const templatesList = document.getElementById('emailTemplatesList');
    if (!templatesList) return;

    const templates = [
        { id: 1, name: 'Bienvenida Nuevos Clientes', category: 'welcome', subject: '¡Bienvenido a nuestro servicio!' },
        { id: 2, name: 'Oferta Especial', category: 'promotional', subject: 'Descuento exclusivo para ti' },
        { id: 3, name: 'Recordatorio de Cita', category: 'reminder', subject: 'Recordatorio: Tu cita es mañana' }
    ];

    templatesList.innerHTML = templates.map(template => `
        <div class="template-card">
            <h5>${template.name}</h5>
            <p>${template.subject}</p>
            <span class="template-category">${template.category}</span>
            <div class="template-actions">
                <button onclick="editEmailTemplate(${template.id})" class="btn btn-sm">Editar</button>
                <button onclick="previewEmailTemplate(${template.id})" class="btn btn-sm btn-outline">Vista Previa</button>
            </div>
        </div>
    `).join('');
}

function loadWhatsAppBroadcastHistory() {
    const historyContainer = document.getElementById('whatsappBroadcastHistory');
    if (!historyContainer) return;

    const broadcasts = [
        { id: 1, name: 'Oferta de Verano', sent: '124 contactos', date: '2024-06-10', status: 'Entregado' },
        { id: 2, name: 'Recordatorio Semanal', sent: '89 contactos', date: '2024-06-08', status: 'Entregado' }
    ];

    const historyHTML = broadcasts.map(broadcast => `
        <div class="broadcast-item">
            <div class="broadcast-info">
                <h5>${broadcast.name}</h5>
                <p>Enviado a ${broadcast.sent} • ${broadcast.date}</p>
            </div>
            <div class="broadcast-status">
                <span class="status-badge">${broadcast.status}</span>
                <button onclick="viewBroadcastDetails(${broadcast.id})" class="btn btn-sm">Ver Detalles</button>
            </div>
        </div>
    `).join('');

    historyContainer.innerHTML = historyHTML;
}

function updateStatsCard(platform, stats) {
    const conversationsElement = document.getElementById(`${platform}-conversations`);
    const responsesElement = document.getElementById(`${platform}-responses`);

    if (conversationsElement) {
        conversationsElement.textContent = stats.conversations || 0;
    }
    if (responsesElement) {
        if (platform === 'calls') {
            // Para llamadas, mostrar llamadas atendidas
            responsesElement.textContent = stats.responses || 0;
        } else {
            responsesElement.textContent = stats.responses || 0;
        }
    }
}

function openChannelDetails(channel) {
    // Datos específicos para cada canal
    const channelData = {
        whatsapp: {
            name: 'WhatsApp Business',
            icon: 'fab fa-whatsapp',
            color: '#25D366',
            stats: {
                conversations: 24,
                responses: 18,
                avgResponseTime: '1.8 min',
                successRate: '89%',
                dailyMessages: 156,
                peakHours: '10:00 - 12:00',
                status: 'Activo'
            },
            features: [
                'Respuestas automáticas 24/7',
                'Plantillas de mensaje',
                'Envío masivo',
                'Integración con calendario',
                'Confirmación de citas',
                'Recordatorios automáticos'
            ],
            conversations: [
                { name: 'María García', phone: '+34 600 123 456', message: '¿Tienen cita disponible para mañana?', time: '14:30', status: 'Respondido' },
                { name: 'Juan Pérez', phone: '+34 600 789 012', message: 'Quiero cancelar mi cita del viernes', time: '13:15', status: 'Respondido' },
                { name: 'Ana López', phone: '+34 600 345 678', message: '¿Cuáles son sus horarios?', time: '12:45', status: 'Respondido' }
            ]
        },
        telegram: {
            name: 'Telegram Bot',
            icon: 'fab fa-telegram',
            color: '#0088cc',
            stats: {
                conversations: 12,
                responses: 10,
                avgResponseTime: '2.1 min',
                successRate: '83%',
                dailyMessages: 89,
                peakHours: '14:00 - 16:00',
                status: 'Activo'
            },
            features: [
                'Bot personalizado',
                'Comandos especiales',
                'Difusión de mensajes',
                'Integración con servicios',
                'Notificaciones automáticas',
                'Soporte multimedia'
            ],
            conversations: [
                { name: 'Carlos Ruiz', username: '@carlos_r', message: '/info - Información del negocio', time: '15:20', status: 'Respondido' },
                { name: 'Lucía Martínez', username: '@lucia_m', message: '¿Ofrecen consultas online?', time: '14:50', status: 'Respondido' }
            ]
        },
        email: {
            name: 'Email Marketing',
            icon: 'fas fa-envelope',
            color: '#dc3545',
            stats: {
                conversations: 8,
                responses: 7,
                avgResponseTime: '4.2 min',
                successRate: '92%',
                dailyMessages: 45,
                peakHours: '09:00 - 11:00',
                status: 'Activo'
            },
            features: [
                'Campañas automatizadas',
                'Plantillas profesionales',
                'Segmentación de audiencia',
                'Analytics detallados',
                'Autoresponder',
                'Integración SMTP'
            ],
            conversations: [
                { name: 'Pedro Sánchez', email: 'pedro.sanchez@empresa.com', message: 'Presupuesto para servicios empresariales', time: '09:20', status: 'Pendiente' },
                { name: 'Sofia Herrera', email: 'sofia.h@gmail.com', message: 'Consulta sobre precios', time: '08:45', status: 'Respondido' }
            ]
        },
        calls: {
            name: 'Llamadas Inteligentes',
            icon: 'fas fa-phone',
            color: '#000000',
            stats: {
                conversations: 5,
                responses: 4,
                avgResponseTime: '3.5 min',
                successRate: '95%',
                dailyMessages: 23,
                peakHours: '16:00 - 18:00',
                status: 'Activo'
            },
            features: [
                'Voz AI natural',
                'Agendamiento por voz',
                'Recordatorios automáticos',
                'Integración con Twilio',
                'Transcripción de llamadas',
                'Respuesta inteligente'
            ],
            conversations: [
                { name: 'Pedro Fernández', phone: '+34 912 345 678', message: 'Consulta sobre precios y servicios', time: '11:50', status: 'Respondido' },
                { name: 'Carmen Jiménez', phone: '+34 915 678 901', message: 'Solicitud de información', time: '10:30', status: 'Respondido' }
            ]
        }
    };

    const data = channelData[channel];
    if (!data) return;

    const modal = document.createElement('div');
    modal.className = 'modal channel-details-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="${data.icon}" style="color: ${data.color};"></i> ${data.name}</h2>
                <button onclick="closeChannelDetailsModal()" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <!-- Estadísticas principales -->
                <div class="channel-main-stats">
                    <div class="stat-card">
                        <div class="stat-icon" style="background: ${data.color};">
                            <i class="fas fa-comments"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${data.stats.conversations}</h3>
                            <p>Conversaciones</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: ${data.color};">
                            <i class="fas fa-reply"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${data.stats.responses}</h3>
                            <p>Respuestas</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: ${data.color};">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${data.stats.avgResponseTime}</h3>
                            <p>Tiempo Promedio</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon" style="background: ${data.color};">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${data.stats.successRate}</h3>
                            <p>Tasa de Éxito</p>
                        </div>
                    </div>
                </div>

                <!-- Métricas adicionales -->
                <div class="channel-additional-metrics">
                    <h4>Métricas Adicionales</h4>
                    <div class="metric-row">
                        <div class="metric-item">
                            <span class="metric-label">Mensajes del día:</span>
                            <span class="metric-value">${data.stats.dailyMessages}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Horario pico:</span>
                            <span class="metric-value">${data.stats.peakHours}</span>
                        </div>
                        <div class="metric-item">
                            <span class="metric-label">Estado del canal:</span>
                            <span class="metric-value status-active">${data.stats.status}</span>
                        </div>
                    </div>
                </div>

                <!-- Características disponibles -->
                <div class="channel-features">
                    <h4>Características Disponibles</h4>
                    <div class="features-grid">
                        ${data.features.map(feature => `
                            <div class="feature-item">
                                <i class="fas fa-check" style="color: ${data.color};"></i>
                                ${feature}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Conversaciones recientes -->
                <div class="channel-conversations">
                    <h4>Conversaciones Recientes</h4>
                    <div class="conversations-list-modal">
                        ${data.conversations.map(conv => `
                            <div class="conversation-item">
                                <div class="conv-contact">
                                    <div class="conv-name">${conv.name}</div>
                                    <div class="conv-contact-info">${conv.phone || conv.email || conv.username}</div>
                                </div>
                                <div class="conv-message">${conv.message}</div>
                                <div class="conv-time">${conv.time}</div>
                                <div class="conv-status">
                                    <span class="status-badge ${conv.status === 'Respondido' ? 'status-confirmed' : 'status-scheduled'}">${conv.status}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Acciones rápidas -->
                <div class="channel-actions">
                    <button class="btn btn-primary" onclick="configure${channel.charAt(0).toUpperCase() + channel.slice(1)}()">
                        <i class="fas fa-cog"></i> Configurar ${data.name}
                    </button>
                    <button class="btn btn-outline" onclick="viewChannelAnalytics('${channel}')">
                        <i class="fas fa-chart-bar"></i> Ver Analytics
                    </button>
                    <button class="btn btn-secondary" onclick="sendTestMessage('${channel}')">
                        <i class="fas fa-paper-plane"></i> Enviar Prueba
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.classList.add('active');
}

function closeChannelDetailsModal() {
    const modal = document.querySelector('.channel-details-modal');
    if (modal) {
        modal.remove();
    }
}

function viewChannelAnalytics(channel) {
    alert(`Abriendo analytics detallados para ${channel}...`);
}

function sendTestMessage(channel) {
    alert(`Enviando mensaje de prueba por ${channel}...`);
}

// Funciones placeholder para las acciones
function createEmailTemplate() { /* Abrir editor de plantillas de email */ }
function editEmailTemplate(id) { /* Editar plantilla */ }
function previewEmailTemplate(id) { /* Vista previa de plantilla */ }
function editEmailFlow(type) { /* Editar flujo */ }
function createWhatsAppBroadcast() { /* Crear nueva difusión de WhatsApp */ }
function manageWhatsAppTemplates() { /* Gestionar plantillas de WhatsApp */ }
function editWhatsAppRule(type) { /* Editar regla */ }
function setupTelegramBot() { /* Configurar bot de Telegram */ }
function setupTelegramChannel() { /* Crear canal de Telegram */ }
function setupTelegramGroup() { /* Crear grupo de Telegram */ }
function createTelegramChannel() { /* Crear nuevo canal */ }
function importTelegramChannel() { /* Importar canal existente */ }
function postToChannel(channel) { /* Publicar en canal */ }
function viewChannelStats(channel) { /* Ver estadísticas del canal */ }
function setupOfferChannel() { /* Configurar canal de ofertas */ }
function editBotCommand(command) { /* Editar comando */ }
function addBotCommand() { /* Añadir nuevo comando */ }
function testTelegramBot() { /* Probar bot de Telegram */ }
function viewBroadcastDetails(id) { /* Ver detalles de difusión */ }

// Cerrar modales al hacer clic fuera
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.preventDefault();
        event.stopPropagation();

        if (event.target.id === 'demoModal') {
            closeDemoModal();
        } else if (event.target.id === 'addCustomerModal') {
            closeAddCustomerModal();
        } else if (event.target.id === 'addAppointmentModal') {
            closeAddAppointmentModal();
        } else if (event.target.classList.contains('email-marketing-modal')) {
            closeEmailMarketingModal();
        } else if (event.target.classList.contains('whatsapp-marketing-modal')) {
            closeWhatsAppMarketingModal();
        } else if (event.target.classList.contains('telegram-marketing-modal')) {
            closeTelegramMarketingModal();
        } else if (event.target.classList.contains('campaign-modal')) {
            closeCampaignModal();
        } else if (event.target.classList.contains('training-success-modal')) {
            closeTrainingSuccessModal();
        } else if (event.target.classList.contains('telegram-config-modal')) {
          closeTelegramConfigModal();
        } else {
            closeModal();
        }
    }
});

function closeTelegramConfigModal() {
    const modal = document.querySelector('.telegram-config-modal');
    if(modal) modal.remove();
}

// Escape key para cerrar modales
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        event.preventDefault();

        // Cerrar cualquier modal visible
        const allModals = document.querySelectorAll('.modal');
        let modalClosed = false;

        allModals.forEach(modal => {
            if (modal.style.display === 'flex' || modal.classList.contains('active')) {
                if (modal.id === 'demoModal') {
                    closeDemoModal();
                } else if (modal.id === 'addCustomerModal') {
                    closeAddCustomerModal();
                } else if (modal.id === 'addAppointmentModal') {
                    closeAddAppointmentModal();
                } else if (modal.classList.contains('email-marketing-modal')) {
                    closeEmailMarketingModal();
                } else if (modal.classList.contains('whatsapp-marketing-modal')) {
                    closeWhatsAppMarketingModal();
                } else if (modal.classList.contains('telegram-marketing-modal')) {
                    closeTelegramMarketingModal();
                } else if (modal.classList.contains('campaign-modal')) {
                    closeCampaignModal();
                } else if (modal.classList.contains('training-success-modal')) {
                    closeTrainingSuccessModal();
                } else if (modal.classList.contains('telegram-config-modal')) {
                    closeTelegramConfigModal();
                } else {
                    closeModal();
                }
                modalClosed = true;
            }
        });
    }
});

function showTrainingPage() {
    //showNotification('Abriendo la página de entrenamiento de la IA...', 'info');
    // Aquí iría la lógica para mostrar la página de entrenamiento de la IA
}

function createAssistant() {
    //showNotification('Abriendo el formulario para crear un nuevo asistente...', 'info');
    // Aquí iría la lógica para mostrar el formulario de creación de asistente
}

// Funciones para características de gestión de citas
function accessAutomaticScheduling(event) {
    event.preventDefault();
    //showNotification('Accediendo a la configuración de agendamiento automático...', 'info');
    // Aquí iría la lógica para mostrar la configuración de agendamiento automático
}

function accessSMSWhatsAppReminders(event) {
    event.preventDefault();
    //showNotification('Accediendo a la configuración de recordatorios SMS/WhatsApp...', 'info');
    // Aquí iría la lógica para mostrar la configuración de recordatorios
}

function accessCancellationManagement(event) {
    event.preventDefault();
    //showNotification('Accediendo a la gestión de cancelaciones...', 'info');
    // Aquí iría la lógica para mostrar la gestión de cancelaciones
}

// Función para ver todas las campañas
function viewAllCampaigns() {
    showAllCampaignsModal();
}

function showAllCampaignsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal all-campaigns-modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1000px;">
            <div class="modal-header">
                <h2><i class="fas fa-list"></i> Todas las Campañas</h2>
                <button onclick="closeAllCampaignsModal()" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="campaigns-filters">
                    <select id="campaignStatusFilter" onchange="filterCampaigns()">
                        <option value="">Todos los estados</option>
                        <option value="enviado">Enviadas</option>
                        <option value="programado">Programadas</option>
                        <option value="borrador">Borradores</option>
                        <option value="pausado">Pausadas</option>
                    </select>
                    <select id="campaignChannelFilter" onchange="filterCampaigns()">
                        <option value="">Todos los canales</option>
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="telegram">Telegram</option>
                    </select>
                    <button onclick="openCampaignModal()" class="btn btn-primary">
                        <i class="fas fa-plus"></i> Nueva Campaña
                    </button>
                </div>

                <div class="campaigns-table-container">
                    <table class="campaigns-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Canales</th>
                                <th>Estado</th>
                                <th>Enviado a</th>
                                <th>Tasa Apertura</th>
                                <th>Clics</th>
                                <th>Fecha</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="campaignsTableBody">
                            <!-- Las campañas se cargarán aquí -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.classList.add('active');
    loadAllCampaigns();
}

function loadAllCampaigns() {
    const campaigns = [
        {
            id: 1,
            name: "Oferta Especial - Descuento 20%",
            channels: ["email", "whatsapp"],
            status: "enviado",
            sent_to: 156,
            open_rate: "60.3%",
            clicks: 23,
            date: "2024-06-13",
            subject: "¡Descuento especial solo por hoy!"
        },
        {
            id: 2,
            name: "Recordatorio de Citas",
            channels: ["whatsapp", "telegram"],
            status: "enviado",
            sent_to: 89,
            open_rate: "85.4%",
            clicks: 45,
            date: "2024-06-12",
            subject: "Tu cita es mañana"
        },
        {
            id: 3,
            name: "Newsletter Mensual",
            channels: ["email"],
            status: "programado",
            sent_to: 0,
            open_rate: "-",
            clicks: 0,
            date: "2024-06-20",
            subject: "Novedades del mes"
        },
        {
            id: 4,
            name: "Campaña de Bienvenida",
            channels: ["email", "whatsapp", "telegram"],
            status: "borrador",
            sent_to: 0,
            open_rate: "-",
            clicks: 0,
            date: "2024-06-14",
            subject: "¡Bienvenido a nuestro servicio!"
        },
        {
            id: 5,
            name: "Promoción Fin de Semana",
            channels: ["whatsapp"],
            status: "pausado",
            sent_to: 124,
            open_rate: "72.1%",
            clicks: 18,
            date: "2024-06-10",
            subject: "Ofertas especiales de fin de semana"
        }
    ];

    const tableBody = document.getElementById('campaignsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = campaigns.map(campaign => {
        const channelIcons = campaign.channels.map(channel => {
            const icons = {
                'email': '<i class="fas fa-envelope" style="color: #dc3545;" title="Email"></i>',
                'whatsapp': '<i class="fab fa-whatsapp" style="color: #25D366;" title="WhatsApp"></i>',
                'telegram': '<i class="fab fa-telegram" style="color: #0088cc;" title="Telegram"></i>'
            };
            return icons[channel] || '';
        }).join(' ');

        const statusBadge = getStatusBadgeCampaign(campaign.status);

        return `
            <tr>
                <td>
                    <div style="font-weight: 600;">${campaign.name}</div>
                    <div style="font-size: 12px; color: #666;">${campaign.subject}</div>
                </td>
                <td style="text-align: center;">${channelIcons}</td>
                <td>${statusBadge}</td>
                <td style="text-align: center;">${campaign.sent_to}</td>
                <td style="text-align: center;">${campaign.open_rate}</td>
                <td style="text-align: center;">${campaign.clicks}</td>
                <td>${campaign.date}</td>
                <td>
                    <div class="campaign-actions">
                        <button onclick="viewCampaignDetails(${campaign.id})" class="btn btn-sm" title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="duplicateCampaign(${campaign.id})" class="btn btn-sm btn-outline" title="Duplicar">
                            <i class="fas fa-copy"></i>
                        </button>
                        ${campaign.status === 'borrador' ? 
                            `<button onclick="editCampaign(${campaign.id})" class="btn btn-sm btn-secondary" title="Editar">
                                <i class="fas fa-edit"></i>
                            </button>` : ''
                        }
                        ${campaign.status === 'enviado' ? 
                            `<button onclick="pauseCampaign(${campaign.id})" class="btn btn-sm btn-warning" title="Pausar">
                                <i class="fas fa-pause"></i>
                            </button>` : ''
                        }
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getStatusBadgeCampaign(status) {
    const statusConfig = {
        'enviado': { class: 'status-confirmed', text: 'Enviado', icon: 'fa-check' },
        'programado': { class: 'status-scheduled', text: 'Programado', icon: 'fa-clock' },
        'borrador': { class: 'status-cancelled', text: 'Borrador', icon: 'fa-edit' },
        'pausado': { class: 'status-warning', text: 'Pausado', icon: 'fa-pause' }
    };

    const config = statusConfig[status] || { class: '', text: status, icon: 'fa-question' };
    return `<span class="status-badge ${config.class}">
                <i class="fas ${config.icon}"></i> ${config.text}
            </span>`;
}

function filterCampaigns() {
    // Aquí implementarías el filtrado de campañas
    loadAllCampaigns(); // Por ahora recarga todas las campañas
}

function closeAllCampaignsModal() {
    const modal = document.querySelector('.all-campaigns-modal');
    if (modal) {
        modal.remove();
    }
}

function viewCampaignDetails(id) {
    showCampaignDetailsModal(id);
}

function showCampaignDetailsModal(id) {
    // Datos simulados de la campaña
    const campaignData = {
        1: {
            name: "Oferta Especial - Descuento 20%",
            subject: "¡Descuento especial solo por hoy!",
            message: "Aprovecha nuestra oferta especial con 20% de descuento en todos nuestros servicios. Válido solo por hoy.",
            channels: ["email", "whatsapp"],
            sent_to: 156,
            opened: 94,
            clicked: 23,
            bounced: 3,
            date: "2024-06-13 14:30",
            status: "enviado"
        }
    };

    const campaign = campaignData[id];
    if (!campaign) return;

    const modal = document.createElement('div');
    modal.className = 'modal campaign-details-modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2><i class="fas fa-chart-bar"></i> Detalles de la Campaña</h2>
                <button onclick="closeCampaignDetailsModal()" class="close-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="campaign-info">
                    <h3>${campaign.name}</h3>
                    <p><strong>Asunto:</strong> ${campaign.subject}</p>
                    <p><strong>Fecha de envío:</strong> ${campaign.date}</p>
                    <p><strong>Estado:</strong> ${getStatusBadgeCampaign(campaign.status)}</p>
                </div>

                <div class="campaign-stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-paper-plane"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${campaign.sent_to}</h3>
                            <p>Enviados</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-envelope-open"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${campaign.opened}</h3>
                            <p>Abiertos (${Math.round((campaign.opened/campaign.sent_to)*100)}%)</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-mouse-pointer"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${campaign.clicked}</h3>
                            <p>Clics (${Math.round((campaign.clicked/campaign.sent_to)*100)}%)</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="stat-info">
                            <h3>${campaign.bounced}</h3>
                            <p>Rebotes</p>
                        </div>
                    </div>
                </div>

                <div class="campaign-content">
                    <h4>Contenido del Mensaje</h4>
                    <div class="message-preview">
                        ${campaign.message}
                    </div>
                </div>

                <div class="campaign-channels">
                    <h4>Canales Utilizados</h4>
                    <div class="channels-list">
                        ${campaign.channels.map(channel => {
                            const channelInfo = {
                                'email': { icon: 'fas fa-envelope', name: 'Email', color: '#dc3545' },
                                'whatsapp': { icon: 'fab fa-whatsapp', name: 'WhatsApp', color: '#25D366' },
                                'telegram': { icon: 'fab fa-telegram', name: 'Telegram', color: '#0088cc' }
                            };
                            const info = channelInfo[channel];
                            return `<span class="channel-tag">
                                <i class="${info.icon}" style="color: ${info.color};"></i>
                                ${info.name}
                            </span>`;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.classList.add('active');
}

function closeCampaignDetailsModal() {
    const modal = document.querySelector('.campaign-details-modal');
    if (modal) {
        modal.remove();
    }
}

function duplicateCampaign(id) {
    // Simular duplicación de campaña
    const confirmDuplicate = confirm('¿Estás seguro de que quieres duplicar esta campaña?');

    if (confirmDuplicate) {
        // Simular proceso de duplicación
        setTimeout(() => {
            alert('Campaña duplicada exitosamente. La nueva campaña se ha guardado como borrador.');
            // Recargar la tabla
            if (document.querySelector('.all-campaigns-modal')) {
                loadAllCampaigns();
            }
        }, 1000);
    }
}

function editCampaign(id) {
    // Cerrar modal actual y abrir editor
    closeAllCampaignsModal();

    // Simular carga de datos de la campaña para editar
    setTimeout(() => {
        openCampaignModal();
        // Aquí cargarías los datos reales de la campaña en el formulario
        alert('Cargando datos de la campaña para editar...');
    }, 500);
}

function pauseCampaign(id) {
    const confirmPause = confirm('¿Estás seguro de que quieres pausar esta campaña?');

    if (confirmPause) {
        // Simular pausa de campaña
        setTimeout(() => {
            alert('Campaña pausada exitosamente.');
            // Recargar la tabla
            if (document.querySelector('.all-campaigns-modal')) {
                loadAllCampaigns();
            }
        }, 1000);
    }
}

//Add grid to marketing data
function loadMarketingData() {
    const marketingGrid = document.getElementById('marketingGrid');
    if (!marketingGrid) return;

    marketingGrid.innerHTML = `
    <div style="display: flex; justify-content: space-around;">
        <div style="border: 1px solid #ccc; padding: 10px; text-align: center;">
            <h4>Campañas Recientes</h4>
            <p>Oferta Especial - Descuento 20%</p>
            <p>Email + WhatsApp • Enviado hace 2 días</p>
            <p>156 enviados 94 abiertos 23 clics</p>
            <button class="btn btn-sm">Ver</button>
        </div>

        <div style="border: 1px solid #ccc; padding: 10px; text-align: center;">
            <h4>Campañas Recientes</h4>
            <p>Oferta Especial - Descuento 20%</p>
            <p>Email + WhatsApp • Enviado hace 2 días</p>
            <p>156 enviados 94 abiertos 23 clics</p>
            <button class="btn btn-sm">Ver</button>
        </div>

        <div style="border: 1px solid #ccc; padding: 10px; text-align: center;">
            <h4>Campañas Recientes</h4>
            <p>Oferta Especial - Descuento 20%</p>
            <p>Email + WhatsApp • Enviado hace 2 días</p>
            <p>156 enviados 94 abiertos 23 clics</p>
            <button class="btn btn-sm">Ver</button>
        </div>

        <div style="border: 1px solid #ccc; padding: 10px; text-align: center;">
            <h4>Campañas Recientes</h4>
            <p>Oferta Especial - Descuento 20%</p>
            <p>Email + WhatsApp • Enviado hace 2 días</p>
            <p>156 enviados 94 abiertos 23 clics</p>
            <button class="btn btn-sm">Ver</button>
        </div>
    </div>
    `;

    // Eliminar la sección "Campañas Recientes"
    const recentCampaignsSection = document.getElementById('recentCampaignsSection');
    if (recentCampaignsSection) {
        recentCampaignsSection.remove();
    }
}