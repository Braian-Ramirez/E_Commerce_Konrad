document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    const userDataStr = localStorage.getItem('user_data');
    
    if (!token || !userDataStr) {
        window.location.href = '/pages/login.html';
        return;
    }

    try {
        const response = await fetch('http://localhost:8000/api/v1/orders/detalles/mis_ventas/', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.error('Error al obtener ventas');
            return;
        }

        const ventas = await response.json();
        renderSales(ventas);
    } catch (err) {
        console.error('Network error', err);
    }
});

function renderSales(ventas) {
    const tbody = document.getElementById('sales-tbody');
    const totalEl = document.getElementById('total-ganancias');
    
    if (!ventas || ventas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-sales">Aún no tienes ventas registradas.</td></tr>`;
        return;
    }

    let h = '';
    let totalAcumulado = 0;

    ventas.forEach(v => {
        const totalFila = v.cantidad * parseFloat(v.valor_unitario);
        totalAcumulado += totalFila;
        
        const fechaObj = new Date(v.orden_fecha);
        const fechaStr = fechaObj.toLocaleString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        
        let imgUrl = 'https://placehold.co/40x40/0c0f18/white?text=Img';
        if (v.producto_imagen) {
            if (v.producto_imagen.startsWith('http')) {
                imgUrl = v.producto_imagen;
            } else if (v.producto_imagen.startsWith('/media/')) {
                imgUrl = `http://127.0.0.1:8000${v.producto_imagen}`;
            }
        }

        h += `
        <tr>
            <td class="flex-cell">
                <img src="${imgUrl}" class="prod-img-sm" onerror="this.src='https://placehold.co/40x40/0c0f18/white?text=Img'">
                <span>${v.producto_nombre}</span>
            </td>
            <td>${fechaStr}</td>
            <td>${v.comprador_nombre || 'Usuario Konrad'}</td>
            <td>${v.cantidad}</td>
            <td style="font-weight: 700; color: #10b981;">$${totalFila.toLocaleString('es-CO')}</td>
            <td><span class="status-badge status-${v.orden_estado}">${v.orden_estado}</span></td>
        </tr>
        `;
    });

    tbody.innerHTML = h;
    totalEl.textContent = `Total: $${Math.floor(totalAcumulado).toLocaleString('es-CO')}`;
}
