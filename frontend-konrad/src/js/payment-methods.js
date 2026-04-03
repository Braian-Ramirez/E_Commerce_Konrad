const API_MEDIOS = 'http://127.0.0.1:8000/api/v1/buyers/medios-pago/';
const token = localStorage.getItem("access_token");

if (!token) { window.location.href = "/pages/login.html"; }

let editingId = null;

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

    try {
        const res = await fetch(API_MEDIOS, { headers: { 'Authorization': `Bearer ${token}` } });
        
        if (res.status === 401) { 
            console.warn("Sesión expirada en backend, operando en modo lectura.");
            return; 
        }
        
        const data = await res.json();
        list.innerHTML = data && data.length > 0 ? data.map(m => `
            <div class="payment-card" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:20px; padding:20px; display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <div style="display:flex; align-items:center; gap:15px;">
                    <div style="font-size:1.5rem;">💳</div>
                    <div>
                        <p style="font-weight:800; color:white; font-size:1rem;">${m.banco_nombre}</p>
                        <p style="color:#64748b; font-family:monospace; font-size:0.8rem;">**** ${String(m.numero_cuenta_tarjeta).slice(-4)}</p>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button onclick='abrirEdicion(${JSON.stringify(m).replace(/'/g, "&apos;")})' style="background:rgba(255,255,255,0.05); border:none; color:white; width:30px; height:30px; border-radius:50%; cursor:pointer;">✏️</button>
                    <button onclick="eliminarMedio(${m.id})" style="background:rgba(239, 68, 68, 0.1); border:none; color:#ef4444; width:30px; height:30px; border-radius:50%; cursor:pointer;">🗑️</button>
                </div>
            </div>
        `).join('') : `<div style="text-align:center; color:#64748b; padding:40px;">No hay medios vinculados.</div>`;
    } catch (err) { console.warn("Error carga."); }
}

window.abrirEdicion = (m) => {
    editingId = m.id;
    const modal = document.getElementById("addPaymentModal");
    if (!modal) return;
    document.getElementById("tipo_pago").value = m.tipo;
    document.getElementById("banco_nombre").value = m.banco_nombre;
    document.getElementById("titular_nombre").value = m.titular_nombre;
    document.getElementById("numero_cuenta_tarjeta").value = m.numero_cuenta_tarjeta;
    const h3 = modal.querySelector("h3"); if (h3) h3.textContent = "Editar Medio de Pago";
    modal.style.display = "flex";
};

function setupPaymentLogic() {
    const modal = document.getElementById("addPaymentModal");
    const openBtn = document.getElementById("openModalBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const form = document.getElementById("paymentForm");
    if (openBtn) openBtn.onclick = () => { editingId = null; if (form) form.reset(); modal.style.display = "flex"; };
    if (cancelBtn) cancelBtn.onclick = () => { modal.style.display = "none"; };
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
            tipo: document.getElementById('tipo_pago').value,
            banco_nombre: document.getElementById("banco_nombre").value,
            titular_nombre: document.getElementById("titular_nombre").value,
            numero_cuenta_tarjeta: document.getElementById("numero_cuenta_tarjeta").value,
            token_seguridad: "000"
        };
        const method = editingId ? "PUT" : "POST";
        const url = editingId ? `${API_MEDIOS}${editingId}/` : API_MEDIOS;
        try {
            const res = await fetch(url, { method, headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, body: JSON.stringify(payload) });
            if (res.ok) { modal.style.display = "none"; cargarMediosPago(); showToast(editingId ? "✏️ Editado!" : "✅ Vinculado!"); }
            else if (res.status === 401) { showToast("🚨 Sesión vencida.", true); }
        } catch (err) { showToast("Error de red.", true); }
    });
}

window.eliminarMedio = async (id) => {
    if (!confirm("¿Eliminar?")) return;
    try {
        const res = await fetch(`${API_MEDIOS}${id}/`, { method: "DELETE", headers: { 'Authorization': `Bearer ${token}` } });
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
