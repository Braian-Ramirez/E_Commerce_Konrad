// vendor-dashboard.js - VERSIÓN FINAL CON INTEGRACIÓN DE BASE DE DATOS REAL

document.addEventListener('DOMContentLoaded', () => {
    checkSubscriptionStatus();
});

async function checkSubscriptionStatus() {
    try {
        const response = await fetch('http://localhost:8000/api/v1/vendors/vendedores/mi-status/', {
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
                        <p style="font-size: 0.9rem; color: var(--text-muted);">Puedes seguir gestionando tus productos y ventas desde el menú lateral.</p>
                    </div>
                `;
            }
        }
    } catch (err) {
        console.error("Error al verificar status:", err);
    }
}

document.querySelectorAll('.select-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const planName = e.target.parentElement.querySelector('span').innerText;
        document.getElementById('selected-plan-name').innerText = planName;
        document.getElementById('payment-modal').style.display = "block";
    });
});

function cerrarTodo() {
    document.getElementById('result-modal').style.display = "none";
    regresarAPagos();
    // Recargar para ver el nuevo estado
    window.location.reload();
}

const closeModal = () => {
    document.getElementById('payment-modal').style.display = "none";
    regresarAPagos();
};

document.querySelector('.close-modal').onclick = closeModal;

// NAVEGACIÓN
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

function mostrarResultadoUI(exito, titulo, mensaje, ref = "") {
    const resModal = document.getElementById('result-modal');
    const content = resModal.querySelector('.modal-content');
    const icon = document.getElementById('result-icon');
    
    content.classList.remove('success-theme', 'error-theme');
    
    if (exito) {
        content.classList.add('success-theme');
        icon.innerText = "✅";
    } else {
        content.classList.add('error-theme');
        icon.innerText = "❌";
    }
    
    document.getElementById('result-title').innerText = titulo;
    document.getElementById('result-message').innerText = mensaje;
    
    const refElement = document.getElementById('result-ref');
    if (refElement) {
        refElement.innerText = ref ? `Ref: ${ref}` : "";
    }
    
    document.getElementById('payment-modal').style.display = "none";
    
    setTimeout(() => {
        resModal.style.display = "flex";
    }, 50);
}

// SIMULACIÓN PSE CON ESPERA
window.addEventListener('message', (event) => {
    if (event.data === 'pago_pse_exitoso') {
        simularProcesamientoPSE();
    }
});

function simularProcesamientoPSE() {
    mostrarResultadoUI(true, "Procesando Transacción", "Estamos verificando la información con tu banco...", "");
    document.getElementById('result-icon').innerText = "⏳";
    const btnEntendido = document.getElementById('result-modal').querySelector('button');
    btnEntendido.style.display = "none"; 

    setTimeout(async () => {
        const plan = document.getElementById('selected-plan-name').innerText;
        const exito = await llamarAPIAfectacionReal(plan);
        if (exito) {
            const ref = "PSE-" + Math.random().toString(36).substr(2, 9).toUpperCase();
            mostrarResultadoUI(true, "¡Suscripción Activada!", "Tu pago por PSE ha sido confirmado. ¡Bienvenido!", ref);
        } else {
             mostrarResultadoUI(false, "Error de Activación", "El pago fue exitoso pero no pudimos activar tu cuenta. Contacta a soporte.");
        }
        btnEntendido.style.display = "block";
    }, 3000);
}

async function llamarAPIAfectacionReal(planName) {
    try {
        const response = await fetch('http://localhost:8000/api/v1/vendors/vendedores/activar-suscripcion/', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify({ plan: planName })
        });
        return response.ok;
    } catch (e) {
        console.error("Error activando suscripción:", e);
        return false;
    }
}

async function procesarPago(metodo) {
    const planName = document.getElementById('selected-plan-name').innerText;
    let payload = {
        metodo: metodo,
        plan: planName
    };

    if (metodo === 'Tarjeta') {
        payload.numero_tarjeta = document.querySelector('input[placeholder="Número de tarjeta"]')?.value || 'N/A';
    } else if (metodo === 'PSE') {
        const banco = document.getElementById('pse-bank').value;
        window.open(`bank-mock.html?banco=${encodeURIComponent(banco)}`, 'Sucursal Virtual', 'width=500,height=650');
        document.getElementById('payment-modal').style.display = "none";
        return;
    } else if (metodo === 'Consignacion') {
        payload.referencia_consignacion = document.getElementById('consignacion-ref').value;
    }

    try {
        // 1. Simulación de pasarela
        const responseMock = await fetch('http://127.0.0.1:8000/mocks/pagos/', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });
        
        const dataMock = await responseMock.json();
        
        if (dataMock.estado === 'EXITOSO') {
            // 2. ACTIVACIÓN REAL EN BASE DE DATOS
            const exitoReal = await llamarAPIAfectacionReal(planName);
            if (exitoReal) {
                mostrarResultadoUI(true, "¡Pago Confirmado!", "Tu suscripción ha sido activada correctamente en el sistema.", dataMock.transaccion_id);
            } else {
                mostrarResultadoUI(false, "Fallo de Activación", "El pago se procesó pero hubo un error actualizando tu cuenta en la base de datos.");
            }
        } else {
            mostrarResultadoUI(false, "Pago Rechazado", dataMock.mensaje);
        }
    } catch (error) {
        mostrarResultadoUI(false, "Error de Conexión", "No se pudo contactar con el servidor.");
    }
}

// EXPOSICIÓN GLOBAL
window.mostrarFormularioTarjeta = mostrarFormularioTarjeta;
window.mostrarFormularioPSE = mostrarFormularioPSE;
window.mostrarFormularioConsignacion = mostrarFormularioConsignacion;
window.regresarAPagos = regresarAPagos;
window.procesarPago = procesarPago;
window.cerrarTodo = cerrarTodo;
window.mostrarResultadoUI = mostrarResultadoUI;
