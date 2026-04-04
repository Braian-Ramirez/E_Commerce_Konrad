const token = localStorage.getItem('access_token');

// Colores y etiquetas por estado
const ESTADO_CONFIG = {
    'APROBADA': { label: 'Aprobada', bg: '#16a34a', color: 'white' },
    'RECHAZADA': { label: 'Rechazada', bg: '#dc2626', color: 'white' },
    'DEVUELTA': { label: 'Devuelta', bg: '#ea580c', color: 'white' },
};

fetch('http://127.0.0.1:8000/api/v1/directors/solicitudes/historial/', {
    headers: { 'Authorization': `Bearer ${token}` }
})
    .then(res => {
        if (!res.ok) throw new Error('No autorizado');
        return res.json();
    })
    .then(solicitudes => {
        const tbody = document.getElementById('historialBody');

        if (solicitudes.length === 0) {
            tbody.innerHTML = `
            <tr>
                <td colspan="5" style="padding:40px; text-align:center; color:#a8a29e;">
                    📭 No hay solicitudes procesadas aún.
                </td>
            </tr>`;
            return;
        }

        tbody.innerHTML = solicitudes.map(sol => {
            const cfg = ESTADO_CONFIG[sol.estado] || { label: sol.estado, bg: '#6b7280', color: 'white' };
            const fecha = new Date(sol.fecha_creacion).toLocaleDateString('es-CO', {
                day: '2-digit', month: 'short', year: 'numeric'
            });
            const nombre = sol.persona_detalles
                ? `${sol.persona_detalles.nombre} ${sol.persona_detalles.apellido}`
                : '---';

            return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;"
                onmouseover="this.style.background='rgba(255,255,255,0.03)'"
                onmouseout="this.style.background='transparent'">
                <td style="padding:15px; font-weight:700; color:#22c55e;">${sol.numero_solicitud}</td>
                <td style="padding:15px;">${nombre}</td>
                <td style="padding:15px;">
                    <span style="
                        background: ${cfg.bg};
                        color: ${cfg.color};
                        padding: 4px 14px;
                        border-radius: 20px;
                        font-size: 0.8rem;
                        font-weight: 700;
                    ">${cfg.label}</span>
                </td>
                <td style="padding:15px; color:#a8a29e;">${fecha}</td>
                <td style="padding:15px;">
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
                       ">
                        Ver →
                    </a>
                </td>
            </tr>`;
        }).join('');
    })
    .catch(err => {
        console.error(err);
        document.getElementById('historialBody').innerHTML = `
        <tr>
            <td colspan="5" style="padding:40px; text-align:center; color:#ef4444;">
                ⚠️ Error al cargar el historial. Verifica tu sesión.
            </td>
        </tr>`;
    });
