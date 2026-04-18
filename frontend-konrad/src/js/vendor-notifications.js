/**
 * VENDOR NOTIFICATIONS CONTROLLER
 */

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Inyectar el HTML de la campana en el header del vendor si no existe
    const userInfo = document.querySelector('.user-info');
    if (userInfo && !document.getElementById('btnNotificaciones')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'notif-wrapper';
        wrapper.style.marginRight = '20px';
        wrapper.innerHTML = `
            <button id="btnNotificaciones" class="notif-bell-btn">
                🔔
                <span id="notifCount" class="notif-badge" style="display:none;">0</span>
            </button>
            <div id="notifDropdown" class="notif-dropdown">
                <div class="notif-header">
                    <h4>Notificaciones</h4>
                </div>
                <div id="notifList" class="notif-list"></div>
            </div>
        `;
        userInfo.prepend(wrapper);
    }

    const btnNotif = document.getElementById('btnNotificaciones');
    const dropdownNotif = document.getElementById('notifDropdown');
    const notifCount = document.getElementById('notifCount');
    const notifList = document.getElementById('notifList');

    if (!btnNotif || !dropdownNotif) return;

    document.addEventListener('click', (e) => {
        if (!btnNotif.contains(e.target) && !dropdownNotif.contains(e.target)) {
            dropdownNotif.classList.remove('show');
        }
    });

    const cargarNotificaciones = () => {
        fetch('http://127.0.0.1:8000/api/v1/notifications/notificaciones/', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            const listado = Array.isArray(data) ? data : (data.results || []);
            const noLeidas = listado.filter(n => !n.leida).length;

            if (noLeidas > 0) {
                notifCount.textContent = noLeidas;
                notifCount.style.display = 'flex';
            } else {
                notifCount.style.display = 'none';
            }

            if (listado.length === 0) {
                notifList.innerHTML = '<div class="notif-empty">No hay notificaciones.</div>';
                return;
            }

            notifList.innerHTML = listado.map(n => `
                <div class="notif-item ${n.leida ? '' : 'unread'}" onclick="marcarComoLeida(${n.id})">
                    <div class="notif-item-title">${n.tipo.replace('_', ' ')}</div>
                    <div class="notif-item-msg">${n.mensaje}</div>
                    <div class="notif-item-date">${new Date(n.fecha_creacion).toLocaleString()}</div>
                </div>
            `).join('');
        })
        .catch(err => console.error("Error cargando notificaciones:", err));
    };

    window.marcarComoLeida = (id) => {
        fetch(`http://127.0.0.1:8000/api/v1/notifications/notificaciones/${id}/marcar-leida/`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(() => cargarNotificaciones())
        .catch(err => console.error("Error al marcar como leída:", err));
    };

    btnNotif.onclick = (e) => {
        e.stopPropagation();
        dropdownNotif.classList.toggle('show');
        if (dropdownNotif.classList.contains('show')) cargarNotificaciones();
    };

    cargarNotificaciones();
});
