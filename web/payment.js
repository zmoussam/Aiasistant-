// Variables globales
let stripe = null;
let elements = null;
let cardElements = {};
let currentPlan = null;

// Datos de los planes (precios base sin IVA)
const plansData = {
    trial: {
        name: 'Prueba Gratuita',
        price: 0.00
    },
    basic: {
        name: 'Plan Básico',
        price: 29.00
    },
    premium: {
        name: 'Plan Premium',
        price: 59.00
    },
    enterprise: {
        name: 'Plan Enterprise',
        price: 99.00
    }
};

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, inicializando payment...');
    initializePayment();
    setupEventListeners();

    // Validación inicial después de un breve delay
    setTimeout(() => {
        updateSubmitButton();
    }, 500);

    // Validación adicional cada 2 segundos para asegurar sincronización
    setInterval(() => {
        updateSubmitButton();
    }, 2000);
});

async function initializePayment() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const planType = urlParams.get('plan');

        if (!planType || !plansData[planType]) {
            showError('Plan no válido. Redirigiendo...');
            setTimeout(() => window.location.href = '/', 2000);
            return;
        }

        currentPlan = planType;
        displayPlanInfo(planType);

        // Inicializar Stripe después de cargar el plan
        setTimeout(() => {
            initializeStripe();
        }, 100);

        prefillUserData();

    } catch (error) {
        console.error('Error inicializando pago:', error);
        showError('Error al cargar la página de pago');
    }
}

async function initializeStripe() {
    // Siempre usar formulario de respaldo ya que la clave de Stripe es demo
    console.log('Inicializando formulario de tarjeta personalizado');
    initializeFallbackCardForm();
}

function setupCardEventListeners() {
    const displayError = document.getElementById('card-errors');

    // Listener para número de tarjeta
    cardElements.cardNumber.on('change', function(event) {
        if (event.error) {
            displayError.textContent = event.error.message;
            displayError.style.display = 'block';
        } else {
            displayError.style.display = 'none';
        }
        updateSubmitButton();
    });

    // Listener para fecha de caducidad
    cardElements.cardExpiry.on('change', function(event) {
        if (event.error) {
            displayError.textContent = event.error.message;
            displayError.style.display = 'block';
        } else {
            displayError.style.display = 'none';
        }
        updateSubmitButton();
    });

    // Listener para CVC
    cardElements.cardCvc.on('change', function(event) {
        if (event.error) {
            displayError.textContent = event.error.message;
            displayError.style.display = 'block';
        } else {
            displayError.style.display = 'none';
        }
        updateSubmitButton();
    });
}

function initializeFallbackCardForm() {
    console.log('Inicializando formulario de tarjeta');

    // Configurar event listeners para los inputs de tarjeta
    const cardNumberInput = document.getElementById('fallback-card-number');
    const cardExpiryInput = document.getElementById('fallback-card-expiry');
    const cardCvcInput = document.getElementById('fallback-card-cvc');

    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            formatCardNumber(this);
            updateSubmitButton();
        });
        cardNumberInput.addEventListener('change', updateSubmitButton);
        cardNumberInput.addEventListener('paste', function(e) {
            setTimeout(() => {
                formatCardNumber(this);
                updateSubmitButton();
            }, 10);
        });
    }

    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', function(e) {
            formatCardExpiry(this);
            updateSubmitButton();
        });
        cardExpiryInput.addEventListener('change', updateSubmitButton);
    }

    if (cardCvcInput) {
        cardCvcInput.addEventListener('input', function(e) {
            formatCardCvc(this);
            updateSubmitButton();
        });
        cardCvcInput.addEventListener('change', updateSubmitButton);
    }

    // Hacer una validación inicial
    setTimeout(() => {
        updateSubmitButton();
    }, 100);

    console.log('Event listeners configurados para campos de tarjeta');
}

function displayPlanInfo(planType) {
    const plan = plansData[planType];
    const basePrice = plan.price;
    const iva = basePrice * 0.21; // 21% IVA
    const total = basePrice + iva;
    const planName = plan.name;

    // Mostrar información del plan
    const planInfoDiv = document.getElementById('planInfo');
    planInfoDiv.innerHTML = `
        <div class="plan-name">${planName}</div>
        <div class="plan-price">€${basePrice.toFixed(2)}/mes</div>
        <div class="plan-breakdown">
            <div class="price-item">
                <span>Subtotal:</span>
                <span>€${basePrice.toFixed(2)}</span>
            </div>
            <div class="price-item">
                <span>IVA (21%):</span>
                <span>€${iva.toFixed(2)}</span>
            </div>
            <div class="price-item total-line">
                <span><strong>Total:</strong></span>
                <span><strong>€${total.toFixed(2)}</strong></span>
            </div>
        </div>
    `;

    document.getElementById('totalAmount').textContent = `€${total.toFixed(2)}`;
    document.getElementById('btnAmount').textContent = `€${total.toFixed(2)}`;
    if (document.getElementById('bankReference')) {
        document.getElementById('bankReference').textContent = `PLAN-${planType.toUpperCase()}-${Date.now()}`;
    }
}

function prefillUserData() {
    const userData = localStorage.getItem('user_data');
    if (userData) {
        try {
            const user = JSON.parse(userData);
            document.getElementById('customerEmail').value = user.email || '';
            document.getElementById('businessName').value = user.business_name || '';
            document.getElementById('customerPhone').value = user.phone || '';
        } catch (error) {
            console.error('Error prellenando datos:', error);
        }
    }
}

function setupEventListeners() {
    // Payment method selection
    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', function() {
            handlePaymentMethodChange(this.value);
            updateActiveMethod(this);
            // Revalidar cuando cambie el método de pago
            setTimeout(updateSubmitButton, 100);
        });
    });

    // Form validation - agregar todos los campos importantes
    const fieldsToWatch = [
        'customerName', 
        'customerEmail', 
        'acceptTerms', 
        'cardholderName', 
        'customerPhone', 
        'businessName',
        'fallback-card-number',
        'fallback-card-expiry', 
        'fallback-card-cvc'
    ];

    fieldsToWatch.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('change', function() {
                console.log(`Campo ${inputId} cambió:`, this.value);
                updateSubmitButton();
            });
            input.addEventListener('input', function() {
                // Actualización en tiempo real para ciertos campos
                if (inputId.includes('card') || inputId === 'customerName' || inputId === 'customerEmail') {
                    updateSubmitButton();
                }
            });
            input.addEventListener('keyup', function() {
                if (inputId.includes('card')) {
                    updateSubmitButton();
                }
            });
        }
    });

    // Listener especial para checkbox de términos
    const acceptTermsCheckbox = document.getElementById('acceptTerms');
    if (acceptTermsCheckbox) {
        acceptTermsCheckbox.addEventListener('click', function() {
            console.log('Términos aceptados:', this.checked);
            setTimeout(updateSubmitButton, 50);
        });
    }

    // Form submission
    const paymentForm = document.getElementById('paymentForm');
    if (paymentForm) {
        paymentForm.addEventListener('submit', handlePaymentSubmit);
    }

    // Configurar método de pago inicial
    const defaultMethod = document.querySelector('input[name="paymentMethod"]:checked');
    if (defaultMethod) {
        handlePaymentMethodChange(defaultMethod.value);
    }
}

function updateActiveMethod(selectedRadio) {
    document.querySelectorAll('.payment-method-compact').forEach(method => {
        method.classList.remove('active');
    });
    selectedRadio.closest('.payment-method-compact').classList.add('active');
}

function handlePaymentMethodChange(method) {
    // Ocultar todas las secciones
    document.getElementById('cardPaymentSection').style.display = 'none';
    document.getElementById('paypalPaymentSection').style.display = 'none';
    document.getElementById('bankPaymentSection').style.display = 'none';

    // Mostrar la sección correspondiente
    switch(method) {
        case 'card':
            document.getElementById('cardPaymentSection').style.display = 'block';
            // Re-montar elementos de Stripe si es necesario
            if (cardElements.cardNumber && !cardElements.cardNumber._mounted) {
                setTimeout(() => {
                    try {
                        cardElements.cardNumber.mount('#card-number-element');
                        cardElements.cardExpiry.mount('#card-expiry-element');
                        cardElements.cardCvc.mount('#card-cvc-element');
                    } catch (e) {
                        console.log('Elements already mounted');
                    }
                }, 100);
            }
            break;
        case 'paypal':
            document.getElementById('paypalPaymentSection').style.display = 'block';
            initializePayPal();
            break;
        case 'bank':
            document.getElementById('bankPaymentSection').style.display = 'block';
            updateBankInfo();
            break;
    }

    updateSubmitButton();
}

function initializePayPal() {
    const paypalContainer = document.getElementById('paypal-button-container');
    const plan = plansData[currentPlan];
    const basePrice = plan.price;
    const iva = basePrice * 0.21;
    const total = (basePrice + iva).toFixed(2);

    paypalContainer.innerHTML = `
        <div style="padding: 20px; text-align: center; background: #f8f9fa; border-radius: 8px; margin: 15px 0;">
            <div style="margin-bottom: 15px;">
                <i class="fab fa-paypal" style="font-size: 48px; color: #0070ba;"></i>
            </div>
            <h4 style="color: #2c2e2f; margin-bottom: 10px;">Pago con PayPal</h4>
            <p style="color: #666; margin-bottom: 15px;">Total a pagar: <strong>€${total} (IVA incluido)</strong></p>
            <div style="margin-bottom: 15px;">
                <input type="email" id="paypalEmail" placeholder="Tu email de PayPal" 
                       style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; margin-bottom: 10px;">
            </div>
            <button type="button" onclick="processPayPalPayment()" 
                    style="background: #0070ba; color: white; padding: 12px 24px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; width: 100%;">
                <i class="fab fa-paypal"></i> Continuar con PayPal
            </button>
            <p style="font-size: 12px; color: #666; margin-top: 10px;">
                Serás redirigido a PayPal para completar el pago
            </p>
        </div>
    `;
}

function updateBankInfo() {
    const plan = plansData[currentPlan];
    const basePrice = plan.price;
    const iva = basePrice * 0.21;
    const total = (basePrice + iva).toFixed(2);
    const reference = `PLAN-${currentPlan.toUpperCase()}-${Date.now()}`;

    const bankSection = document.getElementById('bankPaymentSection');
    bankSection.innerHTML = `
        <div class="bank-info-compact">
            <h4 style="color: #2c2e2f; margin-bottom: 15px;">
                <i class="fas fa-university"></i> Datos para Transferencia Bancaria
            </h4>
            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                <p><strong>Banco:</strong> Banco Santander</p>
                <p><strong>Titular:</strong> AIAsistentPro S.L.</p>
                <p><strong>IBAN:</strong> ES21 0049 1234 5678 9012 3456</p>
                <p><strong>BIC/SWIFT:</strong> BSCHESMM</p>
                <p><strong>Importe:</strong> €${total} (IVA incluido)</p>
                <p><strong>Concepto:</strong> ${reference}</p>
                <button type="button" onclick="copyBankDetails('${reference}')" 
                        style="background: #667eea; color: white; padding: 8px 16px; border: none; border-radius: 6px; margin-top: 10px; cursor: pointer;">
                    <i class="fas fa-copy"></i> Copiar Datos
                </button>
            </div>
            <small style="color: #666; margin-top: 15px; display: block;">
                <i class="fas fa-info-circle"></i> Tu cuenta se activará en 24-48h tras recibir la transferencia.
            </small>
        </div>
    `;
}

function updateSubmitButton() {
    const submitBtn = document.getElementById('submitPayment');
    if (!submitBtn) return;

    const customerName = document.getElementById('customerName')?.value?.trim() || '';
    const customerEmail = document.getElementById('customerEmail')?.value?.trim() || '';
    const acceptTerms = document.getElementById('acceptTerms')?.checked || false;
    const paymentMethodElement = document.querySelector('input[name="paymentMethod"]:checked');

    if (!paymentMethodElement) {
        submitBtn.disabled = true;
        return;
    }

    const paymentMethod = paymentMethodElement.value;

    // Validación básica mejorada
    let isValid = customerName.length >= 2 && 
                  customerEmail.length > 0 && 
                  customerEmail.includes('@') && 
                  customerEmail.includes('.') &&
                  acceptTerms;

    console.log('Validación básica:', { 
        customerName: customerName.length, 
        customerEmail: customerEmail.length, 
        emailValid: customerEmail.includes('@') && customerEmail.includes('.'),
        acceptTerms, 
        isValid 
    });

    // Validaciones específicas por método de pago
    if (paymentMethod === 'card') {
        const cardholderName = document.getElementById('cardholderName')?.value?.trim() || '';

        // Verificar campos de tarjeta
        const fallbackCardNumber = document.getElementById('fallback-card-number');
        const fallbackCardExpiry = document.getElementById('fallback-card-expiry');
        const fallbackCardCvc = document.getElementById('fallback-card-cvc');

        if (fallbackCardNumber && fallbackCardExpiry && fallbackCardCvc) {
            const cardNumber = fallbackCardNumber.value.replace(/\s/g, '');
            const cardExpiry = fallbackCardExpiry.value;
            const cardCvc = fallbackCardCvc.value;

            const cardNumberValid = cardNumber.length >= 13 && cardNumber.length <= 19;
            const cardExpiryValid = cardExpiry.length === 5 && cardExpiry.includes('/');
            const cardCvcValid = cardCvc.length >= 3 && cardCvc.length <= 4;
            const cardholderNameValid = cardholderName.length >= 2;

            const cardValid = cardNumberValid && cardExpiryValid && cardCvcValid && cardholderNameValid;

            isValid = isValid && cardValid;
            console.log('Validación tarjeta:', { 
                cardNumber: cardNumber.length, 
                cardExpiry: cardExpiry.length, 
                cardCvc: cardCvc.length,
                cardholderName: cardholderName.length,
                cardValid 
            });
        } else {
            isValid = false;
        }
    } else if (paymentMethod === 'paypal') {
        const paypalEmail = document.getElementById('paypalEmail');
        if (paypalEmail) {
            const paypalEmailVal = paypalEmail.value.trim();
            const paypalEmailValid = paypalEmailVal.length > 0 && 
                                   paypalEmailVal.includes('@') && 
                                   paypalEmailVal.includes('.');
            isValid = isValid && paypalEmailValid;
            console.log('Validación PayPal:', { paypalEmail: paypalEmailVal, paypalEmailValid });
        } else {
            // Para PayPal, si no hay input específico, considerarlo válido
            // (se puede crear dinámicamente)
            isValid = isValid;
        }
    }
    // Para transferencia bancaria no se requieren campos adicionales

    console.log('Estado final validación:', { paymentMethod, isValid });

    submitBtn.disabled = !isValid;

    // Actualizar visualmente el botón
    if (isValid) {
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
        submitBtn.style.backgroundColor = '#667eea';
    } else {
        submitBtn.style.opacity = '0.6';
        submitBtn.style.cursor = 'not-allowed';
        submitBtn.style.backgroundColor = '#9ca3af';
    }
}

async function handlePaymentSubmit(event) {
    event.preventDefault();

    console.log('Iniciando proceso de pago...');

    const paymentMethodElement = document.querySelector('input[name="paymentMethod"]:checked');
    if (!paymentMethodElement) {
        showError('Selecciona un método de pago');
        return;
    }

    const paymentMethod = paymentMethodElement.value;
    console.log('Método de pago seleccionado:', paymentMethod);

    // Verificar que todos los campos requeridos estén llenos
    const customerName = document.getElementById('customerName')?.value?.trim();
    const customerEmail = document.getElementById('customerEmail')?.value?.trim();
    const acceptTerms = document.getElementById('acceptTerms')?.checked;

    if (!customerName || !customerEmail || !acceptTerms) {
        showError('Por favor completa todos los campos requeridos');
        return;
    }

    if (!customerEmail.includes('@')) {
        showError('Por favor introduce un email válido');
        return;
    }

    try {
        showLoading(true);
        //showNotification(`Iniciando pago con ${paymentMethod}...`, 'info');

        switch(paymentMethod) {
            case 'card':
                await processCardPayment();
                break;
            case 'paypal':
                await processPayPalPayment();
                break;
            case 'bank':
                await processBankTransfer();
                break;
            default:
                throw new Error('Método de pago no válido');
        }

    } catch (error) {
        console.error('Error procesando pago:', error);
        showError(error.message || 'Error procesando el pago');
        showLoading(false);
    }
}

async function processCardPayment() {
    try {
        //showNotification('Procesando pago con tarjeta...', 'info');

        // Verificar si estamos usando campos de respaldo
        const fallbackCardNumber = document.getElementById('fallback-card-number');

        if (fallbackCardNumber) {
            // Usar procesamiento de respaldo
            const cardNumber = fallbackCardNumber.value.replace(/\s/g, '');
            const cardExpiry = document.getElementById('fallback-card-expiry').value;
            const cardCvc = document.getElementById('fallback-card-cvc').value;
            const cardholderName = document.getElementById('cardholderName').value.trim();

            // Validar datos básicos
            if (cardNumber.length < 13 || cardExpiry.length !== 5 || cardCvc.length < 3) {
                throw new Error('Por favor verifica los datos de la tarjeta');
            }

            console.log('Procesando con datos de tarjeta:', {
                number: cardNumber.substring(0, 4) + '****',
                expiry: cardExpiry,
                holder: cardholderName
            });

        } else if (stripe && cardElements.cardNumber) {
            // Usar Stripe si está disponible
            const {error, paymentMethod} = await stripe.createPaymentMethod({
                type: 'card',
                card: cardElements.cardNumber,
                billing_details: {
                    name: document.getElementById('cardholderName').value.trim(),
                    email: document.getElementById('customerEmail').value.trim()
                }
            });

            if (error) {
                throw new Error(error.message);
            }
        } else {
            throw new Error('Sistema de pago no disponible');
        }

        // Simular procesamiento
        await new Promise(resolve => setTimeout(resolve, 2000));

        const paymentId = `card_${currentPlan}_${Date.now()}`;
        await confirmPaymentSuccess(paymentId);

    } catch (error) {
        throw new Error(error.message || 'Error procesando el pago con tarjeta');
    }
}

async function processPayPalPayment() {
    const paypalEmail = document.getElementById('paypalEmail');
    if (!paypalEmail || !paypalEmail.value.trim()) {
        throw new Error('Por favor introduce tu email de PayPal');
    }

    //showNotification('Redirigiendo a PayPal...', 'info');
    await new Promise(resolve => setTimeout(resolve, 1500));

    const paymentId = `pp_${currentPlan}_${Date.now()}`;
    await confirmPaymentSuccess(paymentId);
}

async function processBankTransfer() {
    showLoading(false);
    //showNotification('Instrucciones de transferencia enviadas por email', 'success');
    setTimeout(() => goToDashboard(), 2000);
}

async function confirmPaymentSuccess(paymentId) {
    const customerData = getCustomerData();

    try {
        const response = await fetch('/api/payments/confirm-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                payment_intent_id: paymentId,
                user_email: customerData.email,
                plan_type: currentPlan
            })
        });

        if (response.ok) {
            updateUserSubscription(await response.json());
            showLoading(false);
            showSuccessModal();
        } else {
            throw new Error('Error confirmando el pago');
        }
    } catch (error) {
        throw new Error('Error de conexión al servidor');
    }
}

function getCustomerData() {
    return {
        name: document.getElementById('customerName').value.trim(),
        email: document.getElementById('customerEmail').value.trim(),
        phone: document.getElementById('customerPhone').value.trim(),
        business_name: document.getElementById('businessName').value.trim()
    };
}

function updateUserSubscription(paymentResult) {
    try {
        const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
        userData.subscription_status = 'active';
        userData.subscription_plan = currentPlan;
        userData.subscription_id = paymentResult.subscription_id;
        localStorage.setItem('user_data', JSON.stringify(userData));
    } catch (error) {
        console.error('Error actualizando suscripción:', error);
    }
}

function showSuccessModal() {
    document.getElementById('successModal').style.display = 'flex';
}

function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function showError(message) {
    showNotification(message, 'error');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#dc2626' : type === 'warning' ? '#f59e0b' : '#10b981'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 1001;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    notification.textContent = message;

    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

function goToDashboard() {
    window.location.href = '/';
}

function openTermsModal() {
    document.getElementById('termsModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeTermsModal() {
    document.getElementById('termsModal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function acceptTermsFromModal() {
    document.getElementById('acceptTerms').checked = true;
    closeTermsModal();
    checkFormValidity();
}

function copyBankDetails(transferId) {
    const plan = plansData[currentPlan];
    const basePrice = plan.price;
    const iva = basePrice * 0.21;
    const total = (basePrice + iva).toFixed(2);
    const bankDetails = `
Banco: Banco Santander
Titular: AIAsistentPro S.L.
IBAN: ES21 0049 1234 5678 9012 3456
BIC/SWIFT: BSCHESMM
Importe: €${total} (IVA incluido)
Concepto: ${transferId}
    `;

    navigator.clipboard.writeText(bankDetails.trim()).then(() => {
        showNotification('Datos bancarios copiados al portapapeles', 'success');
    }).catch(() => {
        showNotification('No se pudieron copiar los datos', 'error');
    });
}

function showTerms() {
    // Abrir términos y condiciones
}

function showPrivacy() {
    // Abrir política de privacidad
}

function contactSupport() {
    // Contactar con soporte
}

// Funciones de formateo para campos de tarjeta
function formatCardNumber(input) {
    let value = input.value.replace(/\D/g, '');
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    if (value.length > 19) {
        value = value.substring(0, 19);
    }
    input.value = value;

    // Validar que tenga al menos 13 dígitos
    const numbersOnly = value.replace(/\s/g, '');
    if (numbersOnly.length >= 13) {
        input.style.borderColor = '#10b981';
    } else {
        input.style.borderColor = '#d1d5db';
    }
}

function formatCardExpiry(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    if (value.length > 5) {
        value = value.substring(0, 5);
    }
    input.value = value;

    // Validar formato MM/AA
    if (value.length === 5 && value.includes('/')) {
        const [month, year] = value.split('/');
        const currentYear = new Date().getFullYear() % 100;
        const currentMonth = new Date().getMonth() + 1;

        if (parseInt(month) >= 1 && parseInt(month) <= 12 && 
            (parseInt(year) > currentYear || 
             (parseInt(year) === currentYear && parseInt(month) >= currentMonth))) {
            input.style.borderColor = '#10b981';
        } else {
            input.style.borderColor = '#dc2626';
        }
    } else {
        input.style.borderColor = '#d1d5db';
    }
}

function formatCardCvc(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 4) {
        value = value.substring(0, 4);
    }
    input.value = value;

    // Validar CVC (3 o 4 dígitos)
    if (value.length >= 3) {
        input.style.borderColor = '#10b981';
    } else {
        input.style.borderColor = '#d1d5db';
    }
}

// Event listeners adicionales
document.addEventListener('change', function(e) {
    if (e.target.id === 'paypalEmail' || 
        e.target.id === 'fallback-card-number' || 
        e.target.id === 'fallback-card-expiry' || 
        e.target.id === 'fallback-card-cvc') {
        updateSubmitButton();
    }
});

document.addEventListener('input', function(e) {
    if (e.target.id === 'paypalEmail' || 
        e.target.id === 'fallback-card-number' || 
        e.target.id === 'fallback-card-expiry' || 
        e.target.id === 'fallback-card-cvc') {
        updateSubmitButton();
    }
});
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