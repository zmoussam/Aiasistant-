
// Variables globales para entrenamiento
let currentTrainingData = [];
let currentCategories = [];
let editingTrainingId = null;

// Inicializar página de entrenamiento
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('training.html')) {
        initializeTraining();
    }
});

function initializeTraining() {
    setupTrainingEventListeners();
    loadTrainingData();
    loadUserBusinessType();
}

function setupTrainingEventListeners() {
    // Formulario de entrenamiento manual
    const trainingForm = document.getElementById('trainingForm');
    if (trainingForm) {
        trainingForm.addEventListener('submit', handleTrainingSubmit);
    }

    // Formulario de análisis de contenido
    const contentForm = document.getElementById('contentAnalysisForm');
    if (contentForm) {
        contentForm.addEventListener('submit', handleContentAnalysis);
    }

    // Formulario de edición
    const editForm = document.getElementById('editTrainingForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditTraining);
    }
}

function showTab(tabName) {
    // Ocultar todas las pestañas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostrar pestaña seleccionada
    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');

    // Cargar contenido específico de la pestaña
    if (tabName === 'knowledge') {
        loadKnowledgeBase();
    } else if (tabName === 'templates') {
        loadUserBusinessType();
    }
}

async function handleTrainingSubmit(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const keywords = formData.get('keywords') ? formData.get('keywords').split(',').map(k => k.trim()) : [];
    
    const trainingData = {
        training_type: formData.get('training_type'),
        question: formData.get('question'),
        answer: formData.get('answer'),
        category: formData.get('category'),
        keywords: keywords
    };

    try {
        const response = await fetch('/api/training/data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify(trainingData)
        });

        const result = await response.json();

        if (response.ok) {
            showNotification('Entrenamiento agregado exitosamente', 'success');
            event.target.reset();
            loadTrainingData();
        } else {
            showNotification(result.error || 'Error agregando entrenamiento', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'error');
    }
}

async function loadTrainingData() {
    try {
        const response = await fetch('/api/training/data', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            currentTrainingData = result.training_data;
            updateTrainingStats();
            loadCategories();
        } else {
            console.error('Error loading training data:', result.error);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function updateTrainingStats() {
    const totalQuestions = currentTrainingData.length;
    const categories = [...new Set(currentTrainingData.map(item => item.category).filter(Boolean))];
    
    document.getElementById('totalQuestions').textContent = totalQuestions;
    document.getElementById('totalCategories').textContent = categories.length;
    
    // Calcular precisión basada en el estado de los entrenamientos
    const completedTraining = currentTrainingData.filter(item => item.status === 'completed').length;
    const accuracy = totalQuestions > 0 ? Math.round((completedTraining / totalQuestions) * 100) : 0;
    document.getElementById('trainingAccuracy').textContent = accuracy + '%';
}

function loadCategories() {
    const categories = [...new Set(currentTrainingData.map(item => item.category).filter(Boolean))];
    currentCategories = categories;
    
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.innerHTML = '<option value="">Todas las categorías</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }
}

async function loadTemplates() {
    const businessType = document.getElementById('businessTypeSelect').value;
    const autoTrainBtn = document.getElementById('autoTrainBtn');
    
    if (!businessType) {
        autoTrainBtn.style.display = 'none';
        return;
    }

    // Mostrar botón de entrenamiento automático
    autoTrainBtn.style.display = 'inline-block';

    try {
        const response = await fetch(`/api/training/templates/${businessType}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            displayTemplates(result);
        } else {
            showNotification('Error cargando plantillas', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'error');
    }
}

async function autoTrainAssistant() {
    const businessType = document.getElementById('businessTypeSelect').value;
    if (!businessType) {
        showNotification('Selecciona un tipo de negocio primero', 'error');
        return;
    }

    const autoTrainBtn = document.getElementById('autoTrainBtn');
    const originalText = autoTrainBtn.innerHTML;
    autoTrainBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrenando...';
    autoTrainBtn.disabled = true;

    try {
        const response = await fetch(`/api/training/auto-train/${businessType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });

        const result = await response.json();

        if (response.ok) {
            showNotification(
                `¡Éxito! Se entrenó el asistente con ${result.training_items_added} preguntas y respuestas para ${getBusinessTypeName(businessType)}`,
                'success'
            );
            
            // Actualizar estadísticas y datos
            loadTrainingData();
            
            // Mostrar modal de confirmación
            showTrainingSuccessModal(result);
        } else {
            showNotification(result.error || 'Error entrenando asistente', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'error');
    } finally {
        autoTrainBtn.innerHTML = originalText;
        autoTrainBtn.disabled = false;
    }
}

function getBusinessTypeName(businessType) {
    const names = {
        'clinic': 'Clínicas y Consultorios',
        'management': 'Gestorías',
        'property_admin': 'Administradores de Fincas',
        'ecommerce': 'E-commerce'
    };
    return names[businessType] || businessType;
}

function showTrainingSuccessModal(result) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-check-circle" style="color: #10b981;"></i> Entrenamiento Completado</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <div class="success-summary">
                    <div class="success-stat">
                        <div class="stat-number">${result.training_items_added}</div>
                        <div class="stat-label">Preguntas y Respuestas Agregadas</div>
                    </div>
                    <div class="success-stat">
                        <div class="stat-number">${result.categories.length}</div>
                        <div class="stat-label">Categorías Creadas</div>
                    </div>
                </div>
                
                <div class="categories-list">
                    <h4>Categorías agregadas:</h4>
                    <div class="categories-tags">
                        ${result.categories.map(category => `
                            <span class="category-tag">${category}</span>
                        `).join('')}
                    </div>
                </div>
                
                <p>Tu asistente virtual ahora está entrenado con información específica de tu sector y puede responder preguntas relacionadas con tu negocio.</p>
                
                <div class="modal-actions">
                    <button class="btn btn-primary" onclick="showTab('knowledge'); this.closest('.modal').remove();">
                        <i class="fas fa-eye"></i> Ver Base de Conocimientos
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function displayTemplates(templateData) {
    const container = document.getElementById('templatesContainer');
    container.innerHTML = '';

    templateData.sample_questions.forEach((sample, index) => {
        const templateCard = document.createElement('div');
        templateCard.className = 'template-card';
        templateCard.innerHTML = `
            <div class="template-header">
                <h4>${sample.category}</h4>
                <button class="btn btn-small btn-primary" onclick="useTemplate(${index})">
                    <i class="fas fa-plus"></i> Usar
                </button>
            </div>
            <div class="template-content">
                <div class="template-question">
                    <strong>P:</strong> ${sample.question}
                </div>
                <div class="template-answer">
                    <strong>R:</strong> ${sample.answer}
                </div>
                <div class="template-keywords">
                    <strong>Palabras clave:</strong> ${sample.keywords.join(', ')}
                </div>
            </div>
        `;
        container.appendChild(templateCard);
    });
}

function useTemplate(index) {
    const businessType = document.getElementById('businessTypeSelect').value;
    
    fetch(`/api/training/templates/${businessType}`)
        .then(response => response.json())
        .then(result => {
            const template = result.sample_questions[index];
            
            // Cambiar a la pestaña manual y llenar el formulario
            showTab('manual');
            
            document.getElementById('trainingQuestion').value = template.question;
            document.getElementById('trainingAnswer').value = template.answer;
            document.getElementById('trainingCategory').value = template.category;
            document.getElementById('trainingKeywords').value = template.keywords.join(', ');
            
            showNotification('Plantilla cargada en el formulario', 'success');
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('Error cargando plantilla', 'error');
        });
}

async function handleContentAnalysis(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const content = formData.get('content');
    
    if (!content.trim()) {
        showNotification('Por favor ingresa contenido para analizar', 'error');
        return;
    }

    const analyzeButton = event.target.querySelector('button[type="submit"]');
    const originalText = analyzeButton.innerHTML;
    analyzeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analizando...';
    analyzeButton.disabled = true;

    try {
        const response = await fetch('/api/training/analyze-content', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
                content: content,
                business_type: currentUser?.business_type || ''
            })
        });

        const result = await response.json();

        if (response.ok && result.suggestions.length > 0) {
            showContentSuggestions(result.suggestions);
            showNotification(`Se generaron ${result.suggestions.length} sugerencias`, 'success');
        } else {
            showNotification('No se pudieron generar sugerencias del contenido', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error analizando contenido', 'error');
    } finally {
        analyzeButton.innerHTML = originalText;
        analyzeButton.disabled = false;
    }
}

function showContentSuggestions(suggestions) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.innerHTML = `
        <div class="modal-content large">
            <div class="modal-header">
                <h3>Sugerencias de Entrenamiento</h3>
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
            </div>
            <div class="modal-body">
                <p>Selecciona las preguntas y respuestas que quieres agregar a tu entrenamiento:</p>
                <div class="suggestions-list">
                    ${suggestions.map((suggestion, index) => `
                        <div class="suggestion-item">
                            <div class="suggestion-checkbox">
                                <input type="checkbox" id="suggestion-${index}" checked>
                                <label for="suggestion-${index}"></label>
                            </div>
                            <div class="suggestion-content">
                                <div class="suggestion-question">
                                    <strong>P:</strong> ${suggestion.question}
                                </div>
                                <div class="suggestion-answer">
                                    <strong>R:</strong> ${suggestion.answer}
                                </div>
                                <div class="suggestion-meta">
                                    <span class="category">${suggestion.category || 'General'}</span>
                                    <span class="keywords">${(suggestion.keywords || []).join(', ')}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">
                        Cancelar
                    </button>
                    <button class="btn btn-primary" onclick="addSelectedSuggestions()">
                        <i class="fas fa-plus"></i> Agregar Seleccionados
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Función para agregar sugerencias seleccionadas
    window.addSelectedSuggestions = async function() {
        const selectedSuggestions = [];
        suggestions.forEach((suggestion, index) => {
            const checkbox = document.getElementById(`suggestion-${index}`);
            if (checkbox.checked) {
                selectedSuggestions.push({
                    training_type: 'faq',
                    question: suggestion.question,
                    answer: suggestion.answer,
                    category: suggestion.category,
                    keywords: suggestion.keywords || []
                });
            }
        });
        
        if (selectedSuggestions.length === 0) {
            showNotification('Selecciona al menos una sugerencia', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/training/bulk-upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
                },
                body: JSON.stringify({
                    training_data: selectedSuggestions,
                    auto_categorize: true
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showNotification(`Se agregaron ${selectedSuggestions.length} entrenamientos`, 'success');
                modal.remove();
                loadTrainingData();
                document.getElementById('contentAnalysisForm').reset();
            } else {
                showNotification(result.error || 'Error agregando entrenamientos', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error de conexión', 'error');
        }
    };
}

function loadKnowledgeBase() {
    const knowledgeList = document.getElementById('knowledgeList');
    knowledgeList.innerHTML = '';
    
    if (currentTrainingData.length === 0) {
        knowledgeList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-brain"></i>
                <h3>No hay entrenamientos aún</h3>
                <p>Comienza agregando preguntas y respuestas para entrenar tu IA</p>
                <button class="btn btn-primary" onclick="showTab('manual')">
                    <i class="fas fa-plus"></i> Agregar Primer Entrenamiento
                </button>
            </div>
        `;
        return;
    }
    
    currentTrainingData.forEach(training => {
        const trainingCard = document.createElement('div');
        trainingCard.className = 'training-card';
        trainingCard.innerHTML = `
            <div class="training-header">
                <div class="training-meta">
                    <span class="training-type">${training.training_type}</span>
                    ${training.category ? `<span class="training-category">${training.category}</span>` : ''}
                </div>
                <div class="training-actions">
                    <button class="btn-icon" onclick="editTraining('${training.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon danger" onclick="deleteTraining('${training.id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="training-content">
                <div class="training-question">
                    <strong>Pregunta:</strong> ${training.question}
                </div>
                <div class="training-answer">
                    <strong>Respuesta:</strong> ${training.answer}
                </div>
                ${training.keywords.length > 0 ? `
                    <div class="training-keywords">
                        <strong>Palabras clave:</strong> ${training.keywords.join(', ')}
                    </div>
                ` : ''}
            </div>
        `;
        knowledgeList.appendChild(trainingCard);
    });
}

function filterKnowledge() {
    const searchTerm = document.getElementById('knowledgeSearch').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    
    let filteredData = currentTrainingData;
    
    if (searchTerm) {
        filteredData = filteredData.filter(training => 
            training.question.toLowerCase().includes(searchTerm) ||
            training.answer.toLowerCase().includes(searchTerm) ||
            training.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
        );
    }
    
    if (categoryFilter) {
        filteredData = filteredData.filter(training => training.category === categoryFilter);
    }
    
    // Mostrar resultados filtrados
    const knowledgeList = document.getElementById('knowledgeList');
    knowledgeList.innerHTML = '';
    
    filteredData.forEach(training => {
        const trainingCard = document.createElement('div');
        trainingCard.className = 'training-card';
        trainingCard.innerHTML = `
            <div class="training-header">
                <div class="training-meta">
                    <span class="training-type">${training.training_type}</span>
                    ${training.category ? `<span class="training-category">${training.category}</span>` : ''}
                </div>
                <div class="training-actions">
                    <button class="btn-icon" onclick="editTraining('${training.id}')" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon danger" onclick="deleteTraining('${training.id}')" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="training-content">
                <div class="training-question">
                    <strong>Pregunta:</strong> ${training.question}
                </div>
                <div class="training-answer">
                    <strong>Respuesta:</strong> ${training.answer}
                </div>
                ${training.keywords.length > 0 ? `
                    <div class="training-keywords">
                        <strong>Palabras clave:</strong> ${training.keywords.join(', ')}
                    </div>
                ` : ''}
            </div>
        `;
        knowledgeList.appendChild(trainingCard);
    });
}

function editTraining(trainingId) {
    const training = currentTrainingData.find(t => t.id === trainingId);
    if (!training) return;
    
    editingTrainingId = trainingId;
    
    document.getElementById('editTrainingId').value = trainingId;
    document.getElementById('editQuestion').value = training.question;
    document.getElementById('editAnswer').value = training.answer;
    document.getElementById('editCategory').value = training.category || '';
    document.getElementById('editKeywords').value = training.keywords.join(', ');
    
    document.getElementById('editTrainingModal').classList.add('active');
}

async function handleEditTraining(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const keywords = formData.get('keywords') ? formData.get('keywords').split(',').map(k => k.trim()) : [];
    
    const updateData = {
        question: formData.get('question'),
        answer: formData.get('answer'),
        category: formData.get('category'),
        keywords: keywords
    };
    
    try {
        const response = await fetch(`/api/training/data/${editingTrainingId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify(updateData)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Entrenamiento actualizado exitosamente', 'success');
            closeEditModal();
            loadTrainingData();
        } else {
            showNotification(result.error || 'Error actualizando entrenamiento', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'error');
    }
}

async function deleteTraining(trainingId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este entrenamiento?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/training/data/${trainingId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification('Entrenamiento eliminado exitosamente', 'success');
            loadTrainingData();
        } else {
            showNotification(result.error || 'Error eliminando entrenamiento', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'error');
    }
}

function closeEditModal() {
    document.getElementById('editTrainingModal').classList.remove('active');
    editingTrainingId = null;
}

function loadUserBusinessType() {
    if (currentUser && currentUser.business_type) {
        const businessTypeSelect = document.getElementById('businessTypeSelect');
        if (businessTypeSelect) {
            businessTypeSelect.value = currentUser.business_type;
            loadTemplates();
        }
    }
}

function handleFileUpload() {
    const fileInput = document.getElementById('bulkFileInput');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let data;
            if (file.type === 'application/json') {
                data = JSON.parse(e.target.result);
            } else {
                // Para CSV, necesitarías una librería de parsing o implementar parsing manual
                showNotification('Formato CSV no implementado aún. Usa JSON por ahora.', 'error');
                return;
            }
            
            if (Array.isArray(data)) {
                uploadBulkData(data);
            } else {
                showNotification('Formato de archivo inválido', 'error');
            }
        } catch (error) {
            showNotification('Error leyendo archivo', 'error');
        }
    };
    reader.readAsText(file);
}

async function uploadBulkData(data) {
    try {
        const response = await fetch('/api/training/bulk-upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify({
                training_data: data,
                auto_categorize: true
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showNotification(`Se cargaron ${result.created_count} entrenamientos exitosamente`, 'success');
            loadTrainingData();
            document.getElementById('bulkFileInput').value = '';
        } else {
            showNotification(result.error || 'Error en carga masiva', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error de conexión', 'error');
    }
}
