const API_PRODUCTS = 'http://127.0.0.1:8000/api/v1/products/productos/';
const API_MEDIOS   = 'http://127.0.0.1:8000/api/v1/buyers/medios-pago/';
const API_ORDERS   = 'http://127.0.0.1:8000/api/v1/orders/ordenes/';
const API_DETALLES = 'http://127.0.0.1:8000/api/v1/orders/detalles/';
const token = localStorage.getItem("access_token");
let allMyMedios = [];
let cartDetails = [];            // ← declaración global (era implícita → ReferenceError en módulos)
let selectedPaymentType = 'TARJETA'; // ← estado del botón de pago activo
const MOCK_MEDIOS = [
    { id: 'm1', banco_nombre: 'Banco Konrad', titular_nombre: 'Usuario Demo', tipo: 'TARJETA', numero_cuenta_tarjeta: '****1234' },
    { id: 'm2', banco_nombre: 'Nequi', titular_nombre: 'Usuario Demo', tipo: 'BILLETERA', numero_cuenta_tarjeta: '****5678' }
];


window.logout = () => {
    localStorage.clear(); // Limpieza total para evitar cruce de sesiones
    window.location.href = "/pages/login.html";
};

if (!token && !window.location.pathname.includes('login.html')) {
    window.location.href = "/pages/login.html";
}

// ─── CARRITO PERSISTENTE POR USUARIO (SINCRONIZADO CON MAIN.JS) ──────────────
function getUserKey() { 
    const u = JSON.parse(localStorage.getItem('user_data') || '{}');
    return u.email || u.username || 'guest';
}
function getCartItems() {
    const key = `cart_${getUserKey()}`;
    // Intentar migrar del viejo konrad_cart_v99 si existe aún
    return JSON.parse(localStorage.getItem(key) || localStorage.getItem('konrad_cart_v99') || '[]');
}
function saveCartItems(items) {
    const key = `cart_${getUserKey()}`;
    localStorage.setItem(key, JSON.stringify(items));
    localStorage.removeItem('konrad_cart_v99'); // Limpiar rastro viejo
}

function updateBadge() {
    const b = document.getElementById('cartCount');
    if (b) b.textContent = getCartItems().length;
}

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Sincronizar primero con la BD para reconocer datos existentes
    await syncCartWithBackend();
    
    // 2. Cargar UI
    updateBadge();
    await loadCart();
    await loadPaymentMethods();
    setupDetailModal();
    setupPaymentModal();
    setupDeliveryToggle();
    setupPaymentFilters();
    setupCheckout();
    injectPaymentModal();
});

async function syncCartWithBackend() {
    if (!token) return;
    try {
        console.log("Sincronizando con base de datos...");
        const res = await fetch(API_ORDERS, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.status === 401) {
            console.warn("Sesión expirada. Limpiando token.");
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_data');
            return;
        }
        if (!res.ok) return;
        const data = await res.json();
        const orders = Array.isArray(data) ? data : (data.results || []);
        const active = orders.find(o => o.estado === 'CARRITO');
        if (active && active.detalles && active.detalles.length > 0) {
            const dbItems = [];
            active.detalles.forEach(d => { for(let i=0; i<d.cantidad; i++) dbItems.push(String(d.producto)); });
            
            const local = getCartItems();
            // Sincronización: Si local está vacío, traemos DB (sesión fresca). 
            // Si local ya tiene algo, mantenemos local (estado de compra activo) para no recibir fantasmas.
            const merged = local.length === 0 ? dbItems : local; 
            
            saveCartItems(merged);
            console.log("Sincronización exitosa:", merged.length, "ítems");
        }
    } catch(e) { console.warn("Error sync", e); }
}

// ───────────────────────────────────────────────────────
// CARRITO
// ───────────────────────────────────────────────────────
async function loadCart() {
    const list = document.getElementById('cartItems');
    if (!list) return;
    const rawIds = getCartItems();
    
    if (rawIds.length === 0) {
        list.innerHTML = `<div style="padding:60px;text-align:center;color:#94a3b8;">
            <div style="font-size:4rem;margin-bottom:15px;">🛒</div>
            <p style="font-size:1.2rem;">Tu carrito está vacío</p>
            <a href="/pages/catalog.html" style="color:var(--primary);font-weight:700;text-decoration:none;">← Ver catálogo</a>
        </div>`;
        updateSummary(0); return;
    }

    if (!window.allProductsCache) {
        try {
            const res = await fetch(API_PRODUCTS);
            const data = await res.json();
            window.allProductsCache = Array.isArray(data) ? data : (data.results || []);
        } catch(e) { console.error("Error al cargar productos", e); }
    }
    const all = window.allProductsCache || [];

    // Validar visualmente (pero NO limpiar la persistencia local por fallos de API)
    const validIds = rawIds; 

    if (validIds.length === 0) {
        list.innerHTML = `<div style="padding:60px;text-align:center;color:#94a3b8;"><p style="font-size:1.2rem;">Carrito vacío (datos actualizados)</p></div>`;
        updateSummary(0); return;
    }

    const counts = {};
    validIds.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
    const uniqueIds = Object.keys(counts);

    list.innerHTML = ""; let sum = 0; cartDetails = [];

    uniqueIds.forEach((id) => {
        const p = all.find(x => String(x.id) === String(id));
        if (!p) return;

        const qty = counts[id];
        // Normalización de precio igual a main.js para garantizar coherencia
        let pr = parseFloat(p.valor || p.precio_venta || p.precio_fijo || p.precio || 0);
        if (pr <= 0) pr = 2500000;
        const subItem = pr * qty;
        sum += subItem;
        cartDetails.push({ producto: p.id, cantidad: qty, valor_unitario: pr });

        let img = p.imagen_principal || '📦';
        if (p.descripcion && p.descripcion.includes('||IMG:')) {
            const m = p.descripcion.match(/\|\|IMG:(.*?)\|\|/);
            if (m) img = m[1];
        }

        list.innerHTML += `
        <div class="cart-item-card" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:20px;display:flex;gap:20px;align-items:center;margin-bottom:15px;animation: fadeInUp 0.3s ease both;">
            <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:15px;">
                <img src="${img}" onerror="this.src='https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800&auto=format&fit=crop'" style="width:70px;height:70px;object-fit:cover;border-radius:12px;border:1px solid rgba(255,255,255,0.05);">
            </div>
            <div style="flex:1;">
                <p style="font-weight:800;color:white;font-size:1.1rem;margin-bottom:2px;">${p.nombre}</p>
                <div style="color:#fbbf24;font-size:0.75rem;margin-bottom:8px;">★★★★★ <span style="color:#64748b;font-size:0.7rem;">(Vendedor: ${p.vendedor_nombre || 'Konrad Shop'})</span></div>
                <p style="font-size:0.85rem;color:var(--primary);font-weight:600;margin-bottom:10px;">$${new Intl.NumberFormat('es-CO').format(pr)} COP</p>
                
                <div style="display:flex;align-items:center;gap:15px;">
                    <div style="display:flex;align-items:center;background:rgba(255,255,255,0.05);border-radius:10px;padding:4px;">
                        <button onclick="updateQty('${id}', -1)" style="background:transparent;border:none;color:white;width:30px;height:30px;cursor:pointer;">−</button>
                        <span style="font-weight:800;min-width:30px;text-align:center;">${qty}</span>
                        <button onclick="updateQty('${id}', 1)" style="background:transparent;border:none;color:white;width:30px;height:30px;cursor:pointer;">+</button>
                    </div>
                    <button onclick="removeItemById('${id}')" style="background:transparent;border:none;color:#ef4444;font-size:0.8rem;cursor:pointer;font-weight:600;">🗑️ Quitar</button>
                </div>
            </div>
            <div style="text-align:right;">
                <p style="font-size:0.7rem;color:#64748b;margin-bottom:4px;">Subtotal Unitario</p>
                <div style="font-weight:800;color:white;font-size:1.2rem;">$${new Intl.NumberFormat('es-CO').format(subItem)}</div>
            </div>
        </div>`;
    });
    updateSummary(sum);
}

function updateSummary(sum) {
    const delivery = document.getElementById('deliveryType')?.value || 'RECOGER';
    const env = sum > 0 ? (delivery === 'DOMICILIO' ? 12000 : 0) : 0;
    const base = sum / 1.19;
    const i = sum - base; 
    const c = sum * 0.05; // 5% Comisión
    
    const fmt = (n) => '$' + new Intl.NumberFormat('es-CO').format(Math.round(n));
    
    document.getElementById("subtotalVal").textContent   = fmt(sum);
    document.getElementById("commissionVal").textContent = fmt(c);
    document.getElementById("ivaVal").textContent        = fmt(i);
    document.getElementById("shippingVal").textContent   = env > 0 ? fmt(env) : 'GRATIS';
    document.getElementById("totalVal").textContent      = fmt(sum + c + env);
}

function setupDeliveryToggle() {
    const sel  = document.getElementById('deliveryType');
    const addr = document.getElementById('addressSection');
    const branch = document.getElementById('branchSection');
    if (!sel) return;
    const toggle = () => {
        const isDom = sel.value === 'DOMICILIO';
        if (addr) addr.style.display = isDom ? 'grid' : 'none';
        if (branch) branch.style.display = isDom ? 'none' : 'block';
        // Recalcular envío CORRECTAMENTE (Precio * Cantidad)
        const sub = cartDetails.reduce((a, d) => a + (d.valor_unitario * d.cantidad), 0);
        updateSummary(sub);
    };
    sel.addEventListener('change', toggle);
    toggle();
}

// ───────────────────────────────────────────────────────
// MÉTODOS DE PAGO
// ───────────────────────────────────────────────────────
async function loadPaymentMethods() {
    try {
        const res = await fetch(API_MEDIOS, {
            signal: AbortSignal.timeout(4000),
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            allMyMedios = (Array.isArray(data) && data.length > 0) ? data : MOCK_MEDIOS;
        } else {
            allMyMedios = MOCK_MEDIOS;
        }
    } catch(e) {
        allMyMedios = MOCK_MEDIOS;
    }
    renderPaymentSelector("TARJETA");
}

function renderPaymentSelector(f = "ALL") {
    const s = document.getElementById("paymentSelector");
    const container = document.getElementById("cardSection");
    if (!s || !container) return;

    // Reseteo visual
    container.style.display = 'block';

    let list = [];
    if (f === "TARJETA") {
        list = allMyMedios.filter(m => m.tipo === 'TARJETA');
    } else if (f === "PSE") {
        list = allMyMedios.filter(m => m.tipo === 'BILLETERA' || m.tipo === 'CUENTA');
    } else if (f === "CONSIGNACION") {
        container.style.display = 'none'; 
        const msg = document.getElementById('consignationMsg');
        if (msg) msg.style.display = 'block';
        return;
    } else {
        list = allMyMedios;
    }

    const msg = document.getElementById('consignationMsg');
    if (msg) msg.style.display = 'none';

    s.innerHTML = `<option value="">— Selecciona tu ${f === 'PSE' ? 'billetera o cuenta' : 'tarjeta'} —</option>`;
    list.forEach(m => {
        const num  = String(m.numero_cuenta_tarjeta).slice(-4);
        const icon = m.tipo === 'TARJETA' ? '💳' : m.tipo === 'BILLETERA' ? '📱' : '🏦';
        s.innerHTML += `<option value="${m.id}">${icon} ${m.banco_nombre} ****${num}</option>`;
    });

    if (list.length === 0) {
        s.innerHTML = `<option value="">Sin medios para este tipo</option>`;
    }
}

function setupPaymentFilters() {
    // Usamos onclick directo en cada label con stopPropagation para evitar
    // el doble-disparo que ocurre cuando el browser hace click sintético en
    // el input radio interno después del click en el label.
    document.querySelectorAll('.payment-opt').forEach(label => {
        const radio = label.querySelector('input[name="paymentType"]');
        if (!radio) return;

        label.addEventListener('click', (e) => {
            e.stopPropagation();
            // Marcar el radio manualmente (por si acaso)
            radio.checked = true;
            selectedPaymentType = radio.value;

            // Resetear todos los estilos
            document.querySelectorAll('.payment-opt').forEach(l => {
                l.style.borderColor = 'rgba(255,255,255,0.1)';
                l.style.background = 'transparent';
            });
            // Estilo activo en el label clickeado
            label.style.borderColor = 'var(--primary)';
            label.style.background = 'rgba(99,102,241,0.1)';

            renderPaymentSelector(selectedPaymentType);
        });
    });

    // Aplicar estilo inicial al radio por defecto (TARJETA ya viene checked en HTML)
    setTimeout(() => {
        const defaultLabel = document.querySelector('.payment-opt:has(input[name="paymentType"]:checked)');
        if (defaultLabel) {
            defaultLabel.style.borderColor = 'var(--primary)';
            defaultLabel.style.background = 'rgba(99,102,241,0.1)';
        }
    }, 50);
}

// ───────────────────────────────────────────────────────
// MODAL DE RESULTADO DE PAGO
// ───────────────────────────────────────────────────────
function injectPaymentModal() {
    if (document.getElementById('payResultModal')) return;
    document.body.insertAdjacentHTML('beforeend', `
    <div id="payResultModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;align-items:center;justify-content:center;backdrop-filter:blur(12px);">
        <div id="payResultBox" style="background:linear-gradient(135deg,#0f172a,#1e293b);border:1px solid rgba(255,255,255,0.1);border-radius:30px;padding:50px 40px;max-width:450px;width:90%;text-align:center;transform:scale(0.8);transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1);">
            <div id="payIcon" style="font-size:5rem;margin-bottom:20px;"></div>
            <h2 id="payTitle" style="font-size:2rem;font-weight:800;margin-bottom:10px;"></h2>
            <p id="paySubtitle" style="color:#94a3b8;font-size:1rem;margin-bottom:10px;"></p>
            <p id="payRef" style="color:#64748b;font-size:0.8rem;margin-bottom:30px;font-family:monospace;"></p>
            <div id="payActions" style="display:flex;gap:15px;justify-content:center;"></div>
        </div>
    </div>`);
}

function showPayResult(aprobado, totalStr, backendOrdenId = null) {
    const modal   = document.getElementById('payResultModal');
    const box     = document.getElementById('payResultBox');
    const ref     = 'KS-' + Date.now().toString(36).toUpperCase();
    const medio   = document.getElementById('paymentSelector');
    const medioNombre = medio?.selectedOptions[0]?.text || 'Método seleccionado';

    modal.style.display = 'flex';
    setTimeout(() => box.style.transform = 'scale(1)', 10);

    if (aprobado) {
        document.getElementById('payIcon').textContent    = '✅';
        document.getElementById('payTitle').textContent   = '¡Pago Aprobado!';
        document.getElementById('payTitle').style.color   = '#22c55e';
        document.getElementById('paySubtitle').textContent = `Tu pedido fue procesado exitosamente por ${totalStr} vía ${medioNombre}.`;
        document.getElementById('payRef').textContent     = `Referencia: ${ref}`;
        document.getElementById('payActions').innerHTML   = `
            <button onclick="pagoExitoso(${backendOrdenId ? backendOrdenId : 'null'})" style="background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;border:none;padding:15px 30px;border-radius:12px;font-weight:800;cursor:pointer;font-size:1rem;">
                📦 Ver mis pedidos
            </button>`;
        setTimeout(() => pagoExitoso(backendOrdenId), 4000);

    } else {
        document.getElementById('payIcon').textContent    = '❌';
        document.getElementById('payTitle').textContent   = 'Pago Rechazado';
        document.getElementById('payTitle').style.color   = '#ef4444';
        document.getElementById('paySubtitle').textContent = 'Tu banco no autorizó la transacción. Verifica tus fondos o intenta con otro medio de pago.';
        document.getElementById('payRef').textContent     = `Código de error: E-${Math.floor(Math.random()*9000)+1000}`;
        document.getElementById('payActions').innerHTML   = `
            <button onclick="document.getElementById('payResultModal').style.display='none'; document.getElementById('checkoutBtn').disabled=false; document.getElementById('checkoutBtn').textContent='Realizar Pago Seguro';"
                style="background:rgba(255,255,255,0.05);color:white;border:1px solid rgba(255,255,255,0.1);padding:15px 25px;border-radius:12px;font-weight:700;cursor:pointer;">
                ← Intentar de nuevo
            </button>
            <a href="/pages/payment-methods.html" style="background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;border:none;padding:15px 25px;border-radius:12px;font-weight:800;cursor:pointer;text-decoration:none;display:flex;align-items:center;">
                💳 Mis medios de pago
            </a>`;
    }
}

// ───────────────────────────────────────────────────────
// CHECKOUT
// ───────────────────────────────────────────────────────
function setupCheckout() {
    document.getElementById("checkoutBtn")?.addEventListener("click", async () => {
        const btn = document.getElementById("checkoutBtn");

        // 1. Validar carrito
        if (!cartDetails || cartDetails.length === 0) {
            showToast("⚠️ Tu carrito está vacío.", true); return;
        }

        // 2. Validar DATOS DE ENVIO (¡ESTRICTO!)
        const delivery = document.getElementById('deliveryType')?.value;
        if (delivery === 'DOMICILIO') {
            const city = document.getElementById('shipCity').value;
            const addr = document.getElementById('shipAddress').value;
            if (!city) {
                showToast("⚠️ Selecciona una ciudad de destino.", true);
                document.getElementById('shipCity').focus();
                return;
            }
            if (!addr || addr.trim().length < 5) {
                showToast("⚠️ Ingresa una dirección válida (mín. 5 carácteres).", true);
                document.getElementById('shipAddress').focus();
                return;
            }
        } else {
            const branch = document.getElementById('pickupBranch')?.value;
            if (!branch) {
                showToast("⚠️ Selecciona la Sede de Recogida de Konrad.", true);
                document.getElementById('pickupBranch')?.focus();
                return;
            }
        }

        // 3. Validar medio de pago seleccionado (excepto en consignación)
        const type = selectedPaymentType || document.querySelector('input[name="paymentType"]:checked')?.value;
        const medioSel = document.getElementById('paymentSelector')?.value;
        if (type !== 'CONSIGNACION' && !medioSel) {
            showToast("⚠️ Selecciona un medio de pago.", true); return;
        }

        btn.disabled = true;

        // Mostrar pantalla de "procesando"
        showProcessingScreen();

        // Simular validación del banco (1.5s delay)
        await sleep(1500);

        // Intentar backend real (sin bloquear si falla)
        let backendOk = false;
        let ordenId = null;
        try {
            const delivery = document.getElementById('deliveryType')?.value || 'RECOGER';
            const resO = await fetch(API_ORDERS, {
                method: "POST", signal: AbortSignal.timeout(4000),
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify({ tipo_entrega: delivery })
            });
            if (resO.ok) {
                const od = await resO.json();
                ordenId = od.id;
                for (const det of cartDetails) {
                    await fetch(API_DETALLES, {
                        method: "POST", signal: AbortSignal.timeout(4000),
                        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                        body: JSON.stringify({ orden: ordenId, ...det })
                    }).catch(() => {});
                }
                const resC = await fetch(`${API_ORDERS}${ordenId}/checkout/`, {
                    method: "POST", signal: AbortSignal.timeout(4000),
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
                });
                backendOk = resC.ok;
            }
        } catch(e) { /* Backend no disponible → modo simulado */ }

        // Cerrar pantalla procesando
        closeProcessingScreen();

        // El pago SIEMPRE se "aprueba" en demo (es simulado)
        // Puedes cambiar a false para probar el rechazo
        const totalEl = document.getElementById('totalVal');
        const totalStr = totalEl?.textContent || '$0';
        showPayResult(true, totalStr, backendOk ? ordenId : null);
    });
}

async function pagoExitoso(backendOrdenId) {
    // Si el backend no creó la orden, guardar una orden simulada en localStorage
    if (!backendOrdenId) {
        const mockOrders = JSON.parse(localStorage.getItem('mock_orders') || '[]');
        const sub = cartDetails.reduce((a, d) => a + (d.valor_unitario * d.cantidad), 0);
        const base = sub / 1.19;
        const iva = sub - base;
        const com = sub * 0.05;
        const env = document.getElementById('deliveryType')?.value === 'DOMICILIO' ? 12000 : 0;
        
        mockOrders.unshift({
            id: 'M' + Date.now().toString(36).toUpperCase(),
            estado: 'PAGADA',
            tipo_entrega: document.getElementById('deliveryType')?.value || 'RECOGER',
            fecha_simulada: new Date().toISOString(),
            total_final: sub + com + env,
            total_iva: iva,
            total_comision: com,
            costo_envio: env,
            detalles: cartDetails.map(d => ({ ...d, producto_nombre: 'Producto #' + d.producto })),
            simulado: true
        });
        localStorage.setItem('mock_orders', JSON.stringify(mockOrders));
    }
    
    // VACIAMOS EL CARRITO DE LA MEMORIA DEL NAVEGADOR
    saveCartItems([]); 
    updateBadge();
    
    // CAZA DE FANTASMAS (Ghost Carts):
    // El redirect inmediato puede cancelar peticiones de red (Race Condition).
    // Esperamos asíncronamente a que el DB despache el carrito huérfano.
    try {
        const r = await fetch(API_ORDERS, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await r.json();
        const arr = Array.isArray(data) ? data : (data.results || []);
        
        const deleteOps = arr.filter(o => o.estado === 'CARRITO').map(o => 
            fetch(`${API_ORDERS}${o.id}/`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
        );
        await Promise.all(deleteOps);
    } catch(e) { }

    window.location.href = "/pages/my-orders.html";
}

// ───────────────────────────────────────────────────────
// PANTALLA "PROCESANDO PAGO"
// ───────────────────────────────────────────────────────
function showProcessingScreen() {
    let el = document.getElementById('processingOverlay');
    if (!el) {
        document.body.insertAdjacentHTML('beforeend', `
        <div id="processingOverlay" style="display:flex;position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:99998;align-items:center;justify-content:center;backdrop-filter:blur(8px);">
            <div style="text-align:center;">
                <div style="width:70px;height:70px;border:4px solid rgba(139,92,246,0.3);border-top-color:#8b5cf6;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 25px;"></div>
                <p style="color:white;font-size:1.3rem;font-weight:700;margin-bottom:8px;">Procesando tu pago</p>
                <p style="color:#64748b;font-size:0.9rem;">Comunicando con tu entidad bancaria...</p>
            </div>
        </div>
        <style>@keyframes spin{to{transform:rotate(360deg)}}</style>`);
    } else {
        el.style.display = 'flex';
    }
}

function closeProcessingScreen() {
    const el = document.getElementById('processingOverlay');
    if (el) el.style.display = 'none';
}

// ───────────────────────────────────────────────────────
// UTILS
// ───────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

window.updateQty = async (id, delta) => {
    let items = getCartItems();
    if (delta > 0) {
        items.push(String(id));
    } else {
        const idx = items.lastIndexOf(String(id));
        if (idx !== -1) items.splice(idx, 1);
    }
    saveCartItems(items);
    loadCart();
    updateBadge();
    
    if (token) {
        try {
            const resO = await fetch(API_ORDERS, { headers: { 'Authorization': `Bearer ${token}` } });
            const raw = await resO.json();
            const orders = Array.isArray(raw) ? raw : (raw.results || []);
            const active = orders.find(o => o.estado === 'CARRITO');
            if (active && active.detalles) {
                const detail = active.detalles.find(d => String(d.producto) === String(id));
                if (detail) {
                    const newQty = detail.cantidad + delta;
                    if (newQty > 0) {
                        await fetch(API_DETALLES + detail.id + '/', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ cantidad: newQty })
                        });
                    } else {
                        await fetch(API_DETALLES + detail.id + '/', {
                            method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                        });
                    }
                }
            }
        } catch(e) {}
    }
};

window.removeItemById = async (id) => {
    let items = getCartItems().filter(x => String(x) !== String(id));
    saveCartItems(items);
    loadCart();
    updateBadge();
    
    if (token) {
        try {
            const resO = await fetch(API_ORDERS, { headers: { 'Authorization': `Bearer ${token}` } });
            const raw = await resO.json();
            const orders = Array.isArray(raw) ? raw : (raw.results || []);
            const active = orders.find(o => o.estado === 'CARRITO');
            if (active && active.detalles) {
                const detail = active.detalles.find(d => String(d.producto) === String(id));
                if (detail) {
                    await fetch(API_DETALLES + detail.id + '/', {
                        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
            }
        } catch(e) {}
    }
};

window.removeItem = (i) => {
    let items = getCartItems();
    items.splice(i, 1);
    saveCartItems(items);
    loadCart();
    updateBadge();
    syncCartWithBackend();
};



function showToast(m, e = false) {
    let t = document.getElementById("toast");
    if (!t) {
        t = document.createElement("div"); t.id = "toast";
        t.style = "position:fixed;top:100px;right:30px;padding:15px 30px;border-radius:15px;z-index:999999;font-weight:700;transition:all 0.4s ease;transform:translateX(200%);color:white;max-width:300px;";
        document.body.appendChild(t);
    }
    t.style.background = e ? "#ef4444" : "linear-gradient(135deg,#8b5cf6,#6d28d9)";
    t.textContent = m; t.style.transform = "translateX(0)";
    setTimeout(() => t.style.transform = "translateX(200%)", 3500);
}

function setupDetailModal() {
    const m = document.getElementById('productDetailModal');
    const c = document.getElementById('closeModal');
    if (c) c.onclick = () => m.style.display = "none";
    window.addEventListener('keydown', e => { if (e.key === 'Escape') m.style.display = 'none'; });
}

function setupPaymentModal() {
    const modal  = document.getElementById("addPaymentModal");
    const openBtn = document.getElementById("openModalBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const form   = document.getElementById("paymentForm");
    if (openBtn)   openBtn.onclick   = () => modal.style.display = "flex";
    if (cancelBtn) cancelBtn.onclick = () => modal.style.display = "none";
    form?.addEventListener("submit", async (e) => {
        e.preventDefault();
        // ELIMINADO: localStorage.clear() que causaba pérdida del carrito
        const payload = {
            tipo: document.getElementById('tipo_pago').value,
            banco_nombre: document.getElementById("banco_nombre").value,
            titular_nombre: document.getElementById("titular_nombre").value,
            numero_cuenta_tarjeta: document.getElementById("numero_cuenta_tarjeta").value,
            token_seguridad: "000"
        };
        try {
            const res = await fetch(API_MEDIOS, {
                method: "POST", signal: AbortSignal.timeout(4000),
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                modal.style.display = "none"; form.reset();
                showToast("✅ Medio de pago vinculado!");
                await loadPaymentMethods();
            } else {
                // Agregar como simulado localmente
                const newMedio = { ...payload, id: 'sim-' + Date.now(), tipo: payload.tipo, simulado: true };
                allMyMedios.push(newMedio);
                renderPaymentSelector("ALL");
                modal.style.display = "none"; form.reset();
                showToast("✅ Medio agregado (demo)");
            }
        } catch(err) {
            // Sin internet → agregar localmente
            const newMedio = { ...payload, id: 'sim-' + Date.now(), tipo: payload.tipo, simulado: true };
            allMyMedios.push(newMedio);
            renderPaymentSelector("ALL");
            modal.style.display = "none"; form.reset();
            showToast("✅ Medio agregado (demo)");
        }
    });
}

let curImg = 0;
window.openProductDetail = (p) => {
    const modal   = document.getElementById('productDetailModal');
    const content = document.getElementById('modalContent');
    let the_img = p.imagen_principal || '📦';
    if (p.imagenes && p.imagenes.length > 0 && p.imagenes[0].imagen) the_img = p.imagenes[0].imagen;
    else if (p.descripcion && p.descripcion.includes('||IMG:')) {
        const m = p.descripcion.match(/\|\|IMG:(.*?)\|\|/);
        if (m) the_img = m[1];
    }
    const gal = [];
    if (p.imagenes && p.imagenes.length > 0) {
        p.imagenes.forEach(i => gal.push(i.imagen));
    }
    if (gal.length === 0) {
        gal.push(the_img);
        if (typeof the_img === 'string' && (the_img.startsWith('http') || the_img.startsWith('/'))) {
            gal.push('https://placehold.co/800x800/1e293b/ffffff?text=Vista+Lateral');
            gal.push('https://placehold.co/800x800/334155/ffffff?text=En+Caja');
        } else {
            gal.push('✨ ' + the_img);
            gal.push('🏷️ Etiqueta');
        }
    }
    curImg = 0;
    const isUrl = (s) => s && s.startsWith('http');
    const render = () => `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;">
        <div style="position:relative;background:rgba(255,255,255,0.02);height:300px;display:flex;align-items:center;justify-content:center;border-radius:20px;">
            <button onclick="moveGallery(-1)" style="position:absolute;left:10px;z-index:10;background:rgba(0,0,0,0.5);border:none;color:white;width:40px;height:40px;border-radius:50%;cursor:pointer;font-size:1.2rem;">‹</button>
            <div id="detailMainImageContainerCart" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:6rem;">
                ${isUrl(gal[curImg]) ? `<img src="${gal[curImg]}" style="max-height:200px;border-radius:12px;object-fit:contain;">` : gal[curImg]}
            </div>
            <button onclick="moveGallery(1)" style="position:absolute;right:10px;z-index:10;background:rgba(0,0,0,0.5);border:none;color:white;width:40px;height:40px;border-radius:50%;cursor:pointer;font-size:1.2rem;">›</button>
        </div>
        <div>
            <h3 style="font-size:1.6rem;margin-bottom:10px;">${p.nombre}</h3>
            <div style="color:#fbbf24;margin-bottom:15px;">★★★★★ <span style="font-size:0.8rem;color:#94a3b8;">(Vendedor: <a href="/pages/seller-profile.html?vendor_id=${p.vendedor || 1}" style="color:var(--primary);text-decoration:none;">${p.vendedor_nombre || 'Konrad Shop'}</a>)</span></div>
            <div style="font-size:2rem;font-weight:800;color:white;margin-bottom:15px;">$${new Intl.NumberFormat('es-CO').format(p.precio_fijo || 1200000)}</div>
            <p style="line-height:1.6;color:#94a3b8;margin-bottom:20px;">${p.descripcion || 'Calidad Konrad Shop.'}</p>
            <div style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:12px;font-size:0.85rem;color:#94a3b8;">
                🛡️ Garantía Konrad Shop · Envío asegurado · Devoluciones en 30 días
            </div>
        </div>
    </div>`;
    window.currentGalleryPaths = gal;
    window.moveGallery = (delta) => { 
        curImg = (curImg + delta + window.currentGalleryPaths.length) % window.currentGalleryPaths.length;
        const container = document.getElementById('detailMainImageContainerCart');
        if (container) {
            const src = window.currentGalleryPaths[curImg];
            container.innerHTML = isUrl(src) 
                ? `<img src="${src}" style="max-height:200px;border-radius:12px;object-fit:contain;">`
                : src;
        }
    };
    content.innerHTML = render(); modal.style.display = "flex";
};
