// vendor-dashboard.js - Gestión de Mi Suscripción

const API_BASE = 'http://localhost:8000/api/v1';

// ──────────────────────────────────────────
// INICIALIZACIÓN
// ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    checkSubscriptionStatus();
    setupPaymentButtons();
});

// ──────────────────────────────────────────
// VERIFICAR ESTADO DE SUSCRIPCIÓN
// ──────────────────────────────────────────
async function checkSubscriptionStatus() {
    try {
        const response = await fetch(`${API_BASE}/vendors/vendedores/mi-status/`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            }
        });
        if (response.ok) {
            const data = await response.json();
            if (data.estado_suscripcion === 'ACTIVA') {
                document.querySelector('.subscription-panel').innerHTML = `
                    <div class="active-subscription-card">
                        <div class="status-badge">✅ Suscripción Activa</div>
                        <h2>¡Tu cuenta está operando!</h2>
                        <p>Vencimiento de tu plan: <b>${data.fecha_vencimiento}</b></p>
                        <hr style="border: 0; border-top: 1px solid rgba(255,106,0,0.2); margin: 20px 0;">
                        <p style="font-size: 0.9rem; color: var(--text-muted);">
                            Puedes gestionar tus productos y ventas desde el menú lateral.
                        </p>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error('Error al verificar status:', err);
    }
}

// ──────────────────────────────────────────
// BOTONES DE PLAN
// ──────────────────────────────────────────
function setupPaymentButtons() {
    document.querySelectorAll('.select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const planName = e.target.parentElement.querySelector('span').innerText;
            document.getElementById('selected-plan-name').innerText = planName;
            document.getElementById('payment-modal').style.display = 'flex';
        });
    });
}

// ──────────────────────────────────────────
// MODAL DE PAGO — NAVEGACIÓN ENTRE PANTALLAS
// ──────────────────────────────────────────
function cerrarModalPago() {
    document.getElementById('payment-modal').style.display = 'none';
    regresarAPagos();
}

function mostrarFormularioTarjeta() {
    document.getElementById('payment-selection').style.display = 'none';
    document.getElementById('card-form-container').style.display = 'block';
}

function mostrarFormularioPSE() {
    document.getElementById('payment-selection').style.display = 'none';
    document.getElementById('pse-form-container').style.display = 'block';
}

function mostrarFormularioConsignacion() {
    document.getElementById('payment-selection').style.display = 'none';
    document.getElementById('consignacion-form-container').style.display = 'block';
}

function regresarAPagos() {
    document.getElementById('payment-selection').style.display = 'block';
    document.getElementById('card-form-container').style.display = 'none';
    document.getElementById('pse-form-container').style.display = 'none';
    document.getElementById('consignacion-form-container').style.display = 'none';
}

// ──────────────────────────────────────────
// MODAL DE RESULTADO
// ──────────────────────────────────────────
function mostrarResultadoUI(exito, titulo, mensaje, ref = '') {
    const resModal = document.getElementById('result-modal');
    const content  = resModal.querySelector('.modal-content');
    const icon     = document.getElementById('result-icon');

    content.classList.remove('success-theme', 'error-theme');

    if (exito) {
        content.classList.add('success-theme');
        icon.innerText = '✅';
    } else {
        content.classList.add('error-theme');
        icon.innerText = '❌';
    }

    document.getElementById('result-title').innerText   = titulo;
    document.getElementById('result-message').innerText = mensaje;

    const refEl = document.getElementById('result-ref');
    if (refEl) refEl.innerText = ref ? `Ref: ${ref}` : '';

    document.getElementById('payment-modal').style.display = 'none';
    setTimeout(() => { resModal.style.display = 'flex'; }, 50);
}

function cerrarTodo() {
    document.getElementById('result-modal').style.display = 'none';
    regresarAPagos();
    window.location.reload();
}

// ──────────────────────────────────────────
// PSE — SIMULACIÓN BANCO EXTERNO
// ──────────────────────────────────────────
window.addEventListener('message', (event) => {
    if (event.data === 'pago_pse_exitoso') simularProcesamientoPSE();
});

function simularProcesamientoPSE() {
    mostrarResultadoUI(true, 'Procesando Transacción', 'Verificando con tu banco...', '');
    document.getElementById('result-icon').innerText = '⏳';
    const btnEntendido = document.getElementById('result-modal').querySelector('button');
    btnEntendido.style.display = 'none';

    setTimeout(async () => {
        const plan  = document.getElementById('selected-plan-name').innerText;
        const exito = await llamarAPIAfectacionReal(plan);
        if (exito) {
            const ref = 'PSE-' + Math.random().toString(36).substr(2, 9).toUpperCase();
            mostrarResultadoUI(true, '¡Suscripción Activada!', 'Tu pago por PSE fue confirmado. ¡Bienvenido!', ref);
        } else {
            mostrarResultadoUI(false, 'Error de Activación', 'El pago fue exitoso pero no pudimos activar tu cuenta. Contacta a soporte.');
        }
        btnEntendido.style.display = 'block';
    }, 3000);
}

// ──────────────────────────────────────────
// ACTIVACIÓN REAL EN BASE DE DATOS
// ──────────────────────────────────────────
async function llamarAPIAfectacionReal(planName) {
    try {
        const response = await fetch(`${API_BASE}/vendors/vendedores/activar-suscripcion/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({ plan: planName })
        });
        return response.ok;
    } catch (e) {
        console.error('Error activando suscripción:', e);
        return false;
    }
}

// ──────────────────────────────────────────
// PROCESAR PAGO (mock + activación real)
// ──────────────────────────────────────────
async function procesarPago(metodo) {
    const planName = document.getElementById('selected-plan-name').innerText;
    const payload  = { metodo, plan: planName };

    if (metodo === 'Tarjeta') {
        payload.numero_tarjeta = document.querySelector('input[placeholder="Número de tarjeta"]')?.value || 'N/A';
    } else if (metodo === 'PSE') {
        const banco = document.getElementById('pse-bank').value;
        window.open(`bank-mock.html?banco=${encodeURIComponent(banco)}`, 'Sucursal Virtual', 'width=500,height=650');
        document.getElementById('payment-modal').style.display = 'none';
        return;
    } else if (metodo === 'Consignacion') {
        payload.referencia_consignacion = document.getElementById('consignacion-ref').value;
    }

    try {
        const responseMock = await fetch('http://127.0.0.1:8000/mocks/pagos/', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });
        const dataMock = await responseMock.json();

        if (dataMock.estado === 'EXITOSO') {
            const exitoReal = await llamarAPIAfectacionReal(planName);
            if (exitoReal) {
                mostrarResultadoUI(true, '¡Pago Confirmado!', 'Tu suscripción ha sido activada correctamente.', dataMock.transaccion_id);
            } else {
                mostrarResultadoUI(false, 'Fallo de Activación', 'El pago se procesó pero hubo un error actualizando tu cuenta.');
            }
        } else {
            mostrarResultadoUI(false, 'Pago Rechazado', dataMock.mensaje);
        }
    } catch (error) {
        mostrarResultadoUI(false, 'Error de Conexión', 'No se pudo contactar con el servidor.');
    }
}

// ──────────────────────────────────────────
// SESIÓN
// ──────────────────────────────────────────
function handleLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/pages/login.html';
}

// ──────────────────────────────────────────
// EXPOSICIÓN GLOBAL
// ──────────────────────────────────────────
window.mostrarFormularioTarjeta      = mostrarFormularioTarjeta;
window.mostrarFormularioPSE          = mostrarFormularioPSE;
window.mostrarFormularioConsignacion = mostrarFormularioConsignacion;
window.regresarAPagos               = regresarAPagos;
window.cerrarModalPago              = cerrarModalPago;
window.procesarPago                 = procesarPago;
window.cerrarTodo                   = cerrarTodo;
window.mostrarResultadoUI           = mostrarResultadoUI;
window.handleLogout                 = handleLogout;
