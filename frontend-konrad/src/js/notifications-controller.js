/**
 * NOTIFICATIONS CONTROLLER
 * Maneja la lógica de la campana y el listado de notificaciones 
 * de forma global para todo el panel del Director Comercial.
 */

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    const apiBase = 'http://127.0.0.1:8000/api/v1/notifications/notificaciones/';
    
    if (!token) return;

    const btnNotif = document.getElementById('btnNotificaciones');
    const dropdownNotif = document.getElementById('notifDropdown');
    const notifCount = document.getElementById('notifCount');
    const notifList = document.getElementById('notifList');

    if (!btnNotif || !dropdownNotif) return;

    // 1. Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!btnNotif.contains(e.target) && !dropdownNotif.contains(e.target)) {
            dropdownNotif.style.display = 'none';
        }
    });

    // 2. Función de Carga
    const cargarNotificaciones = () => {
        fetch(apiBase, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            const listado = Array.isArray(data) ? data : (data.results || []);
            const noLeidas = listado.filter(n => !n.leida).length;

            // Actualizar Contador
            if (noLeidas > 0) {
                notifCount.textContent = noLeidas;
                notifCount.style.display = 'block';
            } else {
                notifCount.style.display = 'none';
            }

            // Actualizar Lista Visual
            if (listado.length === 0) {
                notifList.innerHTML = '<div style="padding: 20px; text-align: center; color: #a8a29e; font-size: 0.8rem;">No tienes notificaciones.</div>';
                return;
            }

            notifList.innerHTML = listado.map(n => `
                <div class="notif-item" onclick="marcarComoLeida(${n.id})" style="padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.02); cursor: pointer; background: ${n.leida ? 'transparent' : 'rgba(34, 197, 94, 0.05)'}; transition: 0.3s; text-align: left;">
                    <div style="font-size: 0.8rem; font-weight: 800; color: ${n.leida ? '#a8a29e' : '#22c55e'}; margin-bottom: 3px;">
                        ${n.tipo} ${!n.leida ? '🔵' : ''}
                    </div>
                    <div style="font-size: 0.85rem; color: white; line-height: 1.4;">${n.mensaje}</div>
                    <div style="font-size: 0.7rem; color: #78716c; margin-top: 5px;">${new Date(n.fecha_creacion).toLocaleString()}</div>
                </div>
            `).join('');
        })
        .catch(err => console.error("Error cargando notificaciones:", err));
    };

    // 3. Marcar como leída
    window.marcarComoLeida = (id) => {
        fetch(`${apiBase}${id}/marcar-leida/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(() => cargarNotificaciones())
        .catch(err => console.error("Error al marcar como leída:", err));
    };

    // 4. Evento Click Campana
    btnNotif.onclick = () => {
        const isVisible = dropdownNotif.style.display === 'block';
        dropdownNotif.style.display = isVisible ? 'none' : 'block';
        if (!isVisible) cargarNotificaciones();
    };

    // Carga inicial silencia del contador
    cargarNotificaciones();
});
