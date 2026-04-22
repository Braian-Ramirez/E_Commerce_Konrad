/* ══════════════════════════════════════════════════════════
   DIRECTOR BAM — JAVASCRIPT COMPLETO
   Konrad Commerce · Director Comercial Dashboard
══════════════════════════════════════════════════════════ */

const API = 'http://127.0.0.1:8000/api/v1';
let chartsInstances = {};

// ── Autenticación ──────────────────────────────────────────
function getToken() {
    return localStorage.getItem('access_token');
}

function handleLogout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

// ── Reloj en tiempo real ────────────────────────────────────
function iniciarReloj() {
    const el = document.getElementById('bamDatetime');
    if (!el) return;
    const actualizar = () => {
        const now = new Date();
        el.textContent = now.toLocaleString('es-CO', {
            weekday: 'short', day: '2-digit', month: 'short',
            year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    };
    actualizar();
    setInterval(actualizar, 1000);
}

// ── Petición autenticada ────────────────────────────────────
async function apiFetch(endpoint) {
    const token = getToken();
    if (!token) {
        window.location.href = 'login.html';
        return null;
    }
    try {
        const res = await fetch(`${API}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.status === 401) {
            localStorage.removeItem('access_token');
            window.location.href = 'login.html';
            return null;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error(`[BAM] Error en ${endpoint}:`, err);
        return null;
    }
}

// ── Parámetros de filtro (Rango vs Rápido) ───────────────────
function getBAMParams() {
    const dias = document.getElementById('bamDateFilter')?.value || 30;
    const desde = document.getElementById('fechaDesde')?.value;
    const hasta = document.getElementById('fechaHasta')?.value;

    let params = `dias=${dias}`;
    if (desde && hasta) {
        params = `fecha_desde=${desde}&fecha_hasta=${hasta}`;
    }
    return params;
}

function destroyChart(id) {
    if (chartsInstances[id]) {
        chartsInstances[id].destroy();
        delete chartsInstances[id];
    }
}

// ════════════════════════════════════════════════════════════
//  Nuevos KPIs Creativos (BAM v2)
// ════════════════════════════════════════════════════════════

async function cargarVendedorEstrella() {
    const params = getBAMParams();
    const data = await apiFetch(`/bam/kpi/vendedor-estrella/?${params}`);
    const elName = document.getElementById('kpi-vendedor-estrella');
    const elVentas = document.getElementById('kpi-vendedor-ventas');
    if (!elName) return;

    if (!data || data.mensaje || !data.vendedor) {
        elName.textContent = 'Sin ventas';
        elVentas.textContent = 'No hay datos en el periodo';
        return;
    }
    elName.textContent = data.vendedor || '—';
    const total = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(data.total_ventas || 0);
    elVentas.textContent = `Generó ${total}`;
}

async function cargarTicketPromedio() {
    const params = getBAMParams();
    const data = await apiFetch(`/bam/kpi/ticket-promedio/?${params}`);
    const el = document.getElementById('kpi-ticket-promedio');
    if (!el) return;

    const valor = data?.ticket_promedio || 0;
    el.textContent = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);
}

async function cargarConversionComercial() {
    const params = getBAMParams();
    const data = await apiFetch(`/bam/kpi/conversion-comercial/?${params}`);
    const el = document.getElementById('kpi-conversion-comercial');
    const elStats = document.getElementById('kpi-conversion-stats');
    if (!el) return;

    const tasa = data?.tasa_conversion || 0;
    el.textContent = `${tasa}%`;
    elStats.textContent = `${data?.aprobadas || 0} de ${data?.total_solicitudes || 0} aprobadas`;
}

async function cargarIngresosTotales() {
    const params = getBAMParams();
    const data = await apiFetch(`/bam/kpi/ingresos-totales/?${params}`);
    const elCom = document.getElementById('kpi-comisiones-ventas');
    
    if (!elCom) return;

    const comisiones = data?.desglose?.comisiones || 0;
    
    // Mostrar solo comisiones como valor principal
    elCom.textContent = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(comisiones);
}

// ════════════════════════════════════════════════════════════
//  Gráfica barras: Categorías
// ════════════════════════════════════════════════════════════
async function cargarGraficaCategorias() {
    // Usamos el endpoint de categoría más consultada, que ahora trae el desglose completo
    const params = getBAMParams();
    const data = await apiFetch(`/bam/kpi/categoria-mas-consultada/?${params}`);
    const canvas = document.getElementById('chartCategorias');
    if (!canvas) return;

    destroyChart('categorias');

    if (!data || !data.desglose || data.desglose.length === 0) {
        canvas.parentElement.innerHTML = '<div class="empty-state">📭 No hay datos de visitas por categoría esta semana.</div>';
        return;
    }

    // Agrupar visitas por categoría (ya vienen agrupadas del backend, pero aseguramos formato)
    const catMap = {};
    data.desglose.forEach(item => {
        const cat = item['producto__categoria__nombre'] || 'Sin categoría';
        catMap[cat] = (catMap[cat] || 0) + item.total_visitas;
    });

    const labels = Object.keys(catMap);
    const values = Object.values(catMap);

    const colors = [
        'rgba(34,197,94,0.7)', 'rgba(168,85,247,0.7)', 'rgba(59,130,246,0.7)',
        'rgba(249,115,22,0.7)', 'rgba(234,179,8,0.7)', 'rgba(239,68,68,0.7)',
        'rgba(20,184,166,0.7)', 'rgba(236,72,153,0.7)'
    ];

    chartsInstances['categorias'] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Visitas',
                data: values,
                backgroundColor: colors.slice(0, labels.length),
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.x} visitas`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#a8a29e', font: { family: 'Outfit', size: 12 } }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: 'white', font: { family: 'Outfit', weight: '600', size: 12 } }
                }
            }
        }
    });
}

// ════════════════════════════════════════════════════════════
//  KPI 3: Suscripciones por tipo — Gráfica de barras
// ════════════════════════════════════════════════════════════
async function cargarSuscripciones() {
    const data = await apiFetch('/bam/kpi/suscripciones-semestre/');
    const canvas = document.getElementById('chartSuscripciones');
    const footer = document.getElementById('suscripciones-footer');
    if (!canvas) return;

    destroyChart('suscripciones');

    if (!data || !data.data || data.data.length === 0) {
        canvas.parentElement.innerHTML = '<div class="empty-state">📭 No hay suscripciones registradas aún.</div>';
        if (footer) footer.textContent = 'Sin datos';
        return;
    }

    const TIPO_LABELS = { MENSUAL: 'Mensual', SEMESTRAL: 'Semestral', ANUAL: 'Anual' };
    const TIPO_COLORS = {
        MENSUAL:   { bg: 'rgba(59,130,246,0.6)', border: '#3b82f6' },
        SEMESTRAL: { bg: 'rgba(168,85,247,0.6)',  border: '#a855f7' },
        ANUAL:     { bg: 'rgba(34,197,94,0.6)',   border: '#22c55e' },
    };

    const labels = data.data.map(d => TIPO_LABELS[d.tipo] || d.tipo);
    const values = data.data.map(d => d.total);
    const total = values.reduce((a, b) => a + b, 0);

    chartsInstances['suscripciones'] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(168, 85, 247, 0.8)'
                ],
                borderColor: [
                    'rgba(34, 197, 94, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(168, 85, 247, 1)'
                ],
                borderWidth: 1,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: 'rgba(255,255,255,0.7)', font: { family: 'Outfit', size: 12 } }
                }
            }
        }
    });

    if (footer) {
        footer.textContent = `Total registrados: ${total}`;
    }
}

// ════════════════════════════════════════════════════════════
//  Solicitudes: Dona de estados + KPIs de conteo
// ════════════════════════════════════════════════════════════
async function cargarEstadosSolicitudes() {
    const data = await apiFetch('/directors/solicitudes/');
    let solicitudes = [];
    if (data) {
        solicitudes = Array.isArray(data) ? data : (data.results || []);
    }

    // Conteos por estado
    const counts = { PENDIENTE: 0, APROBADA: 0, RECHAZADA: 0, DEVUELTA: 0, CANCELADA: 0, ACTIVA: 0 };
    solicitudes.forEach(s => {
        if (counts[s.estado] !== undefined) counts[s.estado]++;
        else counts[s.estado] = 1;
    });

    // Gráfica dona
    const canvas = document.getElementById('chartEstados');
    const legendEl = document.getElementById('estados-legend');
    if (!canvas) return;

    destroyChart('estados');

    const EST_CONFIG = {
        PENDIENTE: { label: 'Pendiente',  color: '#eab308' },
        APROBADA:  { label: 'Aprobada',   color: '#22c55e' },
        RECHAZADA: { label: 'Rechazada',  color: '#ef4444' },
        DEVUELTA:  { label: 'Devuelta',   color: '#f97316' },
        ACTIVA:    { label: 'Activa',     color: '#3b82f6' },
        CANCELADA: { label: 'Cancelada',  color: '#78716c' },
    };

    const activeStates = Object.entries(counts).filter(([, v]) => v > 0);
    const bgColors = activeStates.map(([k]) => EST_CONFIG[k]?.color || '#ffffff');

    if (activeStates.length === 0) {
        canvas.parentElement.innerHTML = '<div class="empty-state">📭 Sin solicitudes aún.</div>';
        return;
    }

    chartsInstances['estados'] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: activeStates.map(x => EST_CONFIG[x[0]]?.label || x[0]),
            datasets: [{
                data: activeStates.map(x => x[1]),
                backgroundColor: bgColors,
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '82%', // Hacemos la dona mucho más delgada (Estilo Moderno)
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` ${ctx.label}: ${ctx.raw} solicitudes`
                    }
                }
            }
        }
    });

    // Leyenda personalizada
    if (legendEl) {
        legendEl.innerHTML = activeStates.map(([k, v]) => `
            <div class="legend-item">
                <div class="legend-dot" style="background:${EST_CONFIG[k]?.color || '#fff'}"></div>
                <span>${EST_CONFIG[k]?.label || k} (${v})</span>
            </div>
        `).join('');
    }

    // Solicitudes recientes (últimas 8)
    const recientes = [...solicitudes].sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion)).slice(0, 8);
    renderSolicitudesRecientes(recientes);
}

// ── Solicitudes recientes ────────────────────────────────────
function renderSolicitudesRecientes(solicitudes) {
    const el = document.getElementById('recent-solicitudes');
    if (!el) return;

    if (!solicitudes.length) {
        el.innerHTML = '<div class="empty-state">📭 Sin solicitudes aún.</div>';
        return;
    }

    const EST_CONFIG = {
        PENDIENTE: 'status-pendiente',
        APROBADA:  'status-aprobada',
        RECHAZADA: 'status-rechazada',
        DEVUELTA:  'status-devuelta',
    };

    el.innerHTML = solicitudes.map(s => {
        const nombre = `${s.apellidos || ''} ${s.nombres || ''}`.trim() || s.email || '—';
        const fecha = new Date(s.fecha_creacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
        const cls = EST_CONFIG[s.estado] || 'status-pendiente';
        return `
        <a href="director-detail.html?id=${s.id}" class="recent-item">
            <div class="recent-num">${s.numero_solicitud || '#—'}</div>
            <div>
                <div class="recent-info-name">${nombre}</div>
                <div class="recent-info-date">${fecha}</div>
            </div>
            <span class="badge-status ${cls}">${s.estado}</span>
        </a>`;
    }).join('');
}

// ════════════════════════════════════════════════════════════
//  KPI 4: Tendencias (Lista Top 5)
// ════════════════════════════════════════════════════════════
async function cargarTendencias() {
    const params = getBAMParams();
    const data = await apiFetch(`/bam/kpi/productos-tendencia/?${params}`);
    const el = document.getElementById('trend-list');
    if (!el) return;

    if (!data || !data.data || data.data.length === 0) {
        el.innerHTML = '<div class="empty-state">📭 No hay visitas registradas esta semana.<br><small>Navega a algunos productos para generar datos.</small></div>';
        return;
    }

    const rankEmoji = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
    const rankClass = ['gold', 'silver', 'bronze', '', ''];

    el.innerHTML = data.data.map((item, i) => {
        const nombre = item['producto__nombre'] || 'Producto sin nombre';
        const cat    = item['producto__categoria__nombre'] || 'Sin categoría';
        const visitas = item.total_visitas || 0;
        const prodId = item.producto_id || (i + 1); // El backend debería enviar el ID

        return `
        <div class="trend-item" onclick="window.open('/pages/catalog.html?productId=${item.producto}', '_blank')" style="cursor:pointer;" title="Ver detalle en nueva pestaña">
            <div class="trend-rank ${rankClass[i] || ''}">${rankEmoji[i] || (i + 1)}</div>
            <div class="trend-info">
                <div class="trend-name">${nombre}</div>
                <div class="trend-cat">📂 ${cat}</div>
            </div>
            <div class="trend-visits">${visitas} vista${visitas !== 1 ? 's' : ''}</div>
        </div>`;
    }).join('');
}

// ════════════════════════════════════════════════════════════
//  Carga COMPLETA del dashboard
// ════════════════════════════════════════════════════════════
async function cargarTodoElDashboard() {
    // Animación botón refresh
    const btnRefresh = document.getElementById('btnRefresh');
    if (btnRefresh) {
        btnRefresh.classList.add('spinning');
        setTimeout(() => btnRefresh.classList.remove('spinning'), 800);
    }

    await Promise.all([
        cargarVendedorEstrella(),
        cargarTicketPromedio(),
        cargarConversionComercial(),
        cargarIngresosTotales(),
        cargarSuscripciones(),
        cargarEstadosSolicitudes(),
        cargarTendencias(),
        cargarGraficaCategorias(),
    ]);
}

// ════════════════════════════════════════════════════════════
//  Badge pendientes en el sidebar
// ════════════════════════════════════════════════════════════
async function cargarBadgePendientes() {
    const data = await apiFetch('/directors/solicitudes/');
    if (!data) return;
    const solicitudes = Array.isArray(data) ? data : (data.results || []);
    const pendientes = solicitudes.filter(s => s.estado === 'PENDIENTE').length;
    const badge = document.getElementById('badge-pendientes');
    if (badge && pendientes > 0) {
        badge.textContent = pendientes;
        badge.style.display = 'inline-flex';
    }
}

// ════════════════════════════════════════════════════════════
//  Enviar campaña de promociones (F41/F42)
// ════════════════════════════════════════════════════════════
async function enviarPromocionBAM() {
    const btn = document.getElementById('btnEnviarPromocion');
    const statusEl = document.getElementById('promo-status');
    const statusText = document.getElementById('promo-status-text');
    const resultEl = document.getElementById('promo-result');

    if (!btn) return;

    // Estado: enviando
    btn.disabled = true;
    document.getElementById('promo-btn-icon').textContent = '⏳';
    if (statusEl) { statusEl.className = 'promo-status-sending'; }
    if (statusText) statusText.textContent = 'Enviando campaña...';
    if (resultEl) resultEl.style.display = 'none';

    const token = getToken();
    if (!token) { window.location.href = 'login.html'; return; }

    try {
        const res = await fetch(`${API}/bam/kpi/enviar-promociones/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await res.json();

        if (res.ok) {
            if (statusEl) { statusEl.className = 'promo-status-ok'; }
            if (statusText) statusText.textContent = '✅ Enviada';
            document.getElementById('promo-btn-icon').textContent = '✅';

            if (resultEl) {
                const productos = (data.top_productos || []).map((p, i) =>
                    `${i + 1}. <strong>${p['producto__nombre'] || '—'}</strong> — ${p['producto__categoria__nombre'] || 'Sin categoría'} (${p.total_visitas} visitas)`
                ).join('<br>');

                resultEl.innerHTML = `
                    <strong style="color:#22c55e;">🎉 Campaña enviada correctamente</strong><br>
                    Compradores notificados: <strong>${data.compradores_notificados || 0}</strong><br>
                    Productos incluidos en la promoción:<br>${productos || '<em>Sin datos de tendencia esta semana.</em>'}
                    ${data.errores > 0 ? `<br><span style="color:#f97316;">⚠️ ${data.errores} errores menores al enviar.</span>` : ''}
                `;
                resultEl.style.display = 'block';
            }
        } else {
            throw new Error(data.mensaje || data.detail || 'Error desconocido');
        }
    } catch (err) {
        if (statusEl) { statusEl.className = 'promo-status-error'; }
        if (statusText) statusText.textContent = '❌ Error';
        document.getElementById('promo-btn-icon').textContent = '❌';
        if (resultEl) {
            resultEl.innerHTML = `<strong style="color:#ef4444;">Error al enviar la campaña:</strong> ${err.message}`;
            resultEl.style.border = '1px solid rgba(239,68,68,0.2)';
            resultEl.style.background = 'rgba(239,68,68,0.06)';
            resultEl.style.display = 'block';
        }
        console.error('[BAM PROMO] Error:', err);
    } finally {
        // Re-habilitar botón después de 5 segundos
        setTimeout(() => {
            btn.disabled = false;
            document.getElementById('promo-btn-icon').textContent = '🚀';
        }, 5000);
    }
}

// ════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    iniciarReloj();
    cargarTodoElDashboard();
    cargarBadgePendientes();

    // Auto-refresh cada 60 segundos
    setInterval(cargarTodoElDashboard, 60000);
});
