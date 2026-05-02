// JavaScript para gestionar la página de Calificaciones del Vendedor
import { API_BASE_URL, getAuthHeaders, handleLogout } from './main.js';

let allRatings = [];
let currentPage = 1;
const itemsPerPage = 6;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar sesión
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = '/pages/login.html';
        return;
    }

    // 2. Vincular botón de cerrar sesión
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // 3. Vincular botones de paginación
    document.getElementById('prev-page').addEventListener('click', () => changePage(-1));
    document.getElementById('next-page').addEventListener('click', () => changePage(1));

    // 4. Cargar datos iniciales
    await Promise.all([
        loadVendorStatus(),
        loadRatingsHistory()
    ]);
});

/**
 * Carga el estado general del vendedor (Promedio, Nombre, etc)
 */
async function loadVendorStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/vendors/vendedores/mi-status/`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Error al obtener el status del vendedor');

        const data = await response.json();
        
        // ── Promedio ──────────────────────────────────────────────
        document.getElementById('avg-rating-number').textContent = parseFloat(data.calificacion || 0).toFixed(1);
        
        // ── Iniciales del vendedor ────────────────────────────────
        if (data.nombre) {
            const photoContainer = document.getElementById('vendor-photo');
            const initials = data.nombre.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
            photoContainer.innerHTML = `<span class="photo-initials">${initials}</span>`;
        }

        // ── Widget de Strikes ─────────────────────────────────────
        const strikes   = data.strikes    || 0;
        const maxStr    = data.max_strikes || 10;
        const cancelled = data.estado_suscripcion === 'CANCELADA';
        const pct       = Math.min((strikes / maxStr) * 100, 100);

        document.getElementById('strikes-count').textContent = strikes;
        
        // Animamos la barra con un pequeño delay para que se vea el efecto
        setTimeout(() => {
            document.getElementById('strikes-bar').style.width = `${pct}%`;
        }, 300);

        const box   = document.getElementById('strikes-box');
        const label = document.getElementById('strikes-label');

        if (cancelled) {
            box.classList.add('danger');
            label.textContent = '🚫 Cuenta cancelada por reglamento';
            label.classList.add('cancelled');
        } else if (strikes >= 7) {
            box.classList.add('danger');
            label.textContent = `⚠️ Advertencia: ${maxStr - strikes} calificación(es) para la cancelación`;
        } else if (strikes >= 4) {
            label.textContent = `Precaución: ${maxStr - strikes} restantes para la cancelación`;
        } else {
            label.textContent = 'Puntuaciones por debajo de 3';
        }

    } catch (error) {
        console.error('Error loadVendorStatus:', error);
    }
}

/**
 * Carga el historial de calificaciones detallado
 */
async function loadRatingsHistory() {
    const tableBody = document.getElementById('ratings-table-body');
    
    try {
        const response = await fetch(`${API_BASE_URL}/vendors/vendedores/mis-calificaciones/`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) throw new Error('Error al obtener las calificaciones');

        allRatings = await response.json();
        renderRatingsPage();

    } catch (error) {
        console.error('Error loadRatingsHistory:', error);
        tableBody.innerHTML = `<tr><td colspan="5" class="loading-td" style="color:var(--neo-orange);">Error al cargar los datos.</td></tr>`;
    }
}

/**
 * Renderiza la página actual de calificaciones
 */
function renderRatingsPage() {
    const tableBody = document.getElementById('ratings-table-body');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageInfo = document.getElementById('page-info');

    if (allRatings.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="loading-td">No tienes calificaciones registradas todavía.</td></tr>`;
        pageInfo.textContent = "Página 0 de 0";
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        return;
    }

    const totalPages = Math.ceil(allRatings.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = totalPages;
    
    tableBody.innerHTML = ''; // Limpiar

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = allRatings.slice(start, end);

    pageItems.forEach(item => {
        const tr = document.createElement('tr');
        const imgHtml = item.producto_imagen 
            ? `<img src="${item.producto_imagen}" class="product-img-mini" alt="Producto">`
            : `<div class="product-img-mini" style="display:flex;align-items:center;justify-content:center;background:#1e293b;font-size:1.2rem;">📦</div>`;

        tr.innerHTML = `
            <td>
                <div class="product-cell">
                    ${imgHtml}
                    <span>${item.producto_nombre}</span>
                </div>
            </td>
            <td><span class="sale-number">${item.comprador_nombre}</span></td>
            <td><div class="rating-badge">⭐ ${item.calificacion}</div></td>
            <td><p class="comment-text">${item.comentario || '<em style="color:#64748b">Sin texto de reseña</em>'}</p></td>
            <td><span class="date-text">${item.fecha}</span></td>
        `;
        tableBody.appendChild(tr);
    });

    // Actualizar controles
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

function changePage(delta) {
    currentPage += delta;
    renderRatingsPage();
}
