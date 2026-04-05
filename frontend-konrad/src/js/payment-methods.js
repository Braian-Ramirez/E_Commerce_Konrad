const API_MEDIOS = 'http://127.0.0.1:8000/api/v1/buyers/medios-pago/';
const token = localStorage.getItem("access_token");

if (!token) { window.location.href = "/pages/login.html"; }

let editingId = null;

// LOGOUT PERSISTENTE
window.handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_data");
    window.location.href = "/pages/login.html";
};

document.addEventListener("DOMContentLoaded", () => {
    cargarMediosPago();
    setupPaymentLogic();
    updateBadge();
});

function getUserKey() { 
    const u = JSON.parse(localStorage.getItem('user_data') || '{}');
    return u.email || u.username || 'guest';
}
function getCartItems() {
    const key = `cart_${getUserKey()}`;
    return JSON.parse(localStorage.getItem(key) || localStorage.getItem('konrad_cart_v99') || '[]');
}

async function cargarMediosPago() {
    const list = document.getElementById("paymentsList");
    if (!list) return;

    list.innerHTML = `<div style="text-align:center;padding:30px;color:#64748b;">Cargando medios de pago...</div>`;

    try {
        const currentToken = localStorage.getItem("access_token");
        const res = await fetch(API_MEDIOS, { headers: { 'Authorization': `Bearer ${currentToken}` } });
        console.log("Medios pago status:", res.status);

        if (res.status === 401) {
            list.innerHTML = `<div style="text-align:center;color:#94a3b8;padding:40px;">
                <p>Sesión vencida. <a href="/pages/login.html" style="color:var(--primary)">Inicia sesión</a> para ver tus medios.</p>
            </div>`;
            return;
        }

        const rawData = await res.json();
        console.log("Medios data:", rawData);
        // Handle both array and paginated {results:[]} responses
        const data = Array.isArray(rawData) ? rawData : (rawData.results || []);

        if (data.length > 0) {
            const iconMap = { 'TARJETA': '💳', 'PSE': '📱', 'CONSIGNACION': '🏦', 'BILLETERA': '📱' };
            list.innerHTML = data.map(m => `
                <div class="payment-card" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:20px;display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:15px;">
                        <div style="font-size:1.8rem;">${iconMap[m.tipo] || '💳'}</div>
                        <div>
                            <p style="font-weight:800;color:white;font-size:1rem;margin:0 0 4px;">${m.banco_nombre}</p>
                            <p style="color:#64748b;font-family:monospace;font-size:0.8rem;margin:0;">**** ${String(m.numero_cuenta_tarjeta || '').slice(-4)} · ${m.tipo || 'TARJETA'}</p>
                        </div>
                    </div>
                    <div style="display:flex;gap:10px;">
                        <button onclick='abrirEdicion(${JSON.stringify(m).replace(/'/g,"&apos;")})' style="background:rgba(255,255,255,0.05);border:none;color:white;width:34px;height:34px;border-radius:50%;cursor:pointer;">✏️</button>
                        <button onclick="eliminarMedio(${m.id})" style="background:rgba(239,68,68,0.1);border:none;color:#ef4444;width:34px;height:34px;border-radius:50%;cursor:pointer;">🗑️</button>
                    </div>
                </div>`).join('');
        } else {
            list.innerHTML = `<div style="text-align:center;color:#64748b;padding:50px;">
                <div style="font-size:3rem;margin-bottom:15px;">💳</div>
                <p style="font-size:1rem;">No hay medios vinculados. ¡Agrega uno arriba!</p>
            </div>`;
        }
    } catch (err) {
        console.error("Error carga medios:", err);
        list.innerHTML = `<div style="text-align:center;color:#ef4444;padding:40px;">Error al conectar con el servidor.</div>`;
    }
}

window.abrirEdicion = (m) => {
    editingId = m.id;
    const modal = document.getElementById("addPaymentModal");
    if (!modal) return;
    document.getElementById("cardType").value = m.tipo;
    document.getElementById("bankName").value = m.banco_nombre;
    document.getElementById("cardHolder").value = m.titular_nombre;
    document.getElementById("cardNumber").value = m.numero_cuenta_tarjeta;
    const h2 = modal.querySelector("h2"); if (h2) h2.textContent = "Editar Medio de Pago";
    modal.style.display = "flex";
};

function setupPaymentLogic() {
    const modal = document.getElementById("addPaymentModal");
    const openBtn = document.getElementById("openModalBtn");
    // Correct IDs matching the HTML
    const cancelBtn = document.getElementById("cancelPayment");
    const closeBtn = document.getElementById("closePaymentModal");
    const form = document.getElementById("paymentForm");

    const closeModal = () => { modal.style.display = "none"; editingId = null; if(form) form.reset(); };

    if (openBtn) openBtn.onclick = () => { 
        editingId = null; 
        if (form) form.reset(); 
        const h2 = modal.querySelector("h2"); 
        if (h2) h2.textContent = "Vincular Medio de Pago";
        modal.style.display = "flex"; 
    };
    if (cancelBtn) cancelBtn.onclick = closeModal;
    if (closeBtn) closeBtn.onclick = closeModal;
    // Also close on backdrop click
    modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        // Correct field IDs matching the HTML
        const payload = {
            tipo: document.getElementById('cardType')?.value || 'TARJETA',
            banco_nombre: document.getElementById("bankName").value,
            titular_nombre: document.getElementById("cardHolder").value,
            numero_cuenta_tarjeta: document.getElementById("cardNumber").value,
            token_seguridad: "000"
        };
        const method = editingId ? "PUT" : "POST";
        const url = editingId ? `${API_MEDIOS}${editingId}/` : API_MEDIOS;
        try {
            const currentToken = localStorage.getItem("access_token");
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json", "Authorization": `Bearer ${currentToken}` }, body: JSON.stringify(payload) });
            if (res.ok) { closeModal(); cargarMediosPago(); showToast(editingId ? "✏️ Editado!" : "✅ Vinculado!"); }
            else if (res.status === 401) { showToast("🚨 Sesión vencida.", true); }
            else { const err = await res.json(); showToast("Error: " + JSON.stringify(err), true); }
        } catch (err) { showToast("Error de red.", true); }
    });
}

window.eliminarMedio = async (id) => {
    if (!confirm("¿Eliminar?")) return;
    try {
        const currentToken = localStorage.getItem("access_token");
        const res = await fetch(`${API_MEDIOS}${id}/`, { method: "DELETE", headers: { 'Authorization': `Bearer ${currentToken}` } });
        if (res.ok) { showToast("🗑️ Eliminado."); cargarMediosPago(); }
    } catch (e) { showToast("Error al borrar.", true); }
};

function updateBadge() {
    const b = document.getElementById('cartCount');
    if (b) b.textContent = getCartItems().length;
}

function showToast(msg, isErr=false) {
    let t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div'); t.id = 'toast';
        t.style = "position:fixed; top:100px; right:30px; padding:15px 30px; border-radius:15px; z-index:99999; font-weight:700; transition:all 0.4s ease; transform:translateX(200%); color:white;";
        document.body.appendChild(t);
    }
    t.style.background = isErr ? "#ef4444" : "var(--primary)"; t.textContent = msg; t.style.transform = "translateX(0)";
    setTimeout(() => { t.style.transform = "translateX(200%)"; }, 3000);
}
