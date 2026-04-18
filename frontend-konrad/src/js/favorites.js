const API_PRODUCTS = 'http://127.0.0.1:8000/api/v1/products/productos/';
const API_COMMENTS = 'http://127.0.0.1:8000/api/v1/products/comentarios/';

// ─── UTILIDADES DE SESIÓN ───
function getUserKey() {
    const u = JSON.parse(localStorage.getItem('user_data') || '{}');
    return u.email || u.username || 'guest';
}
function getFavorites() {
    const key = `favs_${getUserKey()}`;
    return JSON.parse(localStorage.getItem(key) || localStorage.getItem('konrad_favs_v99') || '[]');
}
function saveFavorites(items) {
    localStorage.setItem(`favs_${getUserKey()}`, JSON.stringify(items));
}
function getCartItems() {
    const key = `cart_${getUserKey()}`;
    return JSON.parse(localStorage.getItem(key) || localStorage.getItem('konrad_cart_v99') || '[]');
}
function saveCartItems(items) {
    localStorage.setItem(`cart_${getUserKey()}`, JSON.stringify(items));
}

window.handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    window.location.href = '/pages/login.html';
};

// ─── INIT ───
document.addEventListener('DOMContentLoaded', async () => {
    updateBadge();
    await fetchFavorites();
    setupDetailModal();
    setupClearAll();
});

function updateBadge() {
    const b = document.getElementById('cartCount');
    if (b) b.textContent = getCartItems().length;
}

function setupClearAll() {
    const btn = document.getElementById('clearFavsBtn');
    if (btn) btn.onclick = () => {
        if (confirm('¿Limpiar todos tus favoritos?')) { saveFavorites([]); fetchFavorites(); }
    };
}

// ─── CARGAR FAVORITOS ───
async function fetchFavorites() {
    const grid = document.getElementById('favsGrid');
    const favIds = getFavorites();
    if (favIds.length === 0) {
        grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:80px;color:#94a3b8;">
            <div style="font-size:4rem;margin-bottom:20px;">💔</div>
            <p style="font-size:1.2rem;">Aún no tienes favoritos guardados.</p>
            <a href="/pages/catalog.html" style="color:var(--primary);font-weight:800;text-decoration:none;margin-top:10px;display:block;">← Explorar catálogo</a>
        </div>`;
        return;
    }
    try {
        const res = await fetch(API_PRODUCTS);
        const data = await res.json();
        const all = Array.isArray(data) ? data : (data.results || []);
        const filtered = all.filter(p => favIds.includes(String(p.id)));
        renderFavorites(filtered);
    } catch (e) {
        grid.innerHTML = '<p style="color:#ef4444;text-align:center;">Error al cargar favoritos.</p>';
    }
}

function renderFavorites(prods) {
    const grid = document.getElementById('favsGrid');
    grid.innerHTML = prods.map(p => {
        const p_id = String(p.id);
        const price = new Intl.NumberFormat('es-CO').format(p.valor || 0);
        let img = p.imagen_principal || '';
        if (p.imagenes && p.imagenes.length > 0) img = p.imagenes[0].imagen;
        else if (p.descripcion && p.descripcion.includes('||IMG:')) {
            const m = p.descripcion.match(/\|\|IMG:(.*?)\|\|/);
            if (m) img = m[1];
        }
        if (img && img.startsWith('/media/')) {
            img = `http://127.0.0.1:8000${img}`;
        }
        const imgTag = img && (img.startsWith('http') || img.startsWith('/'))
            ? `<img src="${img}" style="width:100%;height:100%;object-fit:cover;">`
            : `<div style="font-size:4rem;display:flex;align-items:center;justify-content:center;height:100%;">📦</div>`;

        const isAgotado = (p.cantidad ?? 0) <= 0;
        const addBtnAttr = isAgotado ? 'disabled style="background:#4b5563;cursor:not-allowed;filter:grayscale(1); opacity:0.6;"' : '';
        const addBtnText = isAgotado ? 'Agotado' : '🛒 Añadir';
        const qtyDisplay = isAgotado ? 'none' : 'flex';

        return `
        <div class="product-card glass-effect" id="card-${p_id}" style="animation:fadeInUp 0.5s ease both;position:relative;">
            <button onclick="removeFav('${p_id}')" style="position:absolute;top:10px;right:10px;z-index:10;background:rgba(239,68,68,0.15);border:none;color:#ef4444;width:32px;height:32px;border-radius:50%;cursor:pointer;">❤️</button>
            <div onclick='openProductDetail(${JSON.stringify(p).replace(/'/g,"&apos;")})' style="cursor:pointer;height:180px;overflow:hidden;border-radius:15px;margin-bottom:12px;background:#0c0f18;">
                ${imgTag}
            </div>
            <h4 style="margin:5px 0;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.nombre}</h4>
            <p style="color:#fbbf24;font-size:0.8rem;margin-bottom:8px;">★★★★★</p>
            <p style="font-weight:800;font-size:1.1rem;margin-bottom:12px;">$${price} COP</p>
            <div style="display:${qtyDisplay};align-items:center;justify-content:center;gap:10px;margin-bottom:12px;background:rgba(255,255,255,0.05);padding:8px;border-radius:12px;">
                <button onclick="changeQty('${p_id}',-1)" style="background:transparent;border:none;color:white;font-size:1.2rem;cursor:pointer;width:30px;">−</button>
                <span id="qty-${p_id}" data-stock="${p.cantidad ?? 0}" style="font-weight:800;color:white;min-width:20px;text-align:center;">1</span>
                <button onclick="changeQty('${p_id}',1)" style="background:transparent;border:none;color:white;font-size:1.2rem;cursor:pointer;width:30px;">+</button>
            </div>
            <div style="display:flex;gap:8px;">
                <button onclick="addToCart('${p_id}')" ${addBtnAttr} style="flex:1;background:var(--primary);color:white;border:none;padding:12px;border-radius:10px;font-weight:800;cursor:pointer;font-size:0.9rem;">${addBtnText}</button>
                <button onclick='openProductDetail(${JSON.stringify(p).replace(/'/g,"&apos;")})' style="flex:0.35;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:white;border-radius:10px;cursor:pointer;">🔎</button>
            </div>
        </div>`;
    }).join('');
}

window.changeQty = (id, delta) => {
    const el = document.getElementById(`qty-${id}`);
    if (!el) return;
    const stock = parseInt(el.dataset.stock || '0');
    const newVal = Math.max(1, Math.min(stock > 0 ? stock : 1, parseInt(el.textContent) + delta));
    el.textContent = newVal;
    if (stock > 0 && newVal >= stock) {
        el.style.color = '#f59e0b'; // aviso visual: tope de stock
        if (delta > 0) showToast(`⚠️ Solo hay ${stock} unidades disponibles`);
    } else {
        el.style.color = 'white';
    }
};

window.removeFav = (id) => {
    saveFavorites(getFavorites().filter(f => f !== String(id)));
    fetchFavorites();
};

window.addToCart = async (id) => {
    const qtyEl = document.getElementById(`qty-${id}`);
    const q = parseInt(qtyEl?.textContent || '1');
    const stock = parseInt(qtyEl?.dataset?.stock || '999');

    const cart = getCartItems();
    const currentQtyInCart = cart.filter(x => String(x) === String(id)).length;

    if (currentQtyInCart + q > stock) {
        if (stock - currentQtyInCart <= 0) {
            showToast(`⚠️ No puedes añadir más. Ya tienes el máximo disponible (${stock}) en tu carrito.`, true);
        } else {
            showToast(`⚠️ Solo puedes añadir ${stock - currentQtyInCart} más. El stock total es ${stock}.`, true);
        }
        return;
    }

    for (let i = 0; i < q; i++) cart.push(String(id));
    saveCartItems(cart);
    updateBadge();
    showToast(`✅ ¡${q} unidad(es) añadida(s) al carrito!`);
    const tkn = localStorage.getItem('access_token');
    if (tkn) {
        try {
            const resO = await fetch('http://127.0.0.1:8000/api/v1/orders/ordenes/', { headers: { 'Authorization': `Bearer ${tkn}` } });
            const raw = await resO.json();
            const orders = Array.isArray(raw) ? raw : (raw.results || []);
            let active = orders.find(o => o.estado === 'CARRITO');
            if (!active) {
                const resN = await fetch('http://127.0.0.1:8000/api/v1/orders/ordenes/', {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tkn}` },
                    body: JSON.stringify({ estado: 'CARRITO' })
                });
                active = await resN.json();
            }
            if (active && active.id) {
                const pRes = await fetch(API_PRODUCTS + id + '/');
                const pData = await pRes.json();
                const pVal = parseFloat(pData.valor || pData.precio_fijo || 0);
                await fetch('http://127.0.0.1:8000/api/v1/orders/detalles/', {
                    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tkn}` },
                    body: JSON.stringify({ orden: active.id, producto: id, cantidad: q, valor_unitario: pVal })
                });
            }
        } catch (e) { /* silent */ }
    }
};

// ─── MODAL DETALLE (2 COLUMNAS, IDENTICO AL DASHBOARD) ───
let currentGalleryIndex = 0;

window.openProductDetail = (p) => {
    currentGalleryIndex = 0;
    const m = document.getElementById('productDetailModal');
    const c = document.getElementById('modalContent');
    if (!m || !c) return;

    const pText = new Intl.NumberFormat('es-CO').format(p.valor || p.precio_fijo || 0);
    const cleanDesc = (p.descripcion || '').split('||IMG:')[0].trim() || 'Producto de alta calidad Konrad Shop.';
    const sellerId = p.vendedor || 1;
    const sellerName = p.vendedor_nombre || 'Konrad Shop';

    const gallery = [];
    if (p.imagenes && p.imagenes.length > 0) p.imagenes.forEach(i => gallery.push(i.imagen));
    if (gallery.length === 0 && p.imagen_principal) gallery.push(p.imagen_principal);
    if (gallery.length === 0 && p.descripcion && p.descripcion.includes('||IMG:')) {
        const mm = p.descripcion.match(/\|\|IMG:(.*?)\|\|/);
        if (mm) gallery.push(mm[1]);
    }
    if (gallery.length === 0) gallery.push('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800');

    const isUrl = s => s && (s.startsWith('http') || s.startsWith('/'));
    const imgHtml = isUrl(gallery[0])
        ? `<img src="${gallery[0]}" id="modalMainImg" onerror="this.src='https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800'" style="width:100%;height:100%;object-fit:contain;">`
        : `<div id="modalMainImg" style="font-size:5rem;display:flex;align-items:center;justify-content:center;height:100%;">${gallery[0]}</div>`;

    c.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:40px;">
        <!-- COLUMNA IZQUIERDA: Imagen + Comentarios -->
        <div>
            <div style="position:relative;width:100%;height:340px;background:#0c0f18;border-radius:25px;overflow:hidden;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.05);">
                <button onclick="moveGallery(-1)" style="position:absolute;left:12px;z-index:20;background:rgba(0,0,0,0.6);border:none;color:white;width:38px;height:38px;border-radius:50%;cursor:pointer;font-size:1.1rem;">&#8249;</button>
                ${imgHtml}
                <button onclick="moveGallery(1)" style="position:absolute;right:12px;z-index:20;background:rgba(0,0,0,0.6);border:none;color:white;width:38px;height:38px;border-radius:50%;cursor:pointer;font-size:1.1rem;">&#8250;</button>
            </div>

            <!-- RESEÑAS + PREGUNTAS (solo lectura pública, escritura con sesión) -->
            <div style="margin-top:18px;">
                <!-- RESEÑAS -->
                <div style="padding:14px;background:rgba(255,255,255,0.02);border-radius:16px;border:1px solid rgba(251,191,36,0.1);margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                        <div style="width:7px;height:7px;border-radius:50%;background:#fbbf24;box-shadow:0 0 6px #fbbf24;"></div>
                        <p style="color:white;font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin:0;">Reseñas del Producto</p>
                    </div>
                    <div id="commentsContainer" style="max-height:140px;overflow-y:auto;padding-right:4px;">
                        <p style="color:#64748b;text-align:center;padding:10px;font-size:0.8rem;">Cargando...</p>
                    </div>
                </div>
                <!-- PREGUNTAS -->
                <div style="padding:14px;background:rgba(255,255,255,0.02);border-radius:16px;border:1px solid rgba(59,130,246,0.1);">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                        <div style="width:7px;height:7px;border-radius:50%;background:#3b82f6;box-shadow:0 0 6px #3b82f6;"></div>
                        <p style="color:white;font-size:0.78rem;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin:0;">Preguntas al Vendedor</p>
                    </div>
                    <div id="questionsContainerFav" style="max-height:120px;overflow-y:auto;padding-right:4px;margin-bottom:10px;">
                        <p style="color:#64748b;text-align:center;padding:10px;font-size:0.8rem;">Cargando...</p>
                    </div>
                    ${localStorage.getItem('access_token') ? `
                    <div style="display:flex;gap:8px;">
                        <textarea id="newQuestionFavTxt" placeholder="Haz una pregunta al vendedor..." 
                            style="flex:1;height:34px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:white;outline:none;resize:none;font-size:0.8rem;border-radius:8px;padding:6px;font-family:inherit;"></textarea>
                        <button onclick="submitFavQuestion('${p.id}')" class="cta-primary" style="padding:0 12px;font-size:0.75rem;background:#3b82f6;border-radius:8px;white-space:nowrap;">Enviar</button>
                    </div>` : `
                    <p style="color:#64748b;font-size:0.78rem;text-align:center;"><a href="/pages/login.html" style="color:var(--primary);">Inicia sesión</a> para hacer preguntas.</p>`}
                </div>
            </div>
        </div>

        <!-- COLUMNA DERECHA: Info del producto -->
        <div style="display:flex;flex-direction:column;">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;background:rgba(99,102,241,0.05);padding:12px 16px;border-radius:14px;border:1px solid rgba(99,102,241,0.1);width:fit-content;">
                <div style="width:32px;height:32px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.9rem;">&#x1F464;</div>
                <div>
                    <p style="color:#94a3b8;font-size:0.6rem;margin:0;font-weight:800;letter-spacing:1px;text-transform:uppercase;">Vendedor Oficial</p>
                    <a href="/pages/seller-profile.html?vendor_id=${sellerId}" style="color:white;text-decoration:none;font-size:0.9rem;font-weight:700;border-bottom:1px dashed rgba(255,255,255,0.3);">${sellerName} &#x2192;</a>
                </div>
            </div>

            <h2 style="font-size:2.2rem;font-weight:900;color:white;margin-bottom:10px;letter-spacing:-0.5px;">${p.nombre}</h2>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
                <span style="color:#fbbf24;font-size:1rem;">&#x2605;&#x2605;&#x2605;&#x2605;&#x2605;</span>
                <span style="color:#64748b;font-size:0.82rem;">Vendedor verificado por Comercial Konrad</span>
            </div>

            <p style="font-size:2.5rem;font-weight:900;color:white;margin-bottom:10px;text-shadow:0 0 20px rgba(99,102,241,0.2);">
                $${ pText} <span style="font-size:0.9rem;color:#64748b;font-weight:400;">COP</span>
            </p>

            ${(() => {
                const s = p.cantidad || 0;
                const label = s <= 0 ? '❌ Agotado' : s <= 5 ? `⚠️ Pocas unidades (${s} disp.)` : `✅ En stock (${s} disponibles)`;
                const dot   = s <= 0 ? '#ef4444' : s <= 5 ? '#f59e0b' : '#22c55e';
                const col   = s <= 0 ? '#f87171' : s <= 5 ? '#fbbf24' : '#86efac';
                const bg    = s <= 0 ? 'rgba(239,68,68,0.08)' : s <= 5 ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)';
                const bdr   = s <= 0 ? 'rgba(239,68,68,0.2)' : s <= 5 ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)';
                return `<div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:14px;padding:6px 14px;border-radius:30px;background:${bg};border:1px solid ${bdr};"><div style="width:7px;height:7px;border-radius:50%;background:${dot};"></div><span style="font-size:0.8rem;font-weight:700;color:${col};">${label}</span></div>`;
            })()}

            <div style="padding:16px;background:rgba(255,255,255,0.02);border-radius:14px;margin-bottom:22px;border:1px solid rgba(255,255,255,0.05);line-height:1.7;">
                <p style="color:#cbd5e1;font-size:0.95rem;margin:0;">${cleanDesc}</p>
            </div>

            <div style="display:flex;gap:12px;margin-bottom:16px;">
                <button class="cta-primary" onclick="addToCart('${p.id}'); document.getElementById('productDetailModal').style.display='none';" 
                    style="flex:2;padding:18px;font-size:1.1rem;font-weight:800;">&#x1F6D2; Añadir al Carrito</button>
                <button onclick="removeFav('${p.id}'); document.getElementById('productDetailModal').style.display='none';" 
                    style="flex:0.5;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#ef4444;border-radius:14px;cursor:pointer;font-size:1.4rem;">&#x2665;</button>
            </div>
            <p style="font-size:0.78rem;color:#64748b;">&#x1F4E6; Envío prioritario Konrad &bull; &#x1F6E1; Garantía Premium &bull; &#x1F4B3; SSL</p>
        </div>
    </div>`;

    loadComments(p.id);
    loadFavQuestions(p.id);

    window.moveGallery = (delta) => {
        currentGalleryIndex = (currentGalleryIndex + delta + gallery.length) % gallery.length;
        const src = gallery[currentGalleryIndex];
        const imgEl = document.getElementById('modalMainImg');
        if (imgEl) {
            if (isUrl(src)) { imgEl.src = src; }
            else { imgEl.textContent = src; }
        }
    };

    m.style.display = 'flex';
};

// ─── RESEÑAS (público) ───
async function loadComments(productId) {
    const box = document.getElementById('commentsContainer');
    if (!box) return;
    const token = localStorage.getItem('access_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
        const res = await fetch(API_COMMENTS, { headers });
        if (res.ok) {
            const data = await res.json();
            const all = Array.isArray(data) ? data : (data.results || []);
            const mine = all.filter(c => String(c.producto) === String(productId));
            if (mine.length > 0) {
                box.innerHTML = mine.map(c => `
                    <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:10px;margin-bottom:8px;border:1px solid rgba(255,255,255,0.05);">
                        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                            <span style="color:#818cf8;font-weight:800;font-size:0.78rem;">👤 ${c.comprador_nombre || 'Estudiante Konrad'}</span>
                            <span style="color:#fbbf24;font-size:0.72rem;">${'★'.repeat(c.calificacion || 10)}${'☆'.repeat(10 - (c.calificacion || 10))}</span>
                        </div>
                        <p style="color:#e2e8f0;font-size:0.82rem;line-height:1.5;margin:0;">${c.comentario}</p>
                    </div>`).join('');
            } else {
                box.innerHTML = `<p style="color:#64748b;text-align:center;padding:10px;font-size:0.8rem;">Aún no hay reseñas para este producto.</p>`;
            }
        } else {
            box.innerHTML = `<p style="color:#64748b;text-align:center;padding:10px;font-size:0.8rem;">Sin reseñas disponibles.</p>`;
        }
    } catch (e) {
        box.innerHTML = `<p style="color:#64748b;text-align:center;padding:10px;font-size:0.8rem;">Sin conexión al servidor.</p>`;
    }
}

// ─── PREGUNTAS (público) ───
async function loadFavQuestions(productId) {
    const box = document.getElementById('questionsContainerFav');
    if (!box) return;
    const token = localStorage.getItem('access_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
        const res = await fetch('http://127.0.0.1:8000/api/v1/products/preguntas/', { headers });
        if (res.ok) {
            const data = await res.json();
            const all = Array.isArray(data) ? data : (data.results || []);
            const qs = all.filter(q => String(q.producto) === String(productId));
            if (qs.length > 0) {
                box.innerHTML = qs.map(q => `
                    <div style="margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,0.04);">
                        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                            <span style="color:#93c5fd;font-weight:700;font-size:0.78rem;">👤 ${q.comprador_nombre}</span>
                            <span style="color:#64748b;font-size:0.65rem;">${new Date(q.fecha_pregunta).toLocaleDateString('es-CO')}</span>
                        </div>
                        <p style="color:#cbd5e1;font-size:0.8rem;margin:0 0 4px;">Q: ${q.pregunta}</p>
                        ${q.respuesta ? `<p style="color:#86efac;font-size:0.78rem;margin:0;padding:4px 8px;background:rgba(34,197,94,0.05);border-radius:6px;">↩ ${q.respuesta}</p>` : `<p style="color:#64748b;font-size:0.72rem;font-style:italic;margin:0;">Esperando respuesta del vendedor...</p>`}
                    </div>`).join('');
            } else {
                box.innerHTML = `<p style="color:#64748b;text-align:center;padding:10px;font-size:0.8rem;">Aún no hay preguntas. ¡Sé el primero!</p>`;
            }
        } else {
            box.innerHTML = `<p style="color:#64748b;text-align:center;padding:10px;font-size:0.8rem;">Sin preguntas disponibles.</p>`;
        }
    } catch (e) {
        box.innerHTML = `<p style="color:#64748b;text-align:center;padding:10px;font-size:0.8rem;">Sin conexión.</p>`;
    }
}

window.submitFavQuestion = async (productId) => {
    const txtEl = document.getElementById('newQuestionFavTxt');
    const txt = txtEl?.value?.trim();
    if (!txt) { showToast('⚠️ Escribe tu pregunta antes de enviar'); return; }
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = '/pages/login.html'; return; }
    try {
        const res = await fetch('http://127.0.0.1:8000/api/v1/products/preguntas/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ producto: parseInt(productId), pregunta: txt })
        });
        if (res.ok) {
            txtEl.value = '';
            showToast('✅ Pregunta enviada al vendedor');
            loadFavQuestions(productId);
        } else {
            const err = await res.json().catch(() => ({}));
            showToast('❌ Error: ' + (err.detail || 'No se pudo enviar'));
        }
    } catch (e) { showToast('❌ Error de red al enviar'); }
};


// ─── MODAL CLOSE ───
function setupDetailModal() {
    const m = document.getElementById('productDetailModal');
    if (!m) return;
    document.getElementById('closeModal').onclick = () => m.style.display = 'none';
    m.addEventListener('click', e => { if (e.target === m) m.style.display = 'none'; });
}

function showToast(msg) {
    let t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div'); t.id = 'toast';
        t.style = 'position:fixed;top:100px;right:30px;padding:14px 28px;background:rgba(139,92,246,0.9);border-radius:15px;z-index:99999;color:white;transform:translateX(200%);transition:0.3s;font-weight:700;';
        document.body.appendChild(t);
    }
    t.textContent = msg; t.style.transform = 'translateX(0)';
    setTimeout(() => t.style.transform = 'translateX(200%)', 3500);
}
