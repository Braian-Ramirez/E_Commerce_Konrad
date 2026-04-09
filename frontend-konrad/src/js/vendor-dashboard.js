// vendor-dashboard.js - VERSIÓN FINAL CON SOPORTE PSE

document.querySelectorAll('.select-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const planName = e.target.parentElement.querySelector('span').innerText;
        document.getElementById('selected-plan-name').innerText = planName;
        document.getElementById('payment-modal').style.display = "block";
    });
});

const closeModal = () => {
    document.getElementById('payment-modal').style.display = "none";
    regresarAPagos();
};

document.querySelector('.close-modal').onclick = closeModal;

function cerrarTodo() {
    document.getElementById('result-modal').style.display = "none";
    regresarAPagos();
}

// NAVEGACIÓN
function mostrarFormularioTarjeta() {
    document.getElementById('payment-selection').style.display = 'none';
    document.getElementById('card-form-container').style.display = 'block';
}

function mostrarFormularioPSE() {
    document.getElementById('payment-selection').style.display = 'none';
    document.getElementById('pse-form-container').style.display = 'block';
}

function regresarAPagos() {
    document.getElementById('payment-selection').style.display = 'block';
    document.getElementById('card-form-container').style.display = 'none';
    document.getElementById('pse-form-container').style.display = 'none';
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
    // 1. Mostrar modal de "Procesando"
    mostrarResultadoUI(true, "Procesando Transacción", "Estamos verificando la información con tu banco... no cierres esta ventana.", "");
    
    // Cambiamos el icono temporalmente a un reloj
    document.getElementById('result-icon').innerText = "⏳";
    const btnEntendido = document.getElementById('result-modal').querySelector('button');
    btnEntendido.style.display = "none"; // Ocultar botón

    // 2. Después de 3 segundos, mostrar el éxito real
    setTimeout(() => {
        const ref = "PSE-" + Math.random().toString(36).substr(2, 9).toUpperCase();
        mostrarResultadoUI(true, "¡Suscripción Activada!", "Tu pago por PSE ha sido confirmado. ¡Bienvenido a Konrad Commerce!", ref);
        btnEntendido.style.display = "block"; // Volver a mostrar botón
    }, 3000);
}

async function procesarPago(metodo) {
    let payload = {
        metodo: metodo,
        plan: document.getElementById('selected-plan-name').innerText
    };

    if (metodo === 'Tarjeta') {
        payload.titular = document.querySelector('input[placeholder="Nombre en la tarjeta"]')?.value || 'N/A';
        payload.numero_tarjeta = document.querySelector('input[placeholder="Número de tarjeta"]')?.value || 'N/A';
    } else if (metodo === 'PSE') {
        const banco = document.getElementById('pse-bank').value;
        const urlBanco = `bank-mock.html?banco=${encodeURIComponent(banco)}`;
        window.open(urlBanco, 'Sucursal Virtual', 'width=500,height=650');
        
        // Simplemente cerramos el modal de pago y esperamos el mensaje del banco
        document.getElementById('payment-modal').style.display = "none";
        return;
    }

    try {
        const response = await fetch('http://127.0.0.1:8000/mocks/pagos/', {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error("Error en el servidor");

        const data = await response.json();
        
        if (data.estado === 'EXITOSO') {
            mostrarResultadoUI(true, "¡Pago Confirmado!", data.mensaje, data.transaccion_id);
        } else {
            mostrarResultadoUI(false, "Pago Rechazado", data.mensaje);
        }

    } catch (error) {
        console.error("DEBUG - Error:", error);
        mostrarResultadoUI(false, "Error de Conexión", "No se pudo contactar con el backend.");
    }
}

// EXPOSICIÓN GLOBAL
window.mostrarFormularioTarjeta = mostrarFormularioTarjeta;
window.mostrarFormularioPSE = mostrarFormularioPSE;
window.regresarAPagos = regresarAPagos;
window.procesarPago = procesarPago;
window.cerrarTodo = cerrarTodo;
window.mostrarResultadoUI = mostrarResultadoUI;
