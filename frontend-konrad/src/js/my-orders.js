const API_ORDERS   = 'http://127.0.0.1:8000/api/v1/orders/ordenes/';
const API_PRODUCTS = 'http://127.0.0.1:8000/api/v1/products/productos/';
const token = localStorage.getItem("access_token");

if (!token) window.location.href = "/pages/login.html";

// Órdenes simuladas como respaldo si el backend falla
const MOCK_ORDERS = JSON.parse(localStorage.getItem('mock_orders') || '[]');

document.addEventListener("DOMContentLoaded", () => {
    cargarPedidos();
    updateBadge();
});

let currentOrders = []; 

function getUserKey() {
    const u = JSON.parse(localStorage.getItem('user_data') || '{}');
    return u.email || u.username || 'guest';
}
function getCartItems() {
    const key = `cart_${getUserKey()}`;
    return JSON.parse(localStorage.getItem(key) || localStorage.getItem('konrad_cart_v99') || '[]');
}
function updateBadge() {
    const b = document.getElementById('cartCount');
    if (b) b.textContent = getCartItems().length;
}

// LOGOUT PERSISTENTE
window.handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_data");
    window.location.href = "/pages/login.html";
};

async function cargarPedidos() {
    const list = document.getElementById("ordersList");
    if (!list) return;

    let orders = [];
    let usandoSimulados = false;

    try {
        const res = await fetch(API_ORDERS, {
            signal: AbortSignal.timeout(5000),
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const data = await res.json();
            orders = Array.isArray(data) ? data : (data.results || []);
        } else if (res.status === 401) {
            console.warn("Sesión de pedidos (backend) no válida, continuando con simulados.");
            // NO redirigimos al login, solo informamos en consola para no molestar al usuario
        }
    } catch (err) {
        console.warn("Backend no disponible, usando órdenes simuladas.");
    }

    // Combinar reales + simuladas del localStorage
    const mockOrders = JSON.parse(localStorage.getItem('mock_orders') || '[]');
    orders = [...orders, ...mockOrders].sort((a, b) => {
        const dateA = new Date(a.fecha || a.creado_en || a.fecha_simulada || 0);
        const dateB = new Date(b.fecha || b.creado_en || b.fecha_simulada || 0);
        return dateB - dateA;
    });

    list.innerHTML = "";

    if (!orders || orders.length === 0) {
        list.innerHTML = `
            <div style="grid-column: 1/-1; text-align:center; padding:100px; color:#64748b; animation: fadeIn 0.5s ease both;">
                <div style="font-size:5rem;margin-bottom:20px;">📦</div>
                <h3 style="color:white;font-size:1.8rem;margin-bottom:10px;font-weight:800;">Aún no tienes pedidos registrados</h3>
                <p style="font-size:1.1rem;margin-bottom:35px;max-width:400px;margin-left:auto;margin-right:auto;">¡Explora nuestra comunidad y realiza tu primera compra hoy mismo!</p>
                <a href="/pages/catalog.html" class="cta-primary" style="padding:18px 50px;text-decoration:none;display:inline-block;font-weight:800;border-radius:15px;box-shadow:0 10px 25px rgba(99,102,241,0.3);">🚀 Explorar Catálogo</a>
            </div>`;
        return;
    }

    const estadoConfig = {
        'PENDIENTE':  { color: '#f59e0b', icon: '⏳' },
        'PAGADA':     { color: '#22c55e', icon: '✅' },
        'ENVIADA':    { color: '#3b82f6', icon: '🚚' },
        'ENTREGADA':  { color: '#8b5cf6', icon: '🏠' },
        'CANCELADA':  { color: '#ef4444', icon: '❌' },
        'CARRITO':    { color: '#64748b', icon: '🛒' },
        'APROBADO':   { color: '#22c55e', icon: '✅' },
    };

    list.innerHTML = orders.map(o => {
        if (o.estado === 'CARRITO') return '';

        const fechaRaw = o.fecha || o.creado_en || o.fecha_simulada || new Date().toISOString();
        const fecha = new Date(fechaRaw).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
        const totalNum = parseFloat(o.total_final || o.total_pedido || 0);
        const total = totalNum > 0 ? '$' + new Intl.NumberFormat('es-CO').format(totalNum) + ' COP' : 'Ver detalle';
        
        // El estado real viene del backend
        let estado = (o.estado || 'PENDIENTE').toUpperCase();
        
        const cfg = estadoConfig[estado] || { color: '#94a3b8', icon: '📦' };

        return `
        <div class="order-card" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:25px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;transition:border-color 0.2s;" onmouseenter="this.style.borderColor='rgba(139,92,246,0.3)'" onmouseleave="this.style.borderColor='rgba(255,255,255,0.08)'">
            <div style="display:flex;gap:20px;align-items:center;">
                <div style="width:65px;height:65px;background:rgba(139,92,246,0.1);border-radius:15px;display:flex;align-items:center;justify-content:center;font-size:2rem;">${cfg.icon}</div>
                <div>
                    <p style="font-weight:800;color:white;font-size:1.05rem;margin-bottom:4px;">Pedido #${String(o.id).padStart(5, '0')}</p>
                    <p style="color:#64748b;font-size:0.85rem;">📅 ${fecha}</p>
                    <p style="color:var(--primary);font-weight:800;margin-top:5px;">${total}</p>
                </div>
            </div>
            <div style="text-align:right;">
                <span style="display:inline-block;padding:6px 14px;border-radius:30px;background:${cfg.color}20;color:${cfg.color};font-weight:800;font-size:0.75rem;text-transform:uppercase;margin-bottom:12px;">${estado}</span><br>
                <button class="cta-primary" style="padding:10px 20px;font-size:0.85rem;" onclick="openOrderDetails('${o.id}')">🔍 Detalles</button>
            </div>
        </div>`;
    }).join('');

    // Si después de filtrar CARRITO no queda nada visible, mostrar estado vacío
    if (!list.innerHTML.trim()) {
        list.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:100px;color:#64748b;animation:fadeIn 0.5s ease both;">
                <div style="font-size:5rem;margin-bottom:20px;">📦</div>
                <h3 style="color:white;font-size:1.8rem;margin-bottom:10px;font-weight:800;">Aún no tienes pedidos registrados</h3>
                <p style="font-size:1.1rem;margin-bottom:35px;max-width:400px;margin-left:auto;margin-right:auto;">¡Explora nuestra comunidad y realiza tu primera compra hoy mismo!</p>
                <a href="/pages/catalog.html" class="cta-primary" style="padding:18px 50px;text-decoration:none;display:inline-block;font-weight:800;border-radius:15px;box-shadow:0 10px 25px rgba(99,102,241,0.3);">🚀 Explorar Catálogo</a>
            </div>`;
    }
    
    currentOrders = orders;
}



window.openOrderDetails = async (id) => {
    let orderData = currentOrders.find(o => String(o.id) === String(id));
    
    // Refresh token just in case
    const token = localStorage.getItem("access_token");
    
    const modal   = document.getElementById('orderDetailModal');
    const content = document.getElementById('orderModalContent'); // EL ID CORRECTO
    const closeBtn = document.getElementById('closeOrderModal');
    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
    content.innerHTML = `<p style="text-align:center;color:#94a3b8;padding:20px;">⏳ Cargando detalles...</p>`;
    modal.style.display = "flex";

    let detalles = orderData?.detalles || [];
    try {
        const res = await fetch(`${API_ORDERS}${id}/`, {
            signal: AbortSignal.timeout(4000),
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const od = await res.json();
            detalles = od.detalles || [];
            orderData = od;
        }
    } catch(e) {}

    const fmt = (n) => '$' + new Intl.NumberFormat('es-CO').format(Math.round(parseFloat(n) || 0));
    
    // Generar HTML de items con formulario de reseña
    const itemsHtml = detalles.length > 0
        ? detalles.map(d => {
            const pid = d.producto;
            const pName = d.producto_nombre || 'Producto #' + pid;
            const link = `/pages/catalog.html?viewProduct=${pid}`;
            
            return `
            <div style="background:rgba(255,255,255,0.03); padding:20px; border-radius:15px; margin-bottom:15px; border:1px solid rgba(255,255,255,0.05); display: flex; gap: 15px; transition: 0.3s;" onmouseenter="this.style.background='rgba(255,255,255,0.06)'" onmouseleave="this.style.background='rgba(255,255,255,0.03)'">
                <div onclick="window.location.href='${link}'" style="width: 70px; height: 70px; background: rgba(0,0,0,0.5); border-radius: 10px; flex-shrink: 0; display:flex; align-items:center; justify-content:center; overflow:hidden; cursor:pointer; border:1px solid rgba(255,255,255,0.1);">
                    ${(() => {
                        let src = d.producto_imagen || '📦';
                        if (src.startsWith('/media/')) src = `http://127.0.0.1:8000${src}`;
                        if (src.startsWith('http')) {
                            return `<img src="${src}" onerror="this.src='https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800&auto=format&fit=crop'" style="width:100%;height:100%;object-fit:cover;">`;
                        } else {
                            return `<span style="font-size:2rem;">${src}</span>`;
                        }
                    })()}
                </div>
                <div style="flex: 1;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                        <span onclick="window.location.href='${link}'" style="font-weight:700; color:white; font-size:1rem; cursor:pointer;" onmouseenter="this.style.textDecoration='underline'" onmouseleave="this.style.textDecoration='none'">${pName} x${d.cantidad}</span>
                        <span style="color:var(--primary); font-weight:800;">${fmt(d.valor_unitario * d.cantidad)}</span>
                    </div>
                
                <!-- SECCIÓN DE CALIFICACIÓN -->
                <div id="review-form-${pid}" style="border-top:1px solid rgba(255,255,255,0.1); padding-top:15px; margin-top:10px;">
                    ${d.ya_calificado ? `
                        <p style="color:#22c55e; font-size:0.85rem; font-weight:700; background:rgba(34,197,94,0.05); padding:10px; border-radius:10px; text-align:center;">✅ Ya has calificado este producto.</p>
                    ` : `
                        <p style="font-size:0.8rem; color:#94a3b8; margin-bottom:10px;">⭐ ¿Qué te pareció el producto?</p>
                        <div style="display:flex; gap:8px; margin-bottom:12px;">
                            <select id="rating-${pid}" style="width:100px; padding:8px; border-radius:8px; background:#1e293b; color:white; border:1px solid rgba(255,255,255,0.1);">
                                <option value="">Calificar</option>
                                <option value="10">10 - Excelente</option>
                                <option value="9">9 - Muy Bueno</option>
                                <option value="8">8 - Bueno</option>
                                <option value="7">7 - Regular</option>
                                <option value="6">6 - Aceptable</option>
                                <option value="5">5 - Mediocre</option>
                                <option value="4">4 - Deficiente</option>
                                <option value="3">3 - Muy Malo</option>
                                <option value="2">2 - Pobre</option>
                                <option value="1">1 - Pésimo</option>
                            </select>
                            <input type="text" id="comment-${pid}" placeholder="Escribe tu reseña aquí..." style="flex:1; padding:8px 12px; border-radius:8px; background:#1e293b; color:white; border:1px solid rgba(255,255,255,0.1);">
                            <button onclick="submitReview('${pid}', '${orderData.id}')" style="background:var(--primary); color:white; border:none; padding:8px 15px; border-radius:8px; cursor:pointer; font-weight:700; transition:0.3s;">Publicar</button>
                        </div>
                    `}
                </div>
                </div>
            </div>`;
        }).join('')
        : `<p style="color:#64748b; text-align:center; padding:15px;">Sin detalles disponibles</p>`;

        const costoEnvio = parseFloat(orderData?.costo_envio || 0);
        const comision = parseFloat(orderData?.total_comision || 0);
        const parsedTotal = parseFloat(orderData?.total_final || orderData?.total_pedido || 0);
        const subtotalSuma = detalles.reduce((sum, d) => sum + (d.valor_unitario * d.cantidad), 0);
        
        // El verdadero subtotal es lo sumado o lo pedido menos recargos
        const calcSubtotal = parsedTotal > 0 ? (parsedTotal - comision - costoEnvio) : subtotalSuma;
        const calcTotal = parsedTotal > 0 ? parsedTotal : (subtotalSuma + comision + costoEnvio);

        // Extraer info de pago
        const pago = orderData?.pagos?.[0] || {};
        const iconMap = {
            'TARJETA': '💳',
            'PSE': '📱',
            'EFECTIVO': '💵',
            'CONSIGNACION': '🏦'
        };
        const icon = iconMap[pago.metodo_pago] || '🛡️';
        const bancoLabel = pago.banco_nombre ? ` - ${pago.banco_nombre}` : '';
        const tipoLabel = {
            'TARJETA': 'Tarjeta',
            'PSE': 'PSE / Billetera',
            'EFECTIVO': 'Efectivo',
            'CONSIGNACION': 'Consignación'
        }[pago.metodo_pago] || 'Pago Electrónico';

        const metodoTxt = `${icon} ${tipoLabel}${bancoLabel}`;

        content.innerHTML = `
        <div style="background:rgba(255,255,255,0.02); padding:15px; border-radius:12px; margin-bottom:20px; border:1px solid rgba(255,255,255,0.05); display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.2rem;">🔐</span>
            <div>
                <p style="color:#94a3b8; font-size:0.75rem; text-transform:uppercase; font-weight:700; margin:0;">Medio de Pago</p>
                <p style="color:white; font-size:0.95rem; font-weight:600; margin:0;">${metodoTxt}</p>
            </div>
        </div>
        <div style="max-height:45vh; overflow-y:auto; padding-right:10px;">
            ${itemsHtml}
        </div>
        <div style="background:rgba(139,92,246,0.05); padding:20px; border-radius:15px; border:1px solid rgba(139,92,246,0.1); margin-top:15px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; color:#94a3b8; font-size:0.9rem;">
                <span>Subtotal (IVA Inc.)</span><span>${fmt(calcSubtotal)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px; color:#94a3b8; font-size:0.9rem;">
                <span>Comisión</span><span>${fmt(comision)}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:15px; color:#94a3b8; font-size:0.9rem;">
                <span>Envío</span><span>${costoEnvio > 0 ? fmt(costoEnvio) : 'GRATIS'}</span>
            </div>
            <div style="display:flex; justify-content:space-between; font-weight:800; font-size:1.4rem; color:white; border-top:1px solid rgba(255,255,255,0.1); padding-top:15px;">
                <span>TOTAL</span><span style="color:var(--primary);">${fmt(calcTotal)}</span>
            </div>
        </div>`;
};

window.submitReview = async (productId, orderId) => {
    const btn = event.target;
    const rating = document.getElementById(`rating-${productId}`).value;
    const comment = document.getElementById(`comment-${productId}`).value;
    const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
    const personaId = userData.persona_id || userData.id;

    if (!rating) {
        alert("⭐ Por favor selecciona una calificación."); return;
    }
    if (!comment) {
        alert("⚠️ Por favor escribe un comentario."); return;
    }

    // Validación: No se pueden comentar productos "Virtuales/Mock" en la BD real
    if (String(productId).startsWith('v')) {
        alert("🚫 Este es un producto de prueba (Mock) y no existe en la Base de Datos real. Solo puedes comentar productos cargados desde el catálogo real.");
        return;
    }

    btn.disabled = true;
    btn.textContent = "Enviando...";

    try {
        const res = await fetch('http://127.0.0.1:8000/api/v1/products/comentarios/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                producto: parseInt(productId),
                comprador: personaId,
                orden: parseInt(orderId),
                comentario: comment,
                calificacion: parseInt(rating)
            })
        });

        if (res.ok) {
            const form = document.getElementById(`review-form-${productId}`);
            if (form) {
                form.innerHTML = `
                    <div style="background:rgba(34,197,94,0.1); padding:15px; border-radius:12px; border:1px solid rgba(34,197,94,0.2); text-align:center; animation: scaleIn 0.3s ease-out;">
                        <p style="color:#22c55e; font-weight:700; margin:0;">✨ ¡Gracias por tu opinión! Tu reseña ha sido publicada con éxito.</p>
                    </div>`;
            }
        } else {
            const err = await res.json();
            alert("❌ Error del servidor (" + res.status + "): " + (err.detail || "Verifica que el producto exista en la BD."));
            btn.disabled = false;
            btn.textContent = "Enviar";
        }
    } catch (e) {
        console.error(e);
        alert("❌ Error de comunicación con el servidor. ¿Está encendido el backend?");
        btn.disabled = false;
        btn.textContent = "Enviar";
    }
}
