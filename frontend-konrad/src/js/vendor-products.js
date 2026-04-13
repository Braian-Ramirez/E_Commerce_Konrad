// vendor-products.js - Módulo independiente para la gestión de productos del vendedor

const API_BASE = 'http://localhost:8000/api/v1';
let indicePrincipalSeleccionado = 0;
let productoEdicionId = null; // Guardará el ID si estamos editando

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
        card.style.cursor = 'pointer';
        card.onclick     = (e) => {
            // Evitar abrir detalle si se hizo clic en los botones de acción
            if (!e.target.closest('.product-card-actions')) {
                verDetalleProducto(prod.id);
            }
        };
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

async function editarProducto(productId) {
    try {
        // 1. Obtener datos frescos del producto
        const response = await fetch(`${API_BASE}/products/productos/${productId}/`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });

        if (!response.ok) throw new Error('No se pudo cargar el producto');
        const prod = await response.json();

        // 2. Preparar el modal para Edición
        productoEdicionId = productId;
        await abrirModalCrearProducto(); // Esto limpia y carga categorías
        
        // 3. Cambiar textos del modal
        document.querySelector('.modal-title').textContent = 'Edita tu producto';
        document.querySelector('.modal-subtitle').textContent = 'Modifica los campos necesarios y guarda los cambios.';
        document.getElementById('btn-crear-producto').innerHTML = '💾 Guardar Cambios';

        // 4. Pre-llenar el formulario
        document.getElementById('prod-nombre').value       = prod.nombre;
        document.getElementById('prod-categoria').value    = prod.categoria;
        
        // Cargar subcategorías y luego seleccionar la correcta
        await cargarSubcategorias();
        document.getElementById('prod-subcategoria').value = prod.subcategoria;

        document.getElementById('prod-marca').value        = prod.marca || '';
        document.getElementById('prod-autenticidad').value = prod.autenticidad;
        document.getElementById('prod-color').value        = prod.color || '';
        document.getElementById('prod-tamano').value       = prod.tamano || '';
        document.getElementById('prod-peso').value         = prod.peso;
        document.getElementById('prod-talla').value        = prod.talla || '';
        document.getElementById('prod-condicion').value    = prod.condicion;
        document.getElementById('prod-cantidad').value     = prod.cantidad;
        document.getElementById('prod-valor').value        = Math.floor(prod.valor);
        document.getElementById('prod-descripcion').value  = prod.descripcion || '';

        // Nota: Las imágenes actuales no se cargan en el input file (es imposible por seguridad del navegador),
        // pero podemos mostrar un aviso o dejar que el usuario suba nuevas si desea reemplazarlas.
        document.getElementById('image-count-label').textContent = '⚠️ Sube fotos nuevas solo si deseas reemplazarlas';

    } catch (err) {
        console.error('Error cargando producto para editar:', err);
        mostrarToast('Error al cargar datos del producto', 'error');
    }
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
    
    // Resetear modo edición
    productoEdicionId = null;
    document.querySelector('.modal-title').textContent = 'Crea un nuevo producto';
    document.querySelector('.modal-subtitle').textContent = 'Completa los datos para publicar tu producto en la tienda.';
    document.getElementById('btn-crear-producto').innerHTML = '✅ Crear Producto';
}

// Cerrar al hacer clic fuera de los modales
document.addEventListener('click', (e) => {
    if (e.target === document.getElementById('product-modal')) cerrarModalProducto();
    if (e.target === document.getElementById('product-detail-modal')) cerrarModalDetalle();
});

// ──────────────────────────────────────────
// DETALLE DE PRODUCTO
// ──────────────────────────────────────────
async function verDetalleProducto(productId) {
    const modal   = document.getElementById('product-detail-modal');
    const loading = document.getElementById('detail-loading');
    const content = document.getElementById('detail-content');

    modal.style.display = 'flex';
    loading.style.display = 'block';
    content.style.display = 'none';
    document.body.style.overflow = 'hidden';

    try {
        const response = await fetch(`${API_BASE}/products/productos/${productId}/`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` }
        });

        if (!response.ok) throw new Error('No se pudo obtener el detalle');

        const prod = await response.json();
        renderDetailContent(prod);

        loading.style.display = 'none';
        content.style.display = 'block';

    } catch (err) {
        console.error('Error cargando detalle:', err);
        cerrarModalDetalle();
        mostrarToast('Error al cargar los detalles del producto', 'error');
    }
}

function cerrarModalDetalle() {
    document.getElementById('product-detail-modal').style.display = 'none';
    document.body.style.overflow = '';
}

function renderDetailContent(prod) {
    // 1. Textos básicos
    document.getElementById('detail-nombre').textContent = prod.nombre;
    document.getElementById('detail-meta').textContent   = `${prod.categoria_nombre || 'Sin categoría'} · ${prod.marca || 'Genérico'}`;
    
    const precio = new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(prod.valor);
    document.getElementById('detail-precio').textContent = precio;
    document.getElementById('detail-stock').textContent  = `Stock: ${prod.cantidad} dispon.`;
    
    document.getElementById('detail-marca').textContent        = prod.marca || '-';
    document.getElementById('detail-color').textContent        = prod.color || '-';
    document.getElementById('detail-tamano').textContent       = prod.tamano || '-';
    document.getElementById('detail-talla').textContent        = prod.talla || '-';
    document.getElementById('detail-peso').textContent         = `${prod.peso} kg`;
    document.getElementById('detail-autenticidad').textContent = prod.autenticidad;
    document.getElementById('detail-descripcion').textContent  = prod.descripcion || 'Sin descripción disponible.';

    const badge = document.getElementById('detail-badge');
    badge.textContent = prod.condicion === 'NUEVO' ? 'Nuevo' : 'Usado';
    badge.className   = `product-badge ${prod.condicion === 'NUEVO' ? 'badge-new' : 'badge-used'}`;

    // 2. Galería
    const mainImgContainer = document.getElementById('detail-main-img-container');
    const thumbsGrid       = document.getElementById('detail-thumbnails');
    mainImgContainer.innerHTML = '';
    thumbsGrid.innerHTML       = '';

    if (prod.imagenes && prod.imagenes.length > 0) {
        const mainImgUrl = prod.imagenes.find(i => i.es_principal)?.imagen || prod.imagenes[0].imagen;
        mainImgContainer.innerHTML = `<img src="${mainImgUrl}" id="current-detail-img">`;

        prod.imagenes.forEach((img, idx) => {
            const thumb = document.createElement('div');
            thumb.className = `thumb-item ${img.imagen === mainImgUrl ? 'active' : ''}`;
            thumb.innerHTML = `<img src="${img.imagen}">`;
            thumb.onclick = () => {
                document.getElementById('current-detail-img').src = img.imagen;
                thumbsGrid.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            };
            thumbsGrid.appendChild(thumb);
        });
    } else {
        mainImgContainer.innerHTML = '<span style="font-size: 4rem;">📦</span>';
    }

    // 3. Interacciones (Comentarios y Preguntas unificados)
    const container = document.getElementById('detail-interactions-list');
    container.innerHTML = '';

    const interacciones = [];
    if (prod.comentarios) {
        prod.comentarios.forEach(c => interacciones.push({ ...c, type: 'comentario', dateObj: new Date(c.fecha) }));
    }
    if (prod.preguntas) {
        prod.preguntas.forEach(q => interacciones.push({ ...q, type: 'pregunta', dateObj: new Date(q.fecha_pregunta) }));
    }

    interacciones.sort((a, b) => b.dateObj - a.dateObj);

    if (interacciones.length > 0) {
        interacciones.forEach(item => {
            const card = document.createElement('div');
            card.className = 'interaction-card';
            
            const isComment = item.type === 'comentario';
            const badgeTag = isComment ? '<span class="int-badge-comment">Reseña</span>' : '<span class="int-badge-question">Pregunta</span>';
            const stars    = isComment ? renderStars(item.calificacion) : '';
            const text     = isComment ? item.comentario : item.pregunta;
            const resp     = isComment ? item.respuesta_vendedor : item.respuesta;
            
            let responseHtml = '';
            if (resp) {
                responseHtml = `
                    <div class="vendor-response-box">
                        <strong>Tu Respuesta:</strong>
                        <p>${resp}</p>
                    </div>
                `;
            } else {
                const typeParam = isComment ? 'comentarios' : 'preguntas';
                responseHtml = `
                    <div class="response-input-group">
                        <input type="text" id="resp-${item.type}-${item.id}" placeholder="Escribe tu respuesta...">
                        <button class="btn-responder" onclick="enviarRespuesta('${typeParam}', ${item.id}, ${prod.id})">Responder</button>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="comment-header">
                    <div>
                        ${badgeTag}
                        <span class="comment-user">${item.comprador_nombre}</span>
                    </div>
                    <span class="comment-date">${item.dateObj.toLocaleDateString()}</span>
                </div>
                ${stars ? `<div style="margin-bottom: 8px;">${stars}</div>` : ''}
                <p class="comment-text">${isComment ? '' : '<strong>P: </strong>'} ${text}</p>
                ${responseHtml}
            `;
            container.appendChild(card);
        });
    } else {
        container.innerHTML = '<p class="text-muted" style="text-align:center; padding:20px;">No hay interacciones para este producto.</p>';
    }
}

async function enviarRespuesta(type, id, productId) {
    const inputId = type === 'comentarios' ? `resp-comentario-${id}` : `resp-pregunta-${id}`;
    const respuesta = document.getElementById(inputId).value.trim();

    if (!respuesta) {
        mostrarToast('Escribe una respuesta válida', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/products/${type}/${id}/responder/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ respuesta: respuesta })
        });

        if (response.ok) {
            mostrarToast('✅ Respuesta enviada', 'success');
            // Recargar el detalle para ver la respuesta reflejada
            verDetalleProducto(productId);
        } else {
            const err = await response.json();
            mostrarToast(`Error: ${err.error || 'No se pudo enviar'}`, 'error');
        }
    } catch (err) {
        console.error('Error al responder:', err);
        mostrarToast('Error de conexión', 'error');
    }
}

/** Renderiza 10 estrellas, pintando las que correspondan a la calificacion */
function renderStars(rating) {
    let stars = '<div class="rating-stars">';
    for (let i = 1; i <= 10; i++) {
        const isFull = i <= rating;
        stars += `<span class="star ${isFull ? 'full' : 'empty'}">★</span>`;
    }
    stars += `<span class="rating-value">${rating}/10</span></div>`;
    return stars;
}

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

    indicePrincipalSeleccionado = 0; // Por defecto la primera
    actualizarVistaPreviaImagenes(files);
}

function actualizarVistaPreviaImagenes(files) {
    const grid = document.getElementById('image-preview-grid');
    const countLabel = document.getElementById('image-count-label');
    
    // Eliminar thumbs anteriores
    grid.querySelectorAll('.image-preview-thumb').forEach(el => el.remove());

    files.forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const thumb = document.createElement('div');
            thumb.className = `image-preview-thumb ${idx === indicePrincipalSeleccionado ? 'is-main' : ''}`;
            thumb.title = "Haz clic para marcar como principal";
            thumb.innerHTML = `
                <img src="${e.target.result}" alt="Preview ${idx + 1}">
                ${idx === indicePrincipalSeleccionado ? '<span class="thumb-badge">Portada</span>' : ''}
            `;
            
            thumb.onclick = () => {
                indicePrincipalSeleccionado = idx;
                actualizarVistaPreviaImagenes(files);
            };

            const addBtn = document.getElementById('label-add-image');
            grid.insertBefore(thumb, addBtn);
        };
        reader.readAsDataURL(file);
    });

    countLabel.textContent = `${files.length} imagen${files.length !== 1 ? 'es' : ''} seleccionada${files.length !== 1 ? 's' : ''}`;
}

function resetImagePreview() {
    indicePrincipalSeleccionado = 0;
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
        
        formData.append('indice_principal', indicePrincipalSeleccionado);

        const url = productoEdicionId 
            ? `${API_BASE}/products/productos/${productoEdicionId}/` 
            : `${API_BASE}/products/productos/crear-producto/`;
        
        const method = productoEdicionId ? 'PATCH' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
            body: formData
        });

        if (response.ok) {
            cerrarModalProducto();
            mostrarToast(productoEdicionId ? '✅ Cambios guardados' : '✅ Producto creado exitosamente', 'success');
            await cargarMisProductos();
        } else {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const errData = await response.json();
                const msg = Object.entries(errData)
                    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                    .join(' | ');
                mostrarToast(`Error (${response.status}): ${msg}`, 'error');
            } else {
                const text = await response.text();
                console.error('Respuesta no-JSON del servidor:', text);
                mostrarToast(`Error del servidor (${response.status}). Revisa la consola.`, 'error');
            }
        }

    } catch (err) {
        console.error('Error enviando producto:', err);
        mostrarToast('Error de conexión o de sistema. Revisa la consola.', 'error');
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
window.verDetalleProducto         = verDetalleProducto;
window.cerrarModalDetalle         = cerrarModalDetalle;
window.enviarRespuesta            = enviarRespuesta;
window.cargarSubcategorias        = cargarSubcategorias;
window.previsualizarImagenes      = previsualizarImagenes;
window.enviarProducto             = enviarProducto;
window.eliminarProducto           = eliminarProducto;
window.editarProducto             = editarProducto;
window.handleLogout               = handleLogout;
