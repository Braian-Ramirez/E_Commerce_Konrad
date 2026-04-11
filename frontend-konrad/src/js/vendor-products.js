// vendor-products.js - Módulo independiente para la gestión de productos del vendedor

const API_BASE = 'http://localhost:8000/api/v1';

// ──────────────────────────────────────────
// INICIALIZACIÓN
// ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    cargarMisProductos();
});

// ──────────────────────────────────────────
// CARGA DE PRODUCTOS
// ──────────────────────────────────────────
async function cargarMisProductos() {
    const loading  = document.getElementById('products-loading');
    const grid     = document.getElementById('products-grid');
    const empty    = document.getElementById('products-empty-state');
    const blocked  = document.getElementById('products-subscription-warning');
    const btnAdd   = document.getElementById('btn-agregar-producto');
    const subtitle = document.getElementById('products-count-text');

    // Estado inicial
    mostrarSolo(loading);

    try {
        const response = await fetch(`${API_BASE}/products/productos/mis-productos/`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });

        mostrarSolo(null); // ocultar loading

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            if (err.codigo === 'SUSCRIPCION_INACTIVA') {
                mostrarSolo(blocked);
                subtitle.textContent = 'Suscripción requerida';
            } else {
                mostrarSolo(blocked);
                subtitle.textContent = 'Error al verificar suscripción';
            }
            return;
        }

        const productos = await response.json();
        btnAdd.style.display = 'inline-flex';

        if (productos.length === 0) {
            mostrarSolo(empty);
            subtitle.textContent = 'Aún no has publicado productos';
        } else {
            mostrarSolo(grid);
            renderProductCards(productos);
            subtitle.textContent = `${productos.length} producto${productos.length !== 1 ? 's' : ''} publicado${productos.length !== 1 ? 's' : ''}`;
        }

    } catch (err) {
        console.error('Error al cargar productos:', err);
        mostrarSolo(blocked);
        subtitle.textContent = 'Error de conexión';
    }
}

/** Oculta todos los estados y muestra solo el indicado (o ninguno si es null) */
function mostrarSolo(elVisible) {
    const estados = ['products-loading', 'products-empty-state', 'products-subscription-warning', 'products-grid'];
    estados.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (el === elVisible) ? (id === 'products-grid' ? 'grid' : 'block') : 'none';
    });
}

// ──────────────────────────────────────────
// RENDER DE TARJETAS
// ──────────────────────────────────────────
function renderProductCards(productos) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    productos.forEach(prod => {
        const imagenUrl = prod.imagenes?.find(i => i.es_principal)?.imagen
            || prod.imagenes?.[0]?.imagen
            || null;

        const precio = new Intl.NumberFormat('es-CO', {
            style: 'currency', currency: 'COP', minimumFractionDigits: 0
        }).format(prod.valor);

        const badgeClass = prod.condicion === 'NUEVO' ? 'badge-new' : 'badge-used';
        const badgeLabel = prod.condicion === 'NUEVO' ? 'Nuevo' : 'Usado';
        const imgHtml    = imagenUrl
            ? `<img src="${imagenUrl}" alt="${prod.nombre}" loading="lazy">`
            : '📦';

        const card = document.createElement('article');
        card.className   = 'product-card';
        card.id          = `product-card-${prod.id}`;
        card.innerHTML   = `
            <span class="product-badge ${badgeClass}">${badgeLabel}</span>
            <div class="product-card-image">${imgHtml}</div>
            <div class="product-card-body">
                <div class="product-card-name" title="${prod.nombre}">${prod.nombre}</div>
                <div class="product-card-meta">${prod.categoria_nombre || 'Sin categoría'}${prod.marca ? ' · ' + prod.marca : ''}</div>
                <div class="product-card-price">${precio}</div>
                <div class="product-card-stock">Stock: ${prod.cantidad} unidades</div>
            </div>
            <div class="product-card-actions">
                <button class="btn-card-action" onclick="editarProducto(${prod.id})">✏️ Editar</button>
                <button class="btn-card-action danger" onclick="eliminarProducto(${prod.id})">🗑️ Eliminar</button>
            </div>
        `;
        grid.appendChild(card);
    });
}

// ──────────────────────────────────────────
// ELIMINAR PRODUCTO
// ──────────────────────────────────────────
async function eliminarProducto(productId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) return;

    try {
        const response = await fetch(`${API_BASE}/products/productos/${productId}/eliminar/`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });

        if (response.ok) {
            const card = document.getElementById(`product-card-${productId}`);
            if (card) {
                card.style.animation = 'fadeOutCard 0.3s ease forwards';
                setTimeout(() => {
                    card.remove();
                    const grid = document.getElementById('products-grid');
                    const subtitle = document.getElementById('products-count-text');
                    const remaining = grid.querySelectorAll('.product-card').length;
                    if (remaining === 0) {
                        mostrarSolo(document.getElementById('products-empty-state'));
                        document.getElementById('btn-agregar-producto').style.display = 'inline-flex';
                        subtitle.textContent = 'Aún no has publicado productos';
                    } else {
                        subtitle.textContent = `${remaining} producto${remaining !== 1 ? 's' : ''} publicado${remaining !== 1 ? 's' : ''}`;
                    }
                }, 300);
            }
            mostrarToast('Producto eliminado correctamente.', 'success');
        } else {
            mostrarToast('Error al eliminar el producto.', 'error');
        }
    } catch (err) {
        console.error('Error eliminando producto:', err);
        mostrarToast('Error de conexión.', 'error');
    }
}

function editarProducto(productId) {
    // TODO: abrir modal de edición con los datos pre-cargados
    mostrarToast(`Edición de producto (ID: ${productId}) — Próximamente.`, 'success');
}

// ──────────────────────────────────────────
// MODAL CREAR PRODUCTO
// ──────────────────────────────────────────
async function abrirModalCrearProducto() {
    const modal = document.getElementById('product-modal');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Limpiar formulario
    document.getElementById('product-form').reset();
    resetImagePreview();

    // Cargar categorías (solo la primera vez)
    await cargarCategorias();
}

function cerrarModalProducto() {
    document.getElementById('product-modal').style.display = 'none';
    document.body.style.overflow = '';
}

// Cerrar al hacer clic fuera del modal
document.getElementById('product-modal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('product-modal')) cerrarModalProducto();
});

async function cargarCategorias() {
    const select = document.getElementById('prod-categoria');
    if (select.options.length > 1) return; // ya cargadas

    try {
        const res = await fetch(`${API_BASE}/products/categorias/`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
        if (res.ok) {
            const cats = await res.json();
            cats.forEach(cat => {
                const opt = document.createElement('option');
                opt.value       = cat.id;
                opt.textContent = cat.nombre;
                select.appendChild(opt);
            });
        }
    } catch (err) {
        console.error('Error cargando categorías:', err);
    }
}

async function cargarSubcategorias() {
    const catId    = document.getElementById('prod-categoria').value;
    const subSel   = document.getElementById('prod-subcategoria');

    subSel.innerHTML = '<option value="">Cargando...</option>';

    if (!catId) {
        subSel.innerHTML = '<option value="">Elige categoría primero</option>';
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/products/subcategorias/?categoria=${catId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });
        if (res.ok) {
            const subs = await res.json();
            subSel.innerHTML = '<option value="">Selecciona...</option>';
            subs.forEach(s => {
                const opt = document.createElement('option');
                opt.value       = s.id;
                opt.textContent = s.nombre;
                subSel.appendChild(opt);
            });
            if (subs.length === 0) subSel.innerHTML = '<option value="">Sin subcategorías</option>';
        }
    } catch (err) {
        console.error('Error cargando subcategorías:', err);
        subSel.innerHTML = '<option value="">Error al cargar</option>';
    }
}

// ──────────────────────────────────────────
// PREVISUALIZACIÓN DE IMÁGENES
// ──────────────────────────────────────────
function previsualizarImagenes(event) {
    const files       = Array.from(event.target.files);
    const grid        = document.getElementById('image-preview-grid');
    const countLabel  = document.getElementById('image-count-label');

    resetImagePreview();

    files.forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const thumb = document.createElement('div');
            thumb.className = 'image-preview-thumb';
            thumb.innerHTML = `
                <img src="${e.target.result}" alt="Preview ${idx + 1}">
                ${idx === 0 ? '<span class="thumb-badge">Portada</span>' : ''}
            `;
            // Insertar antes del botón "Más"
            const addBtn = document.getElementById('label-add-image');
            grid.insertBefore(thumb, addBtn);
        };
        reader.readAsDataURL(file);
    });

    countLabel.textContent = `${files.length} imagen${files.length !== 1 ? 'es' : ''} seleccionada${files.length !== 1 ? 's' : ''}`;
}

function resetImagePreview() {
    const grid = document.getElementById('image-preview-grid');
    // Eliminar thumbs anteriores (no el botón de agregar)
    grid.querySelectorAll('.image-preview-thumb').forEach(el => el.remove());

    // Restaurar el botón si fue reemplazado
    if (!document.getElementById('label-add-image')) {
        const addBtn = document.createElement('label');
        addBtn.id        = 'label-add-image';
        addBtn.htmlFor   = 'prod-imagenes';
        addBtn.className = 'image-add-btn';
        addBtn.innerHTML = '<span>+</span><small>Agregar foto</small>';
        grid.appendChild(addBtn);
    }

    // Restaurar estilos del botón a pantalla completa
    const btn = document.getElementById('label-add-image');
    if (btn) {
        btn.style.gridColumn = '1 / -1';
        btn.style.padding    = '18px 0';
    }

    document.getElementById('image-count-label').textContent = '0 imágenes seleccionadas';
}

// ──────────────────────────────────────────
// ENVIAR PRODUCTO
// ──────────────────────────────────────────
async function enviarProducto() {
    const btn = document.getElementById('btn-crear-producto');
    btn.disabled   = true;
    btn.textContent = '⏳ Creando...';

    try {
        const nombre       = document.getElementById('prod-nombre').value.trim();
        const categoria    = document.getElementById('prod-categoria').value;
        const subcategoria = document.getElementById('prod-subcategoria').value;
        const peso         = document.getElementById('prod-peso').value;
        const cantidad     = document.getElementById('prod-cantidad').value;
        const valor        = document.getElementById('prod-valor').value;

        if (!nombre || !categoria || !subcategoria || !peso || !cantidad || !valor) {
            mostrarToast('Completa los campos obligatorios (*).', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('nombre',       nombre);
        formData.append('categoria',    categoria);
        formData.append('subcategoria', subcategoria);
        formData.append('marca',        document.getElementById('prod-marca').value || '');
        formData.append('autenticidad', document.getElementById('prod-autenticidad').value);
        formData.append('color',        document.getElementById('prod-color').value || '');
        formData.append('tamano',       document.getElementById('prod-tamano').value || '');
        formData.append('peso',         peso);
        formData.append('talla',        document.getElementById('prod-talla').value || '');
        formData.append('condicion',    document.getElementById('prod-condicion').value);
        formData.append('cantidad',     cantidad);
        formData.append('valor',        valor);
        formData.append('descripcion',  document.getElementById('prod-descripcion').value || '');

        const imageInput = document.getElementById('prod-imagenes');
        Array.from(imageInput.files).forEach(file => formData.append('imagenes', file));

        const response = await fetch(`${API_BASE}/products/productos/crear-producto/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            body: formData
        });

        if (response.ok) {
            cerrarModalProducto();
            mostrarToast('✅ Producto creado exitosamente', 'success');
            await cargarMisProductos();
        } else {
            const errData = await response.json();
            const msg = Object.entries(errData)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                .join(' | ');
            mostrarToast(`Error: ${msg}`, 'error');
            console.error('Errores del backend:', errData);
        }

    } catch (err) {
        console.error('Error enviando producto:', err);
        mostrarToast('Error de conexión. Intenta de nuevo.', 'error');
    } finally {
        btn.disabled    = false;
        btn.textContent = '✅ Crear Producto';
    }
}

// ──────────────────────────────────────────
// TOAST
// ──────────────────────────────────────────
function mostrarToast(mensaje, tipo = 'success') {
    const toast = document.createElement('div');
    toast.className = `vp-toast ${tipo}`;
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ──────────────────────────────────────────
// SESIÓN
// ──────────────────────────────────────────
function handleLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/pages/login.html';
}

// ──────────────────────────────────────────
// EXPOSICIÓN GLOBAL (llamadas desde HTML)
// ──────────────────────────────────────────
window.abrirModalCrearProducto    = abrirModalCrearProducto;
window.cerrarModalProducto        = cerrarModalProducto;
window.cargarSubcategorias        = cargarSubcategorias;
window.previsualizarImagenes      = previsualizarImagenes;
window.enviarProducto             = enviarProducto;
window.eliminarProducto           = eliminarProducto;
window.editarProducto             = editarProducto;
window.handleLogout               = handleLogout;
