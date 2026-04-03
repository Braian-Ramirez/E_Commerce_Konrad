const API_PRODUCTS = 'http://127.0.0.1:8000/api/v1/products/productos/';

document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const vendorId = params.get('vendor_id') || '1';
    
    updateBadge();
    await fetchVendorProducts(vendorId);
    setupDetailModal();
});

function getUserKey() { return 'konrad_user_session'; }

function updateBadge() {
    const c = JSON.parse(localStorage.getItem('konrad_cart_v99') || '[]');
    const b = document.getElementById('cartCount');
    if (b) b.textContent = c.length;
}

async function fetchVendorProducts(vId) {
    const grid = document.getElementById('vendorProducts');
    try {
        const res = await fetch(API_PRODUCTS);
        const data = await res.json();
        const all = Array.isArray(data) ? data : (data.results || []);
        
        // Filtrar productos por este vendedor
        const filtered = all.filter(p => String(p.vendedor) === String(vId));
        
        if (filtered.length > 0) {
            document.getElementById('vendorName').textContent = filtered[0].vendedor_nombre || 'Konrad Shop';
            grid.innerHTML = filtered.map(p => renderCard(p)).join('');
        } else {
            grid.innerHTML = '<p style="color:#94a3b8; text-align:center; grid-column:1/-1;">Este vendedor aún no tiene productos públicos.</p>';
        }
    } catch (e) {
        grid.innerHTML = '<p style="color:#ef4444; text-align:center;">Error conectando con la base de datos.</p>';
    }
}

function renderCard(p) {
    const price = new Intl.NumberFormat('es-CO').format(p.valor || 0);
    let img = p.imagen_principal || '📦';
    if (p.descripcion && p.descripcion.includes('||IMG:')) {
        const m = p.descripcion.match(/\|\|IMG:(.*?)\|\|/);
        if (m) img = m[1];
    }
    return `
    <div class="product-card glass-effect" style="animation: fadeInUp 0.5s ease both;">
        <div class="product-image" onclick='openProductDetail(${JSON.stringify(p).replace(/'/g,"&apos;")})' style="cursor:pointer;">
            <img src="${img}" style="width:100%;height:100%;object-fit:cover;border-radius:15px;">
        </div>
        <h4 style="margin:12px 0 5px;font-weight:700;">${p.nombre}</h4>
        <p style="font-weight:800;font-size:1.1rem;margin-bottom:15px;">$${price} COP</p>
        <button onclick="addToCart('${p.id}')" style="width:100%;background:var(--primary);color:white;border:none;padding:10px;border-radius:10px;font-weight:800;cursor:pointer;">🛒 Añadir</button>
    </div>`;
}

window.addToCart = (id) => {
    const c = JSON.parse(localStorage.getItem('konrad_cart_v99') || '[]');
    c.push(String(id));
    localStorage.setItem('konrad_cart_v99', JSON.stringify(c));
    updateBadge();
    showToast("✅ ¡Añadido al carrito!");
};

// ─── MODAL DETALLE (Sincronizado) ───
window.openProductDetail = (p) => {
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
    
    window.currentGalleryPathsSp = gallery;
    window.curImgSp = 0;

    c.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:40px;">
        <div style="position:relative;height:320px;background:#0c0f18;border-radius:20px;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.05);">
            <button onclick="moveGallerySp(-1)" style="position:absolute;left:10px;z-index:10;background:rgba(0,0,0,0.5);border:none;color:white;width:40px;height:40px;border-radius:50%;cursor:pointer;font-size:1.2rem;">‹</button>
            <img id="detailMainImageSp" src="${gallery[0]}" style="width:100%;height:100%;object-fit:contain;">
            <button onclick="moveGallerySp(1)" style="position:absolute;right:10px;z-index:10;background:rgba(0,0,0,0.5);border:none;color:white;width:40px;height:40px;border-radius:50%;cursor:pointer;font-size:1.2rem;">›</button>
        </div>
        <div>
            <h2 style="font-size:2rem;color:white;margin-bottom:10px;">${p.nombre}</h2>
            <div style="color:#fbbf24;margin-bottom:15px;">★★★★★ <span style="color:#64748b;font-size:0.85rem;">(Reputación del Vendedor: 4.9)</span></div>
            <p style="font-size:2rem;font-weight:900;color:white;margin-bottom:20px;">$${pText} COP</p>
            <p style="color:#94a3b8;line-height:1.6;margin-bottom:25px;">${p.descripcion.split('||IMG:')[0] || 'Calidad Konrad Shop premium.'}</p>
            <button class="cta-primary" onclick="addToCart('${p.id}'); document.getElementById('productDetailModal').style.display='none';" style="width:100%;padding:18px;font-size:1.1rem;">🛒 Añadir al Carrito</button>
        </div>
    </div>`;
    
    window.moveGallerySp = (delta) => { 
        window.curImgSp = (window.curImgSp + delta + window.currentGalleryPathsSp.length) % window.currentGalleryPathsSp.length;
        const imgEl = document.getElementById('detailMainImageSp');
        if (imgEl) {
            imgEl.src = window.currentGalleryPathsSp[window.curImgSp];
        }
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
