const API_PRODUCTS = 'http://127.0.0.1:8000/api/v1/products/productos/';
const API_MEDIOS = 'http://127.0.0.1:8000/api/v1/buyers/medios-pago/';
const API_ORDERS = 'http://127.0.0.1:8000/api/v1/orders/ordenes/';
const API_DETALLES = 'http://127.0.0.1:8000/api/v1/orders/detalles/';
const token = localStorage.getItem("access_token");
let allMyMedios = [];
let cartDetails = [];            // ← declaración global (era implícita → ReferenceError en módulos)
let selectedPaymentType = 'TARJETA'; // ← estado del botón de pago activo


window.logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_data");
    // El carrito y favoritos se conservan asociados al usuario
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
            active.detalles.forEach(d => { for (let i = 0; i < d.cantidad; i++) dbItems.push(String(d.producto)); });

            const local = getCartItems();
            // Si el local está vacío (sesión fresca), cargamos lo que diga la BD.
            // Si el local ya tiene items, confiamos en el local (estado activo de compra).
            // IMPORTANTE: Solo sincronizamos desde órdenes en estado CARRITO,
            // nunca desde órdenes PENDIENTE o PAGADA (ya fueron procesadas).
            const merged = local.length === 0 ? dbItems : local;

            saveCartItems(merged);
            console.log("Sincronización exitosa:", merged.length, "ítems");
        }
        // Si no hay CARRITO activo, NO tocamos el carrito local.
        // Puede que el usuario tenga items añadidos localmente que aún no se sincronizaron.
    } catch (e) { console.warn("Error sync", e); }
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
        } catch (e) { console.error("Error al cargar productos", e); }
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
        // Normalización de precio
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

        // Convertimos el objeto en string seguro para el onclick
        const pData = JSON.stringify(p).replace(/'/g, "&apos;");

        list.innerHTML += `
        <div class="cart-item-card">
            <div onclick='openProductDetail(${pData})' class="cart-item-img-box">
                <img src="${img}" onerror="this.src='https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800&auto=format&fit=crop'" style="width:65px;height:65px;object-fit:cover;border-radius:10px;">
            </div>
            <div style="flex:1;">
                <p onclick='openProductDetail(${pData})' class="cart-item-name">${p.nombre}</p>
                <div style="color:#fbbf24;font-size:0.75rem;margin-bottom:8px;">★★★★★ <span style="color:#64748b;font-size:0.7rem;">(Vendedor: ${p.vendedor_nombre || 'Konrad Shop'})</span></div>
                
                <div style="display:flex;align-items:center;gap:15px;margin-top:10px;">
                    <div class="qty-pill">
                        <button onclick="updateQty('${id}', -1)" style="background:transparent;border:none;color:white;width:25px;height:25px;cursor:pointer; font-weight:900;">−</button>
                        <span class="qty-val">${qty}</span>
                        <button onclick="updateQty('${id}', 1)" style="background:transparent;border:none;color:white;width:25px;height:25px;cursor:pointer; font-weight:900;">+</button>
                    </div>
                    <button onclick="removeItemById('${id}')" style="background:transparent;border:none;color:#ef4444;font-size:0.75rem;cursor:pointer;font-weight:600; opacity:0.7;">🗑️ Quitar</button>
                </div>
            </div>
            <div style="text-align:right;">
                <p style="font-size:0.85rem;color:var(--primary);font-weight:700;margin-bottom:4px;">$${new Intl.NumberFormat('es-CO').format(pr)}</p>
                <div style="font-weight:900;color:white;font-size:1.15rem;">$${new Intl.NumberFormat('es-CO').format(subItem)}</div>
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

    document.getElementById("subtotalVal").textContent = fmt(sum);
    document.getElementById("commissionVal").textContent = fmt(c);
    document.getElementById("ivaVal").textContent = fmt(i);
    document.getElementById("shippingVal").textContent = env > 0 ? fmt(env) : 'GRATIS';
    document.getElementById("totalVal").textContent = fmt(sum + c + env);
}

function setupDeliveryToggle() {
    const sel = document.getElementById('deliveryType');
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
            headers: { 'Authorization': `Bearer ${localStorage.getItem("access_token")}` }
        });
        if (res.ok) {
            const rawData = await res.json();
            const data = Array.isArray(rawData) ? rawData : (rawData.results || []);
            allMyMedios = data;
        } else {
            console.error("Cart payment methods HTTP status:", res.status);
            allMyMedios = [];
        }
    } catch (e) {
        console.error("Error loading cart payment methods:", e);
        allMyMedios = [];
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
        const num = String(m.numero_cuenta_tarjeta).slice(-4);
        const icon = m.tipo === 'TARJETA' ? '💳' : m.tipo === 'BILLETERA' ? '📱' : '🏦';
        s.innerHTML += `<option value="${m.id}">${icon} ${m.banco_nombre} ****${num}</option>`;
    });

    if (list.length === 0) {
        s.innerHTML += `<option value="NEW">✨ Agregar Método Nuevo</option>`;
    } else {
        s.innerHTML += `<option value="NEW" style="font-weight:bold; color:var(--neo-orange);">✨ (+) Usar otro medio no guardado</option>`;
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

            const cardCont = document.getElementById('cardSection');
            const consigCont = document.getElementById('inline-consignacion-form');

            if (selectedPaymentType === 'CONSIGNACION') {
                if (cardCont) cardCont.style.display = 'none';
                if (consigCont) consigCont.style.display = 'block';
            } else {
                if (consigCont) consigCont.style.display = 'none';
                renderPaymentSelector(selectedPaymentType); // Muestra el cardSection adentro
            }
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
    const modal = document.getElementById('payResultModal');
    const box = document.getElementById('payResultBox');
    const ref = 'KS-' + Date.now().toString(36).toUpperCase();
    const medio = document.getElementById('paymentSelector');
    const medioNombre = medio?.selectedOptions[0]?.text || 'Método seleccionado';

    modal.style.display = 'flex';
    setTimeout(() => box.style.transform = 'scale(1)', 10);

    if (aprobado) {
        document.getElementById('payIcon').textContent = '✅';
        document.getElementById('payTitle').textContent = '¡Pago Aprobado!';
        document.getElementById('payTitle').style.color = '#22c55e';
        document.getElementById('paySubtitle').textContent = `Tu pedido fue procesado exitosamente por ${totalStr} vía ${medioNombre}.`;
        document.getElementById('payRef').textContent = `Referencia: ${ref}`;

        // Si el medio es nuevo, preguntamos si desea guardarlo
        if (window._wasNewPayment) {
            document.getElementById('payActions').innerHTML = `
                <div style="width:100%; text-align:center;">
                    <p style="color:white; margin-bottom:15px; font-weight:600;">¿Deseas guardar este medio de pago para futuras compras?</p>
                    <div style="display:flex; gap:10px; justify-content:center;">
                        <button id="btnSavePayment" onclick="window.guardarMedioDePago(${backendOrdenId ? backendOrdenId : 'null'})" style="background:#22c55e; color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:700;">Sí, Guardar</button>
                        <button onclick="pagoExitoso(${backendOrdenId ? backendOrdenId : 'null'})" style="background:#64748b; color:white; border:none; padding:10px 20px; border-radius:8px; cursor:pointer; font-weight:700;">No por ahora</button>
                    </div>
                </div>`;
        } else {
            document.getElementById('payActions').innerHTML = `
                <button onclick="pagoExitoso(${backendOrdenId ? backendOrdenId : 'null'})" style="background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:white;border:none;padding:15px 30px;border-radius:12px;font-weight:800;cursor:pointer;font-size:1rem;">
                    📦 Ver mis pedidos
                </button>`;
            setTimeout(() => pagoExitoso(backendOrdenId), 4000);
        }

    } else {
        document.getElementById('payIcon').textContent = '❌';
        document.getElementById('payTitle').textContent = 'Pago Rechazado';
        document.getElementById('payTitle').style.color = '#ef4444';
        document.getElementById('paySubtitle').textContent = 'Tu banco no autorizó la transacción. Verifica tus fondos o intenta con otro medio de pago.';
        document.getElementById('payRef').textContent = `Código de error: E-${Math.floor(Math.random() * 9000) + 1000}`;
        document.getElementById('payActions').innerHTML = `
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

        // 3. Validar medio de pago seleccionado
        const type = selectedPaymentType || document.querySelector('input[name="paymentType"]:checked')?.value;
        const medioSel = document.getElementById('paymentSelector')?.value;

        let refConsig = '';
        if (type === 'CONSIGNACION') {
            refConsig = document.getElementById('inline-consignacion-ref')?.value;
            if (!refConsig || refConsig.trim() === '') {
                showToast("⚠️ Es necesario ingresar un comprobante/referencia para continuar.", true); return;
            }
        } else if (!medioSel) {
            showToast("⚠️ Selecciona un medio de pago guardado o elige nuevo.", true); return;
        }

        btn.disabled = true;

        if (type === 'PSE' || type === 'TARJETA') {
            let numCuenta = '';
            let bancoName = '';

            if (medioSel === 'NEW') {
                numCuenta = 'NEW';
                bancoName = type === 'TARJETA' ? 'Emisor de Tarjeta' : 'Nuevo Banco (PSE)';
            } else {
                const selectedText = document.getElementById('paymentSelector').selectedOptions[0]?.text || '';
                const isNequiDaviplata = type === 'PSE' && (selectedText.toLowerCase().includes('nequi') || selectedText.toLowerCase().includes('daviplata'));
                const defaultBankName = type === 'TARJETA' ? 'Visa / Mastercard' : 'PSE';
                bancoName = isNequiDaviplata ? 'Nequi / Daviplata' : (selectedText.replace(/💳 |📱 /g, '').split('****')[0].trim() || defaultBankName);
                numCuenta = selectedText.includes('****') ? ('****' + selectedText.split('****')[1]) : '';
            }

            const url = `bank-mock.html?tipo=${type}&banco=${encodeURIComponent(bancoName)}&cuenta=${encodeURIComponent(numCuenta)}`;
            window.open(url, 'Sucursal_Virtual_Mock', 'width=500,height=750,resizable=no');
            // Cargar datos a la global para cuando regrese el event
            window._tempCartPaymentData = { type, cardNum: 'N/A', refConsig: '', isNew: (medioSel === 'NEW') };
            return;
        }

        // Si es CONSIGNACIÓN va directo al backend
        await window.procesarPagoFinal(type, 'N/A', refConsig);
    });
}

// Se ejecuta directamente o después de que vuelve de bank-mock.html
window.procesarPagoFinal = async (type, modalOutCardNum = null, modalOutRefConsig = null) => {
    // Mostrar pantalla de "procesando"
    showProcessingScreen();

    // 1. Simulación PASARELA DE PAGOS (igual que Vendedor)
    let cardNum = modalOutCardNum || 'N/A';
    // Si viene de un pago guardado extrae número:
    if (type === 'TARJETA' && !modalOutCardNum) {
        const option = document.getElementById('paymentSelector')?.selectedOptions[0]?.text || '';
        cardNum = option.includes('****') ? option.split('****').pop() : 'N/A';
    }

    let refParam = modalOutRefConsig || '';

    try {
        const payload = {
            metodo: type === 'TARJETA' ? 'Tarjeta' : (type === 'PSE' ? 'PSE' : 'Consignacion'),
            numero_tarjeta: cardNum,
            referencia_consignacion: refParam
        };
        const responseMock = await fetch('http://127.0.0.1:8000/mocks/pagos/', {
            method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' }
        });
        const dataMock = await responseMock.json();

        if (dataMock.estado !== 'EXITOSO') {
            closeProcessingScreen();
            showPayResult(false, "$0", null);
            return;
        }
    } catch (e) {
        // Fallback local si el mock no responde
        await sleep(1500);
    }

    // 2. Afectación Real a Base de Datos
    // IMPORTANTE: leer el token dinámicamente para siempre usar la sesión activa correcta
    const currentToken = localStorage.getItem("access_token");
    const userData = JSON.parse(localStorage.getItem("user_data") || "{}");
    console.log("[CHECKOUT] Usuario activo:", userData.email, "| Token presente:", !!currentToken);

    let backendOk = false;
    let ordenId = null;
    try {
        const delivery = document.getElementById('deliveryType')?.value || 'RECOGER';
        console.log("[CHECKOUT] Creando orden para:", userData.email, "| Entrega:", delivery);

        const resO = await fetch(API_ORDERS, {
            method: "POST", signal: AbortSignal.timeout(4000),
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${currentToken}` },
            body: JSON.stringify({ tipo_entrega: delivery })
        });

        console.log("[CHECKOUT] POST /ordenes/ →", resO.status);

        if (resO.ok) {
            const od = await resO.json();
            ordenId = od.id;
            console.log("[CHECKOUT] Orden creada ID:", ordenId, "| Items a agregar:", cartDetails.length);

            for (const det of cartDetails) {
                const resD = await fetch(API_DETALLES, {
                    method: "POST", signal: AbortSignal.timeout(4000),
                    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${currentToken}` },
                    body: JSON.stringify({ orden: ordenId, ...det })
                });
                if (!resD.ok) {
                    const errD = await resD.json().catch(() => ({}));
                    console.warn("[CHECKOUT] Error al agregar detalle:", det.producto, "| Status:", resD.status, "| Error:", JSON.stringify(errD));
                }
            }

            // Determinar nombre del banco para el backend
            let bankNameForBackend = 'Pago Konrad';
            if (type === 'TARJETA') {
                const opt = document.getElementById('paymentSelector')?.selectedOptions[0]?.text || '';
                bankNameForBackend = window._lastNewPaymentData?.banco_nombre || opt.split('****')[0].trim() || 'Tarjeta';
            } else if (type === 'PSE') {
                const opt = document.getElementById('paymentSelector')?.selectedOptions[0]?.text || '';
                bankNameForBackend = window._lastNewPaymentData?.banco_nombre || opt.trim() || 'PSE';
            } else if (type === 'CONSIGNACION') {
                bankNameForBackend = 'Consignación Konrad';
            }

            console.log("[CHECKOUT] Ejecutando checkout de la orden", ordenId);
            const resC = await fetch(`${API_ORDERS}${ordenId}/checkout/`, {
                method: "POST", signal: AbortSignal.timeout(4000),
                headers: { "Content-Type": "application/json", "Authorization": `Bearer ${currentToken}` },
                body: JSON.stringify({
                    metodo_pago: type,
                    banco_nombre: bankNameForBackend
                })
            });
            console.log("[CHECKOUT] POST /checkout/ →", resC.status);
            if (!resC.ok) {
                const errC = await resC.json().catch(() => ({}));
                console.error("[CHECKOUT] Error en checkout:", JSON.stringify(errC));
            }
            backendOk = resC.ok;
        } else {
            const errO = await resO.json().catch(() => ({}));
            console.error("[CHECKOUT] Error al crear orden:", JSON.stringify(errO));
        }
    } catch (e) {
        alert("¡HOLAA VIVIANA! POR FAVOR CÓPIAME ESTE TEXTO EXACTO: [ERROR CÓDIGO 2] " + e.message);
        console.error("[CHECKOUT] Excepción en backend:", e.message);
    }

    // 3. Resultado Final
    closeProcessingScreen();
    const totalEl = document.getElementById('totalVal');
    const totalStr = totalEl?.textContent || '$0';
    showPayResult(true, totalStr, backendOk ? ordenId : null);
};

window.addEventListener('message', async (event) => {
    try {
        const btn = document.getElementById("checkoutBtn");

        if (event.data === 'pago_mock_cancelado') {
            if (btn) btn.disabled = false;
            return;
        }

        let isSuccess = false;
        let cardDataFromMock = 'N/A';

        // Parseamos posibles objetos JSON (usado por pago de tarjeta nueva)
        if (typeof event.data === 'string' && event.data.startsWith('{')) {
            try {
                const parsed = JSON.parse(event.data);
                if (parsed.status === 'pago_mock_exitoso') {
                    isSuccess = true;
                    if (parsed.newCardNum) cardDataFromMock = parsed.newCardNum;
                    // Guardamos la DATA COMPLETA para el guardado automático posterior
                    window._lastNewPaymentData = parsed;
                }
            } catch (e) { }
        } else if (event.data === 'pago_mock_exitoso' || event.data === 'pago_pse_exitoso') {
            isSuccess = true;
        }

        if (isSuccess && window._tempCartPaymentData) {
            if (btn) btn.disabled = true;

            // Guardar si era un medio nuevo para preguntar al final
            window._wasNewPayment = window._tempCartPaymentData.isNew;

            // Si ingresaron tarjeta nueva, usa cardDataFromMock. Si no, usa el temp de la config
            const finalCardNum = cardDataFromMock !== 'N/A' ? cardDataFromMock : window._tempCartPaymentData.cardNum;
            const finalType = window._tempCartPaymentData.type;
            const finalRef = window._tempCartPaymentData.refConsig;

            // RESET EARLY
            window._tempCartPaymentData = null;

            await window.procesarPagoFinal(finalType, finalCardNum, finalRef);
        }
    } catch (criticalError) {
        alert("¡HOLAA VIVIANA! POR FAVOR CÓPIAME ESTE TEXTO EXACTO: [ERROR CÓDIGO 1] " + criticalError.message);
    }
});

// FUNCIÓN PARA GUARDAR EL MEDIO AUTOMÁTICAMENTE
window.guardarMedioDePago = async (backendOrdenId) => {
    const btn = document.getElementById('btnSavePayment');
    if (btn) { btn.disabled = true; btn.textContent = 'Guardando...'; }

    if (!window._lastNewPaymentData) {
        showToast("No hay datos para guardar", true);
        pagoExitoso(backendOrdenId);
        return;
    }

    try {
        const dynamicToken = localStorage.getItem("access_token");
        const res = await fetch('http://127.0.0.1:8000/api/v1/buyers/medios-pago/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${dynamicToken}`
            },
            body: JSON.stringify({
                banco_nombre: window._lastNewPaymentData.banco_nombre,
                titular_nombre: window._lastNewPaymentData.titular,
                tipo: window._lastNewPaymentData.tipoMedio, // TARJETA o CUENTA
                numero_cuenta_tarjeta: window._lastNewPaymentData.newCardNum
            })
        });

        if (res.ok) {
            showToast("✅ Medio de pago guardado correctamente");
            setTimeout(() => {
                // REDIRIGIR a pagoExitoso en lugar de payment-methods
                // ¡Esto corrige el error de que se perdieran las órdenes simuladas al guardar la tarjeta!
                pagoExitoso(backendOrdenId);
            }, 1000);
        } else {
            showToast("❌ No se pudo guardar el medio", true);
            pagoExitoso(backendOrdenId);
        }
    } catch (e) {
        pagoExitoso(backendOrdenId);
    }
};

window.pagoExitoso = async (backendOrdenId) => {
    console.log("[CHECKOUT] Finalizando flujo exitoso para orden:", backendOrdenId);
    try {
        // Refresh token
        const currentToken = localStorage.getItem("access_token");

        // Si el backend no creó la orden, guardar una orden simulada en localStorage
        if (!backendOrdenId) {
            try {
                const mockOrders = JSON.parse(localStorage.getItem('mock_orders') || '[]');
                const sub = cartDetails.reduce((a, d) => a + (d.valor_unitario * d.cantidad), 0);
                const base = sub / 1.19;
                const iva = sub - base;
                const com = sub * 0.05;
                const env = document.getElementById('deliveryType')?.value === 'DOMICILIO' ? 12000 : 0;

                // Determinar el nombre del medio para el mock
                const medioSel = document.getElementById('paymentSelector');
                const medioNombreRaw = medioSel?.selectedOptions[0]?.text || 'Pago Electrónico';
                const metodoTxt = window._lastNewPaymentData?.banco_nombre || (medioNombreRaw.split('****')[0].trim());

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
                    pagos: [{ metodo_pago: 'TARJETA', banco_nombre: metodoTxt }], // Para que el detalle lo muestre
                    simulado: true
                });
                localStorage.setItem('mock_orders', JSON.stringify(mockOrders));
            } catch (errMock) {
                console.warn("Error creando orden simulada:", errMock.message);
            }
        }

        // VACIAMOS EL CARRITO DE LA MEMORIA DEL NAVEGADOR
        saveCartItems([]);
        if (typeof updateBadge === 'function') updateBadge();

        // Vaciamos del servidor si existia (silenciosamente)
        if (currentToken) {
            try {
                const res = await fetch(API_ORDERS, {
                    headers: { 'Authorization': `Bearer ${currentToken}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const list = Array.isArray(data) ? data : (data.results || []);
                    if (Array.isArray(list)) {
                        const ord = list.find(o => o.estado === 'CARRITO');
                        if (ord) {
                            await fetch(`${API_DETALLES}?orden=${ord.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${currentToken}` } });
                            await fetch(`${API_ORDERS}${ord.id}/`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${currentToken}` } });
                        }
                    }
                }
            } catch (e) {
                console.warn("[CHECKOUT] Error limpiando carrito backend:", e.message);
            }
        }

        // Redirect a Mis Compras
        setTimeout(() => {
            window.location.href = "/pages/my-orders.html";
        }, 800);
    } catch (generalError) {
        alert("¡HOLAA VIVIANA! POR FAVOR CÓPIAME ESTE TEXTO EXACTO: [ERROR CÓDIGO 3] " + generalError.message);
    }
};

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
        } catch (e) { }
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
        } catch (e) { }
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
    const modal = document.getElementById("addPaymentModal");
    const openBtn = document.getElementById("openModalBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const form = document.getElementById("paymentForm");
    if (openBtn) openBtn.onclick = () => modal.style.display = "flex";
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
        } catch (err) {
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
    const modal = document.getElementById('productDetailModal');
    const content = document.getElementById('modalContent');
    if (!modal || !content) return;

    const cleanDesc = (p.descripcion || '').split('||IMG:')[0].trim() || 'Producto de alta calidad Konrad Shop.';
    let the_img = p.imagen_principal || '';
    if (p.imagenes && p.imagenes.length > 0 && p.imagenes[0].imagen) the_img = p.imagenes[0].imagen;
    else if (p.descripcion && p.descripcion.includes('||IMG:')) {
        const m = p.descripcion.match(/\|\|IMG:(.*?)\|\|/);
        if (m) the_img = m[1];
    }
    const gal = [];
    if (p.imagenes && p.imagenes.length > 0) p.imagenes.forEach(i => gal.push(i.imagen));
    if (gal.length === 0 && the_img) gal.push(the_img);
    if (gal.length === 0) gal.push('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800');

    curImg = 0;
    const isUrl = (s) => s && (s.startsWith('http') || s.startsWith('/'));
    const pText = new Intl.NumberFormat('es-CO').format(p.precio_fijo || p.valor || 0);
    const sellerId = p.vendedor || 1;
    const sellerName = p.vendedor_nombre || 'Konrad Shop';

    content.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:40px;padding:5px;">
        <div>
            <div style="position:relative;width:100%;height:340px;background:#0c0f18;border-radius:25px;overflow:hidden;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.05);">
                <button onclick="moveGallery(-1)" style="position:absolute;left:15px;z-index:20;background:rgba(0,0,0,0.6);border:none;color:white;width:40px;height:40px;border-radius:50%;cursor:pointer;">&#8249;</button>
                <div id="detailMainImageContainerCart" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:5rem;">
                    ${isUrl(gal[0]) ? `<img src="${gal[0]}" style="width:100%;height:100%;object-fit:contain;">` : (gal[0] || '&#x1F4E6;')}
                </div>
                <button onclick="moveGallery(1)" style="position:absolute;right:15px;z-index:20;background:rgba(0,0,0,0.6);border:none;color:white;width:40px;height:40px;border-radius:50%;cursor:pointer;">&#8250;</button>
            </div>
            <div style="margin-top:20px;padding:18px;background:rgba(255,255,255,0.02);border-radius:18px;border:1px solid rgba(255,255,255,0.05);">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                    <div style="width:9px;height:9px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e;flex-shrink:0;"></div>
                    <p style="color:white;font-size:0.85rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin:0;">Comunidad Konrad</p>
                </div>
                <div id="commentsContainer" style="max-height:160px;overflow-y:auto;padding-right:8px;margin-bottom:12px;">
                    <p style="color:#64748b;text-align:center;padding:15px;font-size:0.85rem;">Cargando...</p>
                </div>
                <div style="background:rgba(255,255,255,0.03);padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.07);">
                    <textarea id="newCommentTxt" placeholder="Escribe tu opinion sobre este producto..." style="width:100%;height:65px;background:transparent;border:none;color:white;outline:none;resize:none;font-size:0.85rem;font-family:inherit;box-sizing:border-box;"></textarea>
                    <div style="display:flex;justify-content:flex-end;margin-top:6px;">
                        <button onclick="submitCartComment('${p.id}')" class="cta-primary" style="padding:8px 20px;font-size:0.8rem;border-radius:10px;">Publicar</button>
                    </div>
                </div>
            </div>
        </div>
        <div style="display:flex;flex-direction:column;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;background:rgba(99,102,241,0.05);padding:12px 16px;border-radius:15px;border:1px solid rgba(99,102,241,0.1);width:fit-content;">
                <div style="width:34px;height:34px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;">&#x1F464;</div>
                <div>
                    <p style="color:#94a3b8;font-size:0.6rem;margin:0;font-weight:800;letter-spacing:1px;text-transform:uppercase;">Vendedor Oficial</p>
                    <p style="color:white;font-size:0.9rem;font-weight:700;margin:0;">
                        <a href="/pages/seller-profile.html?vendor_id=${sellerId}" style="color:white;text-decoration:none;border-bottom:1px dashed rgba(255,255,255,0.4);">${sellerName} &#x2192;</a>
                    </p>
                </div>
            </div>
            <h2 style="font-size:2.2rem;font-weight:900;color:white;margin-bottom:10px;letter-spacing:-1px;">${p.nombre}</h2>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
                <span style="color:#fbbf24;font-size:1rem;">&#x2605;&#x2605;&#x2605;&#x2605;&#x2605;</span>
                <span style="color:#64748b;font-size:0.8rem;">Vendedor verificado por Comercial Konrad</span>
            </div>
            <p style="font-size:2.5rem;font-weight:900;color:white;margin-bottom:20px;text-shadow:0 0 20px rgba(99,102,241,0.2);">$${pText} <span style="font-size:0.9rem;color:#64748b;font-weight:400;">COP</span></p>
            <div style="padding:18px;background:rgba(255,255,255,0.02);border-radius:15px;margin-bottom:25px;border:1px solid rgba(255,255,255,0.05);line-height:1.7;">
                <p style="color:#cbd5e1;font-size:0.95rem;margin:0;">${cleanDesc}</p>
            </div>
            <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.15);border-radius:12px;padding:14px;font-size:0.85rem;color:#94a3b8;">
                &#x1F6E1;&#xFE0F; Garantia Konrad Shop &bull; &#x1F4E6; Envio asegurado &bull; &#x21A9;&#xFE0F; Devoluciones en 30 dias
            </div>
        </div>
    </div>`;

    loadCartComments(p.id);
    window.currentGalleryPaths = gal;
    window.moveGallery = (delta) => {
        curImg = (curImg + delta + window.currentGalleryPaths.length) % window.currentGalleryPaths.length;
        const container = document.getElementById('detailMainImageContainerCart');
        if (container) {
            const src = window.currentGalleryPaths[curImg];
            container.innerHTML = isUrl(src) ? `<img src="${src}" style="width:100%;height:100%;object-fit:contain;">` : src;
        }
    };
    modal.style.display = "flex";
};

async function loadCartComments(productId) {
    const box = document.getElementById('commentsContainer');
    if (!box) return;
    const tkn = localStorage.getItem('access_token');
    if (!tkn) {
        box.innerHTML = `<div style="text-align:center;padding:15px;color:#64748b;font-size:0.85rem;">
            <a href="/pages/login.html" style="color:var(--primary);">Inicia sesión</a> para ver comentarios.</div>`;
        return;
    }
    try {
        const res = await fetch('http://127.0.0.1:8000/api/v1/products/comentarios/', {
            headers: { 'Authorization': `Bearer ${tkn}` }
        });
        if (res.ok) {
            const data = await res.json();
            const all = Array.isArray(data) ? data : (data.results || []);
            const mine = all.filter(c => String(c.producto) === String(productId));
            if (mine.length > 0) {
                box.innerHTML = mine.map(c => `
                    <div style="background:rgba(255,255,255,0.03);padding:12px;border-radius:10px;margin-bottom:10px;border:1px solid rgba(255,255,255,0.05);">
                        <div style="display:flex;justify-content:space-between;margin-bottom:5px;">
                            <span style="color:#818cf8;font-weight:800;font-size:0.8rem;">&#x1F464; ${c.comprador_nombre || 'Estudiante Konrad'}</span>
                            <span style="color:#fbbf24;font-size:0.75rem;">${'★'.repeat(c.calificacion || 10)}${'☆'.repeat(10 - (c.calificacion || 10))}</span>
                        </div>
                        <p style="color:#e2e8f0;font-size:0.85rem;line-height:1.5;margin:0;">${c.comentario}</p>
                    </div>`).join('');
            } else {
                box.innerHTML = `<div style="text-align:center;padding:20px;color:#64748b;font-size:0.85rem;"><span style="font-size:1.8rem;display:block;margin-bottom:8px;">&#x2728;</span>&#xa1;S&#xe9; el primero en opinar!</div>`;
            }
        } else if (res.status === 401) {
            box.innerHTML = `<p style="color:#64748b;text-align:center;padding:15px;font-size:0.8rem;">Sesión requerida para ver comentarios.</p>`;
        } else {
            box.innerHTML = `<p style="color:#64748b;text-align:center;padding:15px;font-size:0.8rem;">Error ${res.status} al cargar comentarios.</p>`;
        }
    } catch (e) { box.innerHTML = `<p style="color:#64748b;text-align:center;padding:15px;">Sin conexión.</p>`; }
}

window.submitCartComment = async (productId) => {
    const txtEl = document.getElementById('newCommentTxt');
    const txt = txtEl?.value?.trim();
    if (!txt) return;
    if (!token) { alert("Inicia sesion para comentar."); return; }
    try {
        const res = await fetch('http://127.0.0.1:8000/api/v1/products/comentarios/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ producto: parseInt(productId), comentario: txt, calificacion: 10 })
        });
        if (res.ok) {
            txtEl.value = "";
            showToast("Comentario publicado");
            loadCartComments(productId);
        } else {
            const err = await res.json().catch(() => ({}));
            showToast("Error: " + (err.detail || JSON.stringify(err)));
            console.error(err);
        }
    } catch (e) { showToast("Error de red"); }
};



