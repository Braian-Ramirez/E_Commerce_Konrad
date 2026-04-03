const API_PRODUCTS = 'http://127.0.0.1:8000/api/v1/products/productos/';

// ─── UTILIDADES DE SESIÓN ───
function getUserKey() { return 'konrad_user_session'; }

function getFavorites() {
    return JSON.parse(localStorage.getItem('konrad_favs_v99') || '[]');
}
function saveFavorites(items) {
    localStorage.setItem('konrad_favs_v99', JSON.stringify(items));
}

function getCartItems() {
    return JSON.parse(localStorage.getItem('konrad_cart_v99') || '[]');
}
function saveCartItems(items) {
    localStorage.setItem('konrad_cart_v99', JSON.stringify(items));
}

// ─── INICIALIZACIÓN ───
document.addEventListener("DOMContentLoaded", async () => {
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
    if (btn) {
        btn.onclick = () => {
            if (confirm('¿Limpiar todos tus favoritos?')) {
                saveFavorites([]);
                fetchFavorites();
            }
        }
    }
}

// ─── CARGA Y RENDERIZADO ───
async function fetchFavorites() {
    const grid = document.getElementById('favsGrid');
    const favIds = getFavorites();

    if (favIds.length === 0) {
        grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding:80px; color:#94a3b8;">
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
        grid.innerHTML = '<p style="color:#ef4444;text-align:center;">Error al cargar tus favoritos.</p>';
    }
}

function renderFavorites(prods) {
    const grid = document.getElementById('favsGrid');
    grid.innerHTML = prods.map(p => {
        const p_id = String(p.id);
        const price = new Intl.NumberFormat('es-CO').format(p.valor || 0);

        let img = p.imagen_principal || '📦';
        if (p.descripcion && p.descripcion.includes('||IMG:')) {
            const m = p.descripcion.match(/\|\|IMG:(.*?)\|\|/);
            if (m) img = m[1];
        }

        return `
        <div class="product-card glass-effect" style="animation: fadeInUp 0.5s ease both;">
            <button onclick="removeFav('${p_id}')" style="position:absolute;top:10px;right:10px;z-index:10;background:rgba(239,68,68,0.1);border:none;color:#ef4444;width:35px;height:35px;border-radius:50%;cursor:pointer;">❤️</button>
            <div class="product-image" onclick='openProductDetail(${JSON.stringify(p).replace(/'/g,"&apos;")})' style="cursor:pointer;">
                <img src="${img}" style="width:100%;height:100%;object-fit:cover;border-radius:15px;">
            </div>
            <h4 style="margin:12px 0 5px;font-weight:700;">${p.nombre}</h4>
            <p style="color:#fbbf24;font-size:0.8rem;margin-bottom:8px;">★★★★★</p>
            <p style="font-weight:800;font-size:1.1rem;margin-bottom:15px;">$${price} COP</p>
            <div style="display:flex;gap:10px;">
                <button onclick="addToCart('${p_id}')" style="flex:1;background:var(--primary);color:white;border:none;padding:10px;border-radius:10px;font-weight:800;cursor:pointer;">🛒 Añadir</button>
                <button onclick='openProductDetail(${JSON.stringify(p).replace(/'/g,"&apos;")})' style="flex:0.3;background:rgba(255,255,255,0.05);border:none;color:white;border-radius:10px;cursor:pointer;">🔎</button>
            </div>
        </div>`;
    }).join('');
}

window.removeFav = (id) => {
    let favs = getFavorites().filter(f => f !== String(id));
    saveFavorites(favs);
    fetchFavorites();
};

window.addToCart = async (id) => {
    const cart = getCartItems();
    cart.push(String(id));
    saveCartItems(cart);
    updateBadge();
    showToast("✅ ¡Añadido al carrito!");

    const tkn = localStorage.getItem("access_token");
    if (tkn) {
        try {
            const resO = await fetch('http://127.0.0.1:8000/api/v1/orders/ordenes/', { headers: { 'Authorization': `Bearer ${tkn}` } });
            const raw = await resO.json();
            const orders = (Array.isArray(raw) ? raw : (raw.results || []));
            let active = orders.find(o => o.estado === 'CARRITO');
            
            if (!active) {
                const resN = await fetch('http://127.0.0.1:8000/api/v1/orders/ordenes/', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tkn}` },
                    body: JSON.stringify({ estado: 'CARRITO' })
                });
                active = await resN.json();
            }

            if (active && active.id) {
                const prodsRes = await fetch('http://127.0.0.1:8000/api/v1/products/productos/' + id + '/');
                const p = await prodsRes.json();
                let p_val = parseFloat(p.valor || p.precio_venta || p.precio_fijo || p.precio || 0);

                await fetch('http://127.0.0.1:8000/api/v1/orders/detalles/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tkn}` },
                    body: JSON.stringify({ orden: active.id, producto: id, cantidad: 1, valor_unitario: p_val })
                });
            }
        } catch(e) { }
    }
};

// ─── MODAL DETALLE (IDENTICO A CATALOGO PARA CONSISTENCIA) ───
let currentGalleryIndex = 0;
window.openProductDetail = (p) => {
    currentGalleryIndex = 0;
    const m = document.getElementById('productDetailModal');
    const c = document.getElementById('modalContent');
    const pText = new Intl.NumberFormat('es-CO').format(p.valor || 0);
    
    let mainImg = p.imagen_principal || '📦';
    if (p.descripcion && p.descripcion.includes('||IMG:')) {
        const mObj = p.descripcion.match(/\|\|IMG:(.*?)\|\|/);
        if (mObj) mainImg = mObj[1];
    }
    
        const gallery = [];
    if (p.imagenes && p.imagenes.length > 0) {
        gallery.push(...p.imagenes.map(i => i.imagen));
    }
    if (gallery.length === 0) gallery.push(mainImg);

    c.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:40px;">
        <div style="position:relative;height:320px;background:#0c0f18;border-radius:20px;overflow:hidden;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.05);">
            <button onclick="moveGallery(-1)" style="position:absolute;left:15px;z-index:20;background:rgba(0,0,0,0.6);border:none;color:white;width:40px;height:40px;border-radius:50%;cursor:pointer;">‹</button>
            <img src="${gallery[currentGalleryIndex]}" style="width:100%;height:100%;object-fit:contain;">
            <button onclick="moveGallery(1)" style="position:absolute;right:15px;z-index:20;background:rgba(0,0,0,0.6);border:none;color:white;width:40px;height:40px;border-radius:50%;cursor:pointer;">›</button>
        </div>
        <div>
            <h2 style="font-size:2rem;color:white;margin-bottom:10px;">${p.nombre}</h2>
            <div style="color:#fbbf24;margin-bottom:15px;">★★★★★ <span style="color:#64748b;font-size:0.85rem;">(Vendedor: Konrad Shop)</span></div>
            <p style="font-size:2rem;font-weight:900;color:white;margin-bottom:20px;">$${pText} COP</p>
            <p style="color:#94a3b8;line-height:1.6;margin-bottom:25px;">${p.descripcion.split('||IMG:')[0] || 'Calidad Konrad Shop premium.'}</p>
            <button class="cta-primary" onclick="addToCart('${p.id}'); document.getElementById('productDetailModal').style.display='none';" style="width:100%;padding:18px;font-size:1.1rem;">🛒 Añadir al Carrito</button>
        </div>
    </div>`;

    window.moveGallery = (delta) => {
        currentGalleryIndex = (currentGalleryIndex + delta + gallery.length) % gallery.length;
        c.querySelector('img').src = gallery[currentGalleryIndex];
    };
    m.style.display = 'flex';
};

function setupDetailModal() {
    const m = document.getElementById('productDetailModal');
    if(m) {
        document.getElementById('closeModal').onclick = () => m.style.display = 'none';
        window.onclick = (e) => { if (e.target == m) m.style.display = 'none'; };
    }
}

function showToast(msg) {
    let t = document.getElementById('toast');
    if (!t) {
        t = document.createElement('div'); t.id = 'toast';
        t.style = "position:fixed;top:100px;right:30px;padding:14px 28px;background:rgba(139,92,246,0.9);border-radius:15px;z-index:9999;color:white;transform:translateX(200%);transition:0.3s;";
        document.body.appendChild(t);
    }
    t.textContent = msg; t.style.transform = "translateX(0)";
    setTimeout(() => t.style.transform = "translateX(200%)", 3000);
}
