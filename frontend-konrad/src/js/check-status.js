document.getElementById('statusForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const queryInput = document.getElementById('queryInput').value.trim();
    const resultArea = document.getElementById('resultArea');
    const statusText = document.getElementById('statusText');
    const statusBadge = document.getElementById('statusBadge');
    const vendedorNombre = document.getElementById('vendedorNombre');
    const fechaRegistro = document.getElementById('fechaRegistro');

    // 1. Lógica para decidir el parámetro (Radicado o ID)
    let url = 'http://localhost:8000/api/v1/vendors/solicitudes/consultar-estado/';
    if (queryInput.toUpperCase().startsWith('RAD-')) {
        url += `?radicado=${queryInput}`;
    } else {
        url += `?identificacion=${queryInput}`;
    }

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            // 2. Mostrar datos y estilizar según el estado
            resultArea.style.display = 'block';
            statusText.textContent = data.estado;
            statusBadge.textContent = data.numero_radicado;
            vendedorNombre.textContent = data.nombre;
            fechaRegistro.textContent = data.fecha;

            // 3. Colores dinámicos para feedback visual rápido
            switch (data.estado.toUpperCase()) {
                case 'APROBADA':
                    statusBadge.style.background = '#22c55e'; // Verde
                    statusBadge.style.color = 'white';
                    break;
                case 'RECHAZADA':
                    statusBadge.style.background = '#ef4444'; // Rojo
                    statusBadge.style.color = 'white';
                    break;
                default:
                    statusBadge.style.background = '#f97316'; // Naranja Konrad (Pendiente)
                    statusBadge.style.color = 'white';
            }

            // Animación suave de entrada
            resultArea.animate([
                { opacity: 0, transform: 'translateY(10px)' },
                { opacity: 1, transform: 'translateY(0)' }
            ], { duration: 400 });

        } else {
            alert(data.error || "No se encontró información de tu solicitud.");
            resultArea.style.display = 'none';
        }
    } catch (error) {
        console.error(error);
        alert("Ocurrió un error al conectar con el servidor.");
    }
});
