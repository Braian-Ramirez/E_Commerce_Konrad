document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    console.log("Iniciando carga de solicitudes con token:", token.substring(0, 10) + "...");

    fetch('http://127.0.0.1:8000/api/v1/vendors/solicitudes/', {
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
        const solicitudes = Array.isArray(data) ? data : (data.results || []);
        
        const container = document.getElementById('solicitudesContainer');
        container.innerHTML = ''; // ¡Aquí borramos los datos quemados!

        if (solicitudes.length === 0) {
            container.innerHTML = '<div style="color: white; padding: 20px;">No hay solicitudes pendientes.</div>';
            return;
        }

        solicitudes.forEach(sol => {
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
    })
    .catch(err => {
        console.error("Error cargando solicitudes:", err);
    });
});
