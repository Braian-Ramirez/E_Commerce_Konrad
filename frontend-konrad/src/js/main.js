const API_PRODUCTS = 'http://127.0.0.1:8000/api/v1/products/productos/';
const API_ORDERS   = 'http://127.0.0.1:8000/api/v1/orders/ordenes/';
const API_DETALLES = 'http://127.0.0.1:8000/api/v1/orders/detalles/';
const token = localStorage.getItem("access_token");

// ─── UTILIDADES DE SESIÓN ────────────────────────────────────────────────────
function getUserKey() { 
    const u = JSON.parse(localStorage.getItem('user_data') || '{}');
    return u.email || u.username || 'guest';
}

function getCartItems() {
    const key = `cart_${getUserKey()}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
}
function saveCartItems(items) {
    const key = `cart_${getUserKey()}`;
    localStorage.setItem(key, JSON.stringify(items));
    localStorage.removeItem('konrad_cart_v99'); // Clean up old discrepancy
}

function getFavorites() {
    const key = `favs_${getUserKey()}`;
    return JSON.parse(localStorage.getItem(key) || localStorage.getItem('konrad_favs_v99') || '[]');
}
function saveFavorites(items) {
    const key = `favs_${getUserKey()}`;
    localStorage.setItem(key, JSON.stringify(items));
}

function isFav(id) { return getFavorites().includes(String(id)); }

function toggleFav(id) {
    const favs = getFavorites();
    const sid  = String(id);
    const idx  = favs.indexOf(sid);
    if (idx === -1) favs.push(sid);
    else favs.splice(idx, 1);
    saveFavorites(favs);
    return idx === -1; 
}

// ─── INICIALIZACIÓN ──────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
    // REQUISITO: Obligar a loguearse
    if (!token) {
        window.location.href = '/pages/login.html';
        return;
    }

    // 0. Renderizar la interfaz según la sesión (Perfil vs Login)
    renderAuthUI();

    // 1. Antes de renderizar, sincronizamos para que el badge y el estado sea el real de la BD
    await syncCartWithBackend();
    
    fetchRealProducts();
    setupDetailModal();
    updateCartCount();
    setupSearch();
    setupFilters();
    injectFavoritesSection();
});

async function syncCartWithBackend() {
    if (!token) return;
    try {
        const res = await fetch(API_ORDERS, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.status === 401) {
            console.warn("Backend 401 en sincronización, manteniendo local.");
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
            // Si el local está vacío, cargamos lo que diga la base de datos (sesión fresca)
            // Si el local tiene algo, confiamos en el local pero nos aseguramos de no perder nada
            const merged = local.length === 0 ? dbItems : local; 
            
            saveCartItems(merged);
            updateCartCount();
        }
    } catch(e) { console.warn("Sync error", e); }
}

let allProducts = [];

// ─── CARGA DE PRODUCTOS ──────────────────────────────────────────────────────
async function fetchRealProducts() {
    try {
        const res = await fetch(API_PRODUCTS, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        const raw = Array.isArray(data) ? data : (data.results || []);
        allProducts = raw.map(p => {
            let precio = parseFloat(p.valor || p.precio_venta || p.precio_fijo || p.precio || 0);
            if (precio <= 0) precio = 2500000;
            return { ...p, id: String(p.id), precio_fijo: precio };
        });
    } catch(e) {
        console.error("Error al cargar productos reales:", e);
        allProducts = [];
    }

    const topSales = [...allProducts].sort((a, b) => (b.ventas_totales || 0) - (a.ventas_totales || 0));
    const count = 10; 

    if (allProducts.length === 0) {
        const msg = `<p style="grid-column: 1/-1; text-align:center; color:#94a3b8; padding:50px;">Sincronizando con base de datos...</p>`;
        if (document.getElementById('productHighlights')) document.getElementById('productHighlights').innerHTML = msg;
        if (document.getElementById('productGrid')) document.getElementById('productGrid').innerHTML = msg;
    } else {
        if (document.getElementById('productHighlights')) renderGrid('productHighlights', topSales.slice(0, count), true);
        if (document.getElementById('productGrid')) renderGrid('productGrid', allProducts, false);
    }
    updateFavoritesPanel();

    // AUTO-OPEN Product if URL has ?viewProduct=ID
    const urlParams = new URLSearchParams(window.location.search);
    const viewId = urlParams.get('viewProduct');
    if (viewId) {
        const prod = allProducts.find(p => String(p.id) === String(viewId));
        if (prod) {
            setTimeout(() => {
                openProductDetail(prod);
                const card = document.getElementById(`card-${viewId}`);
                if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
        }
    }
}

// ─── RENDERIZADO DE GRID ──────────────────────────────────────────────────────
window.cardGalleries = {};
window.flipCardImg = (id, delta) => {
    const cg = window.cardGalleries[id];
    if (!cg) return;
    cg.index = (cg.index + delta + cg.images.length) % cg.images.length;
    const c = document.getElementById(`card-img-container-${id}`);
    if (c) {
        const src = cg.images[cg.index];
        c.innerHTML = (src.startsWith('http') || src.startsWith('/'))
            ? `<img src="${src}" onerror="this.src='https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800&auto=format&fit=crop'" style="width:100%; height:100%; object-fit:cover;">`
            : `<span style="font-size:3rem;">${src}</span>`;
    }
};

function getMockGallery(img, catData) {
    const gal = [img];
    if (img && (img.startsWith('http') || img.startsWith('/'))) {
        const cLow = (catData || '').toLowerCase();
        
        // Granular matchers for specific products
        if (cLow.includes('nintendo') || cLow.includes('switch')) {
            gal.push('https://images.unsplash.com/photo-1612036782180-6f0b6ce846ce?q=80&w=800&auto=format&fit=crop'); // Switch joycons
            gal.push('https://images.unsplash.com/photo-1605901309584-818e25960b8f?q=80&w=800&auto=format&fit=crop'); // Switch console
        } else if (cLow.includes('ps5') || cLow.includes('playstation') || cLow.includes('consola')) {
            gal.push('https://images.unsplash.com/photo-1606813907291-d86efa9b94db?q=80&w=800&auto=format&fit=crop'); // PS5 controller
            gal.push('https://images.unsplash.com/photo-1607450175711-bba24fea0e32?q=80&w=800&auto=format&fit=crop'); // PS5 close
        } else if (cLow.includes('cancelling') || cLow.includes('audífono') || cLow.includes('sony xm')) {
            gal.push('https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?q=80&w=800&auto=format&fit=crop'); // Headphones
            gal.push('https://images.unsplash.com/photo-1546435770-a3e426bf472b?q=80&w=800&auto=format&fit=crop'); // Headphones 2
        } else if (cLow.includes('mac') || cLow.includes('macbook')) {
            gal.push('https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=800&auto=format&fit=crop'); // Mac
            gal.push('https://images.unsplash.com/photo-1496181133206-80ce9b88a853?q=80&w=800&auto=format&fit=crop'); // Mac 2
        } else if (cLow.includes('iphone') || cLow.includes('celular')) {
            gal.push('https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?q=80&w=800&auto=format&fit=crop'); // iPhone
            gal.push('https://images.unsplash.com/photo-1556656793-08538906a9f8?q=80&w=800&auto=format&fit=crop'); // iPhone 2
        } else if (cLow.includes('gamer') || cLow.includes('pc')) {
            gal.push('https://images.unsplash.com/photo-1587202372634-32705e3bf49c?q=80&w=800&auto=format&fit=crop'); // PC Setup
            gal.push('https://images.unsplash.com/photo-1610926950552-c6714da40391?q=80&w=800&auto=format&fit=crop'); // PC internal
        } else if (cLow.includes('monitor')) {
            gal.push('https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=800&auto=format&fit=crop'); // Monitor
            gal.push('https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop'); // Monitor 2
        } else if (cLow.includes('reloj') || cLow.includes('watch')) {
            gal.push('https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800&auto=format&fit=crop'); // Watch
            gal.push('https://images.unsplash.com/photo-1508656961884-25cb92d2454b?q=80&w=800&auto=format&fit=crop'); // Watch 2
        } else if (cLow.includes('mouse') || cLow.includes('teclado')) {
            gal.push('https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=800&auto=format&fit=crop'); // Mouse
            gal.push('https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=800&auto=format&fit=crop'); // Keyboard
        } else if (cLow.includes('tecnología') || cLow.includes('computador')) {
            gal.push('https://images.unsplash.com/photo-1541807084-5c52b6b3adef?q=80&w=800&auto=format&fit=crop'); // Laptop workspace
            gal.push('https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop'); // Chip
        } else if (cLow.includes('moda') || cLow.includes('ropa') || cLow.includes('chaqueta') || cLow.includes('zara')) {
            gal.push('https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?q=80&w=800&auto=format&fit=crop'); // Leather jacket
            gal.push('https://images.unsplash.com/photo-1434389678332-12aa7e2b6e12?q=80&w=800&auto=format&fit=crop'); // Fashion clothing rack
        } else if (cLow.includes('tenis') || cLow.includes('nike') || cLow.includes('zapatos')) {
            gal.push('https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop'); // Red sneakers
            gal.push('https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=800&auto=format&fit=crop'); // White sneakers
        } else if (cLow.includes('hogar') || cLow.includes('decoración') || cLow.includes('ikea')) {
            gal.push('https://images.unsplash.com/photo-1586023492125-27b2c045efd7?q=80&w=800&auto=format&fit=crop'); // Room interior
            gal.push('https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=800&auto=format&fit=crop'); // Sofa
        } else {
            gal.push('https://images.unsplash.com/photo-1472851294608-062f824d29cc?q=80&w=800&auto=format&fit=crop'); // Generic store building
            gal.push('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800&auto=format&fit=crop'); // Generic box / product
        }
    } else {
        gal.push('✨ ' + img);
        gal.push('🏷️ Etiqueta');
    }
    return gal;
}

function renderGrid(containerId, products, showFav = false) {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    grid.innerHTML = products.map(p => {
        const precio = new Intl.NumberFormat('es-CO').format(p.precio_fijo);
        const favOn  = isFav(p.id);
        
        let img = p.imagen_principal || '📦';
        if (p.imagenes && p.imagenes.length > 0 && p.imagenes[0].imagen) {
            img = p.imagenes[0].imagen;
        } else if (p.descripcion && p.descripcion.includes('||IMG:')) {
            const m = p.descripcion.match(/\|\|IMG:(.*?)\|\|/);
            if (m) img = m[1];
        }

        const cleanDesc = (p.descripcion || '').split('||IMG:')[0];
        const p_id = String(p.id);
        
        // Quitado "Imagen en Proceso" para usar una FOTO REAL de una caja elegante de pedido si hay un error
        const fallback = "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800&auto=format&fit=crop";
        
        let gal = [];
        if (p.imagenes && p.imagenes.length > 0) gal = p.imagenes.map(i => i.imagen);
        
        const catData = (p.categoria_nombre || '') + ' ' + (p.descripcion || '') + ' ' + (p.nombre || '') + ' ' + (p.marca || '');
        if (gal.length === 0) gal = getMockGallery(img, catData);
        window.cardGalleries[p_id] = { images: gal, index: 0 };

        return `
        <div class="product-card glass-effect" id="card-${p_id}" style="position:relative;animation: fadeIn 0.4s ease-out;">
        ${token ? `
            <button id="fav-${p_id}" onclick="handleFav('${p_id}')"
                style="position:absolute;top:12px;right:12px;z-index:10;background:${favOn ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)'};border:1px solid ${favOn ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'};width:36px;height:36px;border-radius:50%;cursor:pointer;font-size:1.1rem;display:flex;align-items:center;justify-content:center;">
                ${favOn ? '❤️' : '🤍'}
            </button>
        ` : ''}

            <div class="product-image" style="position:relative; cursor:pointer; background: #0c0f18; display:flex; align-items:center; justify-content:center; border-radius:15px; overflow:hidden; border:1px solid rgba(255,255,255,0.03);">
                <button onclick="event.stopPropagation(); flipCardImg('${p_id}', -1)" style="position:absolute;left:5px;z-index:20;background:rgba(0,0,0,0.5);border:none;color:white;width:30px;height:30px;border-radius:50%;cursor:pointer;">‹</button>
                <div id="card-img-container-${p_id}" onclick='openProductDetail(${JSON.stringify({...p, descripcion: cleanDesc, imagen_principal: img}).replace(/'/g,"&apos;")})' style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">
                    ${img.startsWith('http') ? `<img src="${img}" onerror="this.src='${fallback}'" style="width:100%; height:100%; object-fit:cover;">` : `<span style="font-size:3rem;">${img}</span>`}
                </div>
                <button onclick="event.stopPropagation(); flipCardImg('${p_id}', 1)" style="position:absolute;right:5px;z-index:20;background:rgba(0,0,0,0.5);border:none;color:white;width:30px;height:30px;border-radius:50%;cursor:pointer;">›</button>
            </div>

            <div style="padding:5px 0;">
                <h4 class="product-title" style="margin-top:8px;font-weight:700;color:white;font-size:1rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.nombre}</h4>
                <div style="color:#fbbf24;font-size:0.85rem;margin:3px 0;">★★★★★ <span style="color:#64748b;font-size:0.75rem;">(12)</span></div>
                <div class="product-price" style="margin-bottom:12px;color:white;font-weight:800;font-size:1.1rem;">$${precio} <span style="font-size:0.7rem;color:#64748b;">COP</span></div>
            </div>

            <div class="qty-selector" style="display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:12px;background:rgba(255,255,255,0.05);padding:6px;border-radius:12px;">
                <button onclick="changeQty('${p_id}',-1)" style="background:transparent;border:none;color:white;font-size:1.2rem;cursor:pointer;">−</button>
                <span id="qty-${p_id}" style="font-weight:800;color:white;">1</span>
                <button onclick="changeQty('${p_id}',1)" style="background:transparent;border:none;color:white;font-size:1.2rem;cursor:pointer;">+</button>
            </div>

            <div style="display:flex;gap:8px;">
                <button class="add-cart-btn" id="addBtn-${p_id}" onclick="addToCart('${p_id}')" style="flex:3;font-weight:800;cursor:pointer;">🛒 Añadir</button>
                <button onclick='openProductDetail(${JSON.stringify({...p, descripcion: cleanDesc, imagen_principal: img}).replace(/'/g,"&apos;")})' style="flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:white;border-radius:10px;cursor:pointer;">🔎</button>
            </div>
        </div>`;
    }).join('');
}

// ─── CARRITO ─────────────────────────────────────────────────────────────────
async function addToCart(id) {
    const q    = parseInt(document.getElementById(`qty-${id}`)?.textContent || 1);
    const cart = getCartItems();
    for (let i = 0; i < q; i++) cart.push(String(id));
    saveCartItems(cart);
    updateCartCount();
    showToast(`✅ ¡${q > 1 ? q + ' unidades añadidas' : 'Añadido al carrito'}!`);

    // Sincronización inmediata con el Backend
    if (token) {
        try {
            const resO = await fetch(API_ORDERS, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!resO.ok) throw new Error("API Orders Error");
            
            const raw = await resO.json();
            const orders = (Array.isArray(raw) ? raw : (raw.results || []));
            let active = orders.find(o => o.estado === 'CARRITO');
            
            if (!active) {
                const resN = await fetch(API_ORDERS, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ estado: 'CARRITO' })
                });
                if (!resN.ok) throw new Error("Order Create Error");
                active = await resN.json();
            }

            if (active && active.id) {
                await fetch(API_DETALLES, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ orden: active.id, producto: id, cantidad: q, valor_unitario: findProductPrice(id) })
                });
            }
        } catch(e) { 
            console.warn("Persistencia solo local (posible falta de perfil de Persona):", e.message); 
        }
    }
}

function findProductPrice(id) {
    const p = allProducts.find(x => String(x.id) === String(id));
    return p ? p.precio_fijo : 0;
}
window.addToCart = addToCart;

function updateCartCount() {
    const b = document.getElementById('cartCount');
    if (b) b.textContent = getCartItems().length;
}

function changeQty(id, delta) {
    const el = document.getElementById(`qty-${id}`);
    if (!el) return;
    const v = Math.max(1, Math.min(10, parseInt(el.textContent) + delta));
    el.textContent = v;
}
window.changeQty = changeQty;

// ─── FAVORITOS ───────────────────────────────────────────────────────────────
window.handleFav = (id) => {
    const added = toggleFav(id);
    updateFavoritesPanel();
    showToast(added ? '❤️ Añadido a favoritos' : '💔 Quitado de favoritos');
    
    // Actualizar botón en el GRID
    const btnGrid = document.getElementById(`fav-${id}`);
    if (btnGrid) {
        btnGrid.innerHTML = added ? '❤️' : '🤍';
        btnGrid.style.background = added ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)';
    }

    // Actualizar botón en el MODAL DETALLE
    const btnModal = document.getElementById(`modal-fav-${id}`);
    if (btnModal) {
        btnModal.innerHTML = added ? '❤️' : '🤍';
        btnModal.style.background = added ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)';
    }
};

function injectFavoritesSection() {
    const sidebar = document.querySelector('.sidebar-nav');
    if (!sidebar || document.getElementById('favsSection')) return;
    const sec = document.createElement('div');
    sec.id = 'favsSection';
    sec.className = 'sidebar-section';
    sec.style = 'margin-top:25px;border-top:1px solid rgba(255,255,255,0.05);padding-top:20px;';
    sec.innerHTML = `<p class="section-title">Mis Favoritos</p><div id="favsList"></div>`;
    sidebar.insertBefore(sec, sidebar.querySelector('.logout-btn') || sidebar.lastChild);
}

function updateFavoritesPanel() {
    const list = document.getElementById('favsList');
    if (!list) return;
    const favIds = getFavorites();
    const favProds = allProducts.filter(p => favIds.includes(String(p.id)));
    list.innerHTML = favProds.slice(0, 5).map(p => `<div style="color:white;font-size:0.8rem;margin:5px 0;">♥ ${p.nombre}</div>`).join('') || '<p style="color:#64748b;font-size:0.7rem;">Vacío</p>';
}

// ─── FILTROS & DETALLES (BÁSICO) ─────────────────────────────────────────────
function setupFilters() {
    const range = document.getElementById('priceRange');
    const label = document.getElementById('priceValue');
    const boxes = document.querySelectorAll('.cat-filter');
    const allC  = document.getElementById('cat-all');

    const apply = () => {
        const max = range ? parseFloat(range.value) : 20000000;
        if (label) label.textContent = '$' + new Intl.NumberFormat('es-CO').format(max) + (max >= 20000000 ? '+' : '');

        const normalize = (str) => (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const selected = Array.from(boxes).filter(c => c.checked).map(c => normalize(c.value));
        
        // DETERMINAR ORIGEN DE DATOS CORRECTO
        const isHomePage = !!document.getElementById('productHighlights');
        const sourceProducts = isHomePage ? [...allProducts].sort((a, b) => (b.ventas_totales || 0) - (a.ventas_totales || 0)).slice(0, 10) : allProducts;

        const filtered = sourceProducts.filter(p => {
            const matchesPrice = p.precio_fijo <= max;
            const pCat = normalize(p.categoria_nombre);
            const matchesCat   = (allC && allC.checked) || selected.length === 0 || selected.includes(pCat);
            return matchesPrice && matchesCat;
        });

        const target = isHomePage ? 'productHighlights' : 'productGrid';
        renderGrid(target, filtered, false);

        const title = document.querySelector('.section-header h3');
        if (title && isHomePage) {
            title.textContent = (allC && allC.checked && max >= 20000000) ? "⚡ Destacados del Momento" : "🔍 Resultados del Filtro";
        }
    };

    range?.addEventListener('input', apply);
    boxes.forEach(c => c.addEventListener('change', () => { if (allC) allC.checked = false; apply(); }));
    if (allC) {
        allC.addEventListener('change', () => { if (allC.checked) { boxes.forEach(b => b.checked = false); apply(); } });
    }

    // SOPORTE PARA BOTONES NUEVOS (PÁGINA PÚBLICA)
    const btnAll  = document.getElementById('cat-all-btn');
    const catBtns = document.querySelectorAll('.cat-filter-btn');

    const updateBtns = (activeBtn) => {
        [btnAll, ...catBtns].forEach(b => {
             if (b) {
                b.classList.remove('active');
                b.style.background = 'transparent';
                b.style.color = '#94a3b8';
             }
        });
        if (activeBtn) {
            activeBtn.classList.add('active');
            activeBtn.style.background = 'var(--primary)';
            activeBtn.style.color = 'white';
        }
    };

    btnAll?.addEventListener('click', () => {
        updateBtns(btnAll);
        if (allC) allC.checked = true;
        boxes.forEach(b => b.checked = false);
        apply();
    });

    catBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const cat = btn.getAttribute('data-cat');
            updateBtns(btn);
            if (allC) allC.checked = false;
            boxes.forEach(b => {
                b.checked = (b.value === cat);
            });
            apply();
        });
    });
}

function setupSearch() {
    const btn = document.getElementById("searchBtn");
    const inp = document.getElementById("searchInput");
    const run = () => {
        const q = inp?.value.toLowerCase() || '';
        const target = document.getElementById('productGrid') ? 'productGrid' : 'productHighlights';
        renderGrid(target, allProducts.filter(p =>
            p.nombre.toLowerCase().includes(q) ||
            (p.descripcion || '').toLowerCase().includes(q) ||
            (p.categoria_nombre || '').toLowerCase().includes(q)
        ), false);
    };
    btn?.addEventListener('click', run);
    inp?.addEventListener('keydown', e => { if (e.key === 'Enter') run(); });
    inp?.addEventListener('input', run); // Reactivo
}

window.changeHighlightsTime = (period) => {
    const tabW = document.getElementById('tab-weekly');
    const tabM = document.getElementById('tab-monthly');
    
    if (!tabW || !tabM) return;

    // Reset visual
    [tabW, tabM].forEach(t => {
        t.style.background = 'transparent';
        t.style.color = '#94a3b8';
        t.style.boxShadow = 'none';
    });

    let sorted;
    if (period === 'mensual') {
        tabM.style.background = 'var(--primary)';
        tabM.style.color = 'white';
        tabM.style.boxShadow = '0 4px 15px rgba(139,92,246,0.3)';
        sorted = [...allProducts].sort((a, b) => (b.ventas_totales || 0) - (a.ventas_totales || 0));
    } else {
        tabW.style.background = 'var(--primary)';
        tabW.style.color = 'white';
        tabW.style.boxShadow = '0 4px 15px rgba(139,92,246,0.3)';
        sorted = [...allProducts].sort(() => Math.random() - 0.5);
    }
    renderGrid('productHighlights', sorted.slice(0, 10), true);
};

function setupDetailModal() {
    const m = document.getElementById('productDetailModal');
    if (m) {
        document.getElementById('closeModal').onclick = () => m.style.display = 'none';
        window.onclick = (e) => { if (e.target == m) m.style.display = 'none'; };
    }
}

let currentGalleryIndex = 0;
window.openProductDetail = (p) => {
    currentGalleryIndex = 0;
    const m = document.getElementById('productDetailModal');
    const c = document.getElementById('modalContent');
    const pText = new Intl.NumberFormat('es-CO').format(p.precio_fijo);
    
    // Extracción de imagen con alta prioridad
    let mainImg = p.imagen_principal;
    if (p.imagenes && p.imagenes.length > 0) {
        mainImg = p.imagenes[0].imagen;
    } else if (p.descripcion && p.descripcion.includes('||IMG:')) {
        const match = p.descripcion.match(/\|\|IMG:(.*?)\|\|/);
        if (match) mainImg = match[1];
    }
    
    if (!mainImg) {
        mainImg = '📦';
    }
    
    let gallery = [];
    if (p.imagenes && p.imagenes.length > 0) {
        gallery.push(...p.imagenes.map(i => i.imagen));
    }
    if (gallery.length === 0) {
        const catData = (p.categoria_nombre || '') + ' ' + (p.descripcion || '') + ' ' + (p.nombre || '') + ' ' + (p.marca || '');
        gallery = getMockGallery(mainImg, catData);
    }
    const isUrl = mainImg.startsWith('http') || mainImg.startsWith('/');
    const vNombre = p.vendedor_nombre || 'Konrad Shop Oficial';

    const sellerId = p.vendedor || 1;
    const sellerName = p.vendedor_nombre || 'Konrad Shop Oficial';

    // Generar HTML de RESEÑAS (Historial de comentarios con estrellas)
    const reviewsHtml = (p.comentarios && p.comentarios.length > 0)
        ? p.comentarios.map(r => `
            <div style="margin-bottom:12px; padding:10px; background:rgba(255,191,36,0.03); border-radius:10px; border:1px solid rgba(255,191,36,0.05);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <span style="color:white; font-weight:800; font-size:0.8rem;">${r.comprador_nombre}</span>
                    <span style="color:#64748b; font-size:0.6rem;">${new Date(r.fecha).toLocaleDateString()}</span>
                </div>
                <div style="margin-bottom:5px;">
                    <span style="color:#fbbf24; font-size:0.7rem;">${'★'.repeat(Math.min(10, r.calificacion || 10))}${'☆'.repeat(Math.max(0, 10 - (r.calificacion || 10)))}</span>
                </div>
                <p style="color:#e2e8f0; font-size:0.75rem; margin:0; line-height:1.4;">${r.comentario}</p>
            </div>`).join('')
        : '<p style="color:#64748b; font-size:0.75rem;">Aún no hay reseñas de compradores.</p>';

    // Generar HTML de PREGUNTAS reales de la BD
    const qsHtml = (p.preguntas && p.preguntas.length > 0) 
        ? p.preguntas.map(q => `
            <div style="margin-bottom:15px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.03);">
                <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span style="color:white;font-weight:700;font-size:0.85rem;">👤 ${q.comprador_nombre}</span>
                    <span style="color:#64748b;font-size:0.65rem;">${new Date(q.fecha_pregunta).toLocaleDateString()}</span>
                </div>
                <p style="color:#cbd5e1;font-size:0.8rem;line-height:1.4;margin:0;">Q: ${q.pregunta}</p>
                ${q.respuesta ? `
                <div style="margin-top:8px;padding-left:15px;border-left:2px solid #3b82f6;animation:slideIn 0.3s ease;">
                    <p style="color:#3b82f6;font-size:0.75rem;font-weight:800;margin:0;">Vendedor responde:</p>
                    <p style="color:#94a3b8;font-size:0.75rem;margin:0;">${q.respuesta}</p>
                </div>` : ''}
            </div>`).join('')
        : '<p style="color:#64748b; font-size:0.8rem;">Aún no hay preguntas. ¡Sé el primero!</p>';

    c.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:40px;padding:5px;">
        <div>
            <div style="position:relative;width:100%;height:350px;background:#0c0f18;border-radius:25px;overflow:hidden;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.05);">
                <button onclick="moveGallery(-1)" style="position:absolute;left:15px;z-index:20;background:rgba(0,0,0,0.6);border:none;color:white;width:40px;height:40px;border-radius:50%;cursor:pointer;">‹</button>
                <div id="detailMainImageContainer" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:8rem;">
                    ${(mainImg.startsWith('http') || mainImg.startsWith('/')) ? `<img src="${mainImg}" onerror="this.src='https://placehold.co/400x400/0c0f18/white?text=Imagen'" style="width:100%;height:100%;object-fit:contain;">` : mainImg}
                </div>
                <button onclick="moveGallery(1)" style="position:absolute;right:15px;z-index:20;background:rgba(0,0,0,0.6);border:none;color:white;width:40px;height:40px;border-radius:50%;cursor:pointer;">›</button>
            </div>
            
            <div style="margin-top:25px; display:grid; grid-template-columns:1fr 1fr; gap:20px;">
                <!-- SECCIÓN IZQ: PREGUNTAS -->
                <div style="padding:15px; background:rgba(255,255,255,0.01); border-radius:20px; border:1px solid rgba(255,255,255,0.03);">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                        <div style="width:8px;height:8px;border-radius:50%;background:#3b82f6;box-shadow:0 0 8px #3b82f6;"></div>
                        <p style="color:white;font-size:0.8rem;font-weight:800;text-transform:uppercase;">Preguntas</p>
                    </div>
                    <div id="questionsContainer" style="max-height:180px;overflow-y:auto;padding-right:5px;margin-bottom:12px;">
                        ${qsHtml}
                    </div>
                    <div style="background:rgba(255,255,255,0.02);padding:10px;border-radius:12px;border:1px solid rgba(255,255,255,0.05);">
                        <textarea id="newQuestionTxt" placeholder="Pregunta algo..." 
                            style="width:100%;height:45px;background:transparent;border:none;color:white;outline:none;resize:none;font-size:0.8rem;"></textarea>
                        <button onclick="submitUserQuestion('${p.id}')" class="cta-primary" style="width:100%; padding:6px; font-size:0.7rem; background:#3b82f6; border-radius:8px;">Enviar Pregunta</button>
                    </div>
                </div>

                <!-- SECCIÓN DER: RESEÑAS -->
                <div style="padding:15px; background:rgba(255,255,255,0.01); border-radius:20px; border:1px solid rgba(255,255,255,0.03);">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                        <div style="width:8px;height:8px;border-radius:50%;background:#fbbf24;box-shadow:0 0 8px #fbbf24;"></div>
                        <p style="color:white;font-size:0.8rem;font-weight:800;text-transform:uppercase;">Reseñas</p>
                    </div>
                    <div id="reviewsContainer" style="max-height:300px;overflow-y:auto;padding-right:5px;">
                        ${reviewsHtml}
                    </div>
                </div>
            </div>
        </div>

        <div style="display:flex;flex-direction:column;justify-content:flex-start;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;background:rgba(139,92,246,0.05);padding:10px 15px;border-radius:15px;border:1px solid rgba(139,92,246,0.1);width:fit-content;">
                <div style="width:35px;height:35px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.1rem;">👤</div>
                <div>
                    <p style="color:#94a3b8;font-size:0.65rem;margin:0;font-weight:800;letter-spacing:1px;text-transform:uppercase;">Vendedor Oficial</p>
                    <p style="color:white;font-size:0.95rem;font-weight:700;margin:0;"><a href="/pages/seller-profile.html?vendor_id=${sellerId}" style="color:white;text-decoration:none;border-bottom:1px dashed rgba(255,255,255,0.4);padding-bottom:2px;">${sellerName} &rarr;</a></p>
                </div>
            </div>

            <h2 style="font-size:2.5rem;font-weight:900;color:white;margin-bottom:10px;letter-spacing:-1px;">${p.nombre}</h2>
            <div style="display:flex;align-items:center;gap:15px;margin-bottom:25px;">
                <span style="color:#fbbf24;font-size:1.1rem;">★★★★★</span>
                <span style="color:#64748b;font-size:0.85rem;">(Vendedor verificado por Comercial Konrad)</span>
            </div>

            <p style="font-size:2.8rem;font-weight:900;color:white;margin-bottom:25px;text-shadow:0 0 20px rgba(99,102,241,0.3);">$${pText} <span style="font-size:1rem;color:#64748b;font-weight:400;">COP</span></p>
            
            <div style="padding:22px;background:rgba(255,255,255,0.02);border-radius:15px;margin-bottom:30px;border:1px solid rgba(255,255,255,0.05);line-height:1.7;">
                <p style="color:#cbd5e1;font-size:1rem;margin:0;">${p.descripcion.split('||IMG:')[0] || 'Calidad Konrad premium seleccionada.'}</p>
            </div>

            <div style="display:flex;gap:15px;margin-bottom:20px;">
                <button class="cta-primary" onclick="addToCart('${p.id}'); document.getElementById('productDetailModal').style.display='none';" style="flex:2;padding:20px;font-size:1.2rem;font-weight:800;">🛒 Añadir al Carrito</button>
                <button id="modal-fav-${p.id}" onclick="handleFav('${p.id}')" style="flex:0.5;background:${isFav(p.id) ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)'};border:1px solid ${isFav(p.id) ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.1)'};border-radius:18px;cursor:pointer;font-size:1.8rem;display:flex;align-items:center;justify-content:center;transition:0.3s;">
                    ${isFav(p.id) ? '❤️' : '🤍'}
                </button>
            </div>
            
            <p style="font-size:0.8rem;color:#64748b;display:flex;align-items:center;gap:8px;">📦 Envío prioritario Konrad • 🛡️ Garantía Premium • 💳 SSL</p>
        </div>
    </div>`;

    window.currentGalleryPaths = gallery;
    window.moveGallery = (delta) => { 
        currentGalleryIndex = (currentGalleryIndex + delta + window.currentGalleryPaths.length) % window.currentGalleryPaths.length;
        const container = document.getElementById('detailMainImageContainer');
        if (container) {
            const src = window.currentGalleryPaths[currentGalleryIndex];
            container.innerHTML = (src.startsWith('http') || src.startsWith('/')) 
                ? `<img src="${src}" onerror="this.src='https://placehold.co/400x400/0c0f18/white?text=Imagen'" style="width:100%;height:100%;object-fit:contain;">`
                : src;
        }
    };
    m.style.display = 'flex';
};

window.submitUserQuestion = async (productId) => {
    const txt = document.getElementById('newQuestionTxt').value;
    if(!txt.trim()) return;
    const tkn = localStorage.getItem("access_token");
    if(!tkn) { 
        showToast("🔐 Inicia sesión para preguntar.", false);
        return; 
    }
    try {
        const res = await fetch(`http://127.0.0.1:8000/api/v1/products/preguntas/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tkn}` },
            body: JSON.stringify({ producto: productId, pregunta: txt })
        });
        if(res.ok) {
            const container = document.getElementById('questionsContainer');
            if(container) {
                if(container.textContent.includes('Aún no hay preguntas')) container.innerHTML = '';
                const newQ = document.createElement('div');
                newQ.style = "margin-bottom:15px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.03); animation: fadeIn 0.5s ease;";
                newQ.innerHTML = `
                    <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                        <span style="color:white;font-weight:700;font-size:0.85rem;">👤 Tú</span>
                        <span style="color:#64748b;font-size:0.65rem;">Recién ahora</span>
                    </div>
                    <p style="color:#cbd5e1;font-size:0.8rem;line-height:1.4;margin:0;">Q: ${txt}</p>
                    <p style="color:#64748b;font-size:0.7rem;margin-top:5px;font-style:italic;">Esperando respuesta...</p>
                `;
                container.prepend(newQ);
            }
            document.getElementById('newQuestionTxt').value = "";
            showToast("✅ Pregunta enviada al vendedor");
        }
    } catch(e) { }
};

// ─── SESIÓN & LOGOUT ──────────────────────────────────────────────────────────
window.handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_data");
    window.location.href = '/pages/login.html';
};

function renderAuthUI() {
    const authLinks  = document.getElementById('authLinks');
    const token      = localStorage.getItem('access_token');
    const rol        = (localStorage.getItem('rol') || '').toUpperCase();

    if (!authLinks) return;

    if (token) {
        if (rol === 'DIRECTOR_COMERCIAL' || rol === 'ADMIN') {
            authLinks.innerHTML = `
                <a href="/pages/director-dashboard.html" class="nav-item">📊 <span>Director</span></a>
                <button onclick="handleLogout()" class="nav-item" style="background:none;border:none;cursor:pointer;color:#ef4444;font-weight:700;">
                    🚪 <span>Salir</span>
                </button>
            `;
        } else if (rol === 'VENDEDOR') {
            authLinks.innerHTML = `
                <a href="/pages/vendor-dashboard.html" class="nav-item">🏬 <span>Vendedor</span></a>
                <button onclick="handleLogout()" class="nav-item" style="background:none;border:none;cursor:pointer;color:#ef4444;font-weight:700;">
                    🚪 <span>Salir</span>
                </button>
            `;
        } else {
            authLinks.innerHTML = `
                <a href="/pages/profile.html" class="nav-item">👤 <span>Mi Perfil</span></a>
                <button onclick="handleLogout()" class="nav-item" style="background:none;border:none;cursor:pointer;color:#ef4444;font-weight:700;">
                    🚪 <span>Salir</span>
                </button>
            `;
        }
    } else {
        authLinks.innerHTML = `
            <a href="/pages/login.html" class="nav-item" style="color:var(--primary);">
                🔐 <span>Ingresar</span>
            </a>
            <a href="/pages/register.html" class="nav-item">
                ✨ <span>Registrarse</span>
            </a>
        `;
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
