document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    console.log("Iniciando carga de solicitudes con token:", token.substring(0, 10) + "...");

    fetch('http://127.0.0.1:8000/api/v1/directors/solicitudes/', {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => {
            if (!res.ok) {
                if (res.status === 401) {
                    console.error("Token expirado o inválido");
                    localStorage.removeItem('access_token');
                    window.location.href = 'login.html';
                }
                throw new Error(`Error HTTP: ${res.status}`);
            }
            return res.json();
        })
        .then(data => {
            console.log("Datos recibidos del servidor:", data);

            // Manejamos si Django envía una lista directa o un objeto paginado {results: [...]}
            let solicitudes = Array.isArray(data) ? data : (data.results || []);

            // --- ESTADO GLOBAL ---
            let solicitudesOriginales = Array.isArray(data) ? data : (data.results || []);
            let solicitudesPendientes = solicitudesOriginales.filter(sol => sol.estado === 'PENDIENTE');

            const container = document.getElementById('solicitudesContainer');
            const searchInput = document.getElementById('searchInput');
            const dateInput = document.getElementById('dateInput');

            // Función para dibujar en pantalla
            const renderSolicitudes = (datos) => {
                container.innerHTML = '';

                if (datos.length === 0) {
                    container.innerHTML = '<div style="color: white; padding: 20px;">No hay solicitudes que coincidan.</div>';
                    return;
                }

                datos.forEach(sol => {
                    container.innerHTML += `
                    <div class="solicitud-card" onclick="window.location.href='director-detail.html?id=${sol.id}'" style="cursor:pointer;">
                        <div style="font-weight: 600;">${sol.identificacion}</div>
                        <div>${sol.apellidos} ${sol.nombres}</div>
                        <div style="color: #a8a29e;">${sol.email}</div>
                        <div style="text-align: center;">
                            <span class="badge-status status-pendiente">${sol.estado}</span>
                        </div>
                        <div style="font-size: 0.9rem; opacity: 0.8;">${new Date(sol.fecha_creacion).toLocaleDateString()}</div>
                    </div>
                `;
                });
            };

            // Lógica de Filtrado Combinado
            const aplicarFiltros = () => {
                const textoBusqueda = searchInput.value.toLowerCase().trim();
                const fechaSeleccionada = dateInput.value; // Formato YYYY-MM-DD

                const filtradas = solicitudesPendientes.filter(sol => {
                    // Filtro 1: Texto (Identificación o Nombre)
                    const cumpleTexto = (sol.identificacion || '').toLowerCase().includes(textoBusqueda) ||
                        (sol.nombres || '').toLowerCase().includes(textoBusqueda) ||
                        (sol.apellidos || '').toLowerCase().includes(textoBusqueda);

                    // Filtro 2: Fecha Exacta
                    let cumpleFecha = true;
                    if (fechaSeleccionada) {
                        // Prevenir bugs de offset de zona horaria (UTC vs Local) extrayendo el substring directo de BD
                        const dataDate = sol.fecha_creacion.substring(0, 10); // Ej: "2026-04-03"
                        cumpleFecha = (dataDate === fechaSeleccionada);
                    }

                    return cumpleTexto && cumpleFecha;
                });

                renderSolicitudes(filtradas);
            };

            // Escucha de Eventos en Tiempo Real
            if (searchInput) searchInput.addEventListener('input', aplicarFiltros);
            if (dateInput) dateInput.addEventListener('change', aplicarFiltros);

            // Primera renderización
            renderSolicitudes(solicitudesPendientes);
        })
        .catch(err => {
            console.error("Error cargando solicitudes:", err);
        });
});
