const token = localStorage.getItem('access_token');

// Colores y etiquetas por estado usando clases de Dashboard
const ESTADO_CONFIG = {
    'APROBADA': { label: 'APROBADA', cls: 'status-aprobada' },
    'RECHAZADA': { label: 'RECHAZADA', cls: 'status-rechazada' },
    'DEVUELTA': { label: 'DEVUELTA', cls: 'status-devuelta' },
};

fetch('http://127.0.0.1:8000/api/v1/directors/solicitudes/historial/', {
    headers: { 'Authorization': `Bearer ${token}` }
})
    .then(res => {
        if (!res.ok) throw new Error('No autorizado');
        return res.json();
    })
    .then(solicitudes => {
        // --- ESTADO GLOBAL ---
        let solicitudesOriginales = solicitudes;
        
        const tbody = document.getElementById('historialBody');
        const searchInput = document.getElementById('searchInput');
        const dateInput = document.getElementById('dateInput');

        // Función de Renderizado
        const renderHistorial = (datos) => {
            if (datos.length === 0) {
                tbody.innerHTML = `
                <div style="color:white; padding:40px; text-align:center;">
                    📭 No hay solicitudes procesadas que coincidan con la búsqueda.
                </div>`;
                return;
            }

            tbody.innerHTML = datos.map(sol => {
                const cfg = ESTADO_CONFIG[sol.estado] || { label: sol.estado, cls: 'status-pendiente' };
                const fecha = new Date(sol.fecha_creacion).toLocaleDateString('es-CO', {
                    day: '2-digit', month: 'short', year: 'numeric'
                });
                const nombre = (sol.nombres && sol.apellidos)
                    ? `${sol.apellidos} ${sol.nombres}`
                    : '---';

                return `
                <div class="solicitud-card" style="display: grid; grid-template-columns: 1fr 1.5fr 1fr 1fr 1fr; align-items: center; transition: all 0.2s;">
                    <div style="font-weight: 700; color: #22c55e;">${sol.numero_solicitud}</div>
                    <div>${nombre}</div>
                    <div style="text-align: center;">
                        <span class="badge-status ${cfg.cls}">${cfg.label}</span>
                    </div>
                    <div style="color:#a8a29e;">${fecha}</div>
                    <div style="text-align: center;">
                        <a href="director-detail.html?id=${sol.id}&modo=historial"
                           style="
                               background: rgba(255,255,255,0.05);
                               color: white;
                               padding: 6px 16px;
                               border-radius: 8px;
                               text-decoration: none;
                               font-size: 0.85rem;
                               font-weight: 600;
                               border: 1px solid rgba(255,255,255,0.1);
                               display: inline-block;
                           ">
                            Ver Detalles →
                        </a>
                    </div>
                </div>`;
            }).join('');
        };

        // Lógica de Filtrado Combinado
        const aplicarFiltros = () => {
            const textoBusqueda = searchInput.value.toLowerCase().trim();
            const fechaSeleccionada = dateInput.value; // Formato YYYY-MM-DD

            const filtradas = solicitudesOriginales.filter(sol => {
                // Filtro 1: Texto (Identificación o Nombre)
                const cumpleTexto = (sol.identificacion || '').toLowerCase().includes(textoBusqueda) || 
                                    (sol.nombres || '').toLowerCase().includes(textoBusqueda) ||
                                    (sol.apellidos || '').toLowerCase().includes(textoBusqueda) ||
                                    (sol.numero_solicitud || '').toLowerCase().includes(textoBusqueda);
                
                // Filtro 2: Fecha Exacta
                let cumpleFecha = true;
                if (fechaSeleccionada) {
                    const dataDate = sol.fecha_creacion.substring(0, 10);
                    cumpleFecha = (dataDate === fechaSeleccionada);
                }

                return cumpleTexto && cumpleFecha;
            });

            renderHistorial(filtradas);
        };

        // Escucha de Eventos en Tiempo Real
        if (searchInput) searchInput.addEventListener('input', aplicarFiltros);
        if (dateInput) dateInput.addEventListener('change', aplicarFiltros);

        // Renderización inicial
        renderHistorial(solicitudesOriginales);
    })
    .catch(err => {
        console.error(err);
        document.getElementById('historialBody').innerHTML = `
        <div style="color:#ef4444; padding:40px; text-align:center;">
            ⚠️ Error al cargar el historial. Verifica tu sesión.
        </div>`;
    });
