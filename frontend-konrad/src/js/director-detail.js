document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = 'login.html'; return; }

    const urlParams = new URLSearchParams(window.location.search);
    const solId = urlParams.get('id');

    if (!solId) {
        alert("ID de solicitud no encontrado en la URL");
        return;
    }

    // 1. CARGAR DATOS DE LA SOLICITUD
    fetch(`http://127.0.0.1:8000/api/v1/vendors/solicitudes/${solId}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
        if (!res.ok) throw new Error("Error al cargar detalle");
        return res.json();
    })
    .then(sol => {
        console.log("Detalle de solicitud cargado:", sol);
        
        // Rellenar los campos con los datos REALES
        document.getElementById('radicadoTitle').textContent = sol.numero_solicitud || 'SIN RADICADO';
        document.getElementById('v_nombres').textContent = sol.nombres || 'No disponible';
        document.getElementById('v_apellidos').textContent = sol.apellidos || 'No disponible';
        document.getElementById('v_email').textContent = sol.email || 'No disponible';
        document.getElementById('v_id').textContent = sol.identificacion || 'No disponible';
        document.getElementById('v_telefono').textContent = sol.telefono || 'N/A';
        document.getElementById('v_estado').textContent = sol.estado;

        // Color del estado
        const estadoEl = document.getElementById('v_estado');
        if (sol.estado === 'PENDIENTE') estadoEl.style.color = '#f97316';
        if (sol.estado === 'APROBADA') estadoEl.style.color = '#22c55e';
    })
    .catch(err => console.error(err));

    // 2. LOGICA DE BOTONES (APROBAR / RECHAZAR)
    const updateEstado = async (nuevoEstado) => {
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/v1/vendors/solicitudes/${solId}/cambiar-estado/`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({ estado: nuevoEstado })
            });

            if (res.ok) {
                alert(`¡Estado actualizado exitosamente! La solicitud ahora está: ${nuevoEstado}`);
                window.location.href = 'director-dashboard.html';
            } else {
                const error = await res.json();
                alert('Error: ' + JSON.stringify(error));
            }
        } catch (error) {
            console.error("Error en PATCH:", error);
            alert("No se pudo conectar con el servidor.");
        }
    };

    document.getElementById('btnAprobar').addEventListener('click', () => updateEstado('APROBADA'));
    document.getElementById('btnDevolver').addEventListener('click', () => updateEstado('DEVUELTA'));
    document.getElementById('btnRechazar').addEventListener('click', () => updateEstado('RECHAZADA'));
});
