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

    // 3. CONSULTAR DATACRÉDITO (MOCK)
    const btnDatacredito = document.getElementById('btnDatacredito');
    const modalMock = document.getElementById('modalMock');

    btnDatacredito.addEventListener('click', async () => {
        btnDatacredito.textContent = "Consultando... ⏳";
        btnDatacredito.disabled = true;

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/v1/vendors/solicitudes/${solId}/mock_datacredito/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();

                // Rellenamos el Modal con los datos del Mock
                document.getElementById('mockScore').textContent = data.score_datacredito;
                document.getElementById('mockCalificacion').textContent = data.calificacion;
                document.getElementById('mockTitle').textContent = "DATACRÉDITO (EXPERIAN)";

                // Ajustamos colores según la calificación
                const califEl = document.getElementById('mockCalificacion');
                const scoreEl = document.getElementById('mockScore');
                const iconEl = document.getElementById('mockIcon');

                if (data.calificacion === 'ALTA') {
                    califEl.style.color = '#22c55e'; // Verde
                    iconEl.textContent = "📈";
                } else if (data.calificacion === 'ADVERTENCIA') {
                    califEl.style.color = '#f97316'; // Naranja
                    iconEl.textContent = "⚠️";
                } else {
                    califEl.style.color = '#ef4444'; // Rojo
                    iconEl.textContent = "📉";
                }

                // Mostramos el modal
                modalMock.style.display = 'flex';

            } else {
                alert("Error en el servidor al consultar Datacredito");
            }
        } catch (error) {
            console.error(error);
            alert("No se pudo conectar con el Mock de Datacredito");
        } finally {
            btnDatacredito.textContent = "Consultar Datacredito";
            btnDatacredito.disabled = false;
        }
    });

    // 4. CONSULTAR CIFIN (MOCK)
    const btnCifin = document.getElementById('btnCifin');

    btnCifin.addEventListener('click', async () => {
        btnCifin.textContent = "Consultando... ⏳";
        btnCifin.disabled = true;

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/v1/vendors/solicitudes/${solId}/mock_cifin/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();

                // Rellenamos el Modal con los datos del Mock
                document.getElementById('mockScore').textContent = data.score_cifin;
                document.getElementById('mockCalificacion').textContent = data.calificacion;
                document.getElementById('mockTitle').textContent = "CIFIN (TRANSUNION)";

                // Ajustamos colores según la calificación
                const califEl = document.getElementById('mockCalificacion');
                const scoreEl = document.getElementById('mockScore');
                const iconEl = document.getElementById('mockIcon');

                if (data.calificacion === 'ALTA') {
                    califEl.style.color = '#22c55e'; // Verde
                    iconEl.textContent = "📈";
                } else if (data.calificacion === 'ADVERTENCIA') {
                    califEl.style.color = '#f97316'; // Naranja
                    iconEl.textContent = "⚠️";
                } else {
                    califEl.style.color = '#ef4444'; // Rojo
                    iconEl.textContent = "📉";
                }

                // Mostramos el modal
                modalMock.style.display = 'flex';

            } else {
                alert("Error en el servidor al consultar CIFIN");
            }
        } catch (error) {
            console.error(error);
            alert("No se pudo conectar con el Mock de CIFIN");
        } finally {
            btnCifin.textContent = "Consultar CIFIN";
            btnCifin.disabled = false;
        }
    });
    // 5. SIMULADOR POLICÍA (ANTECEDENTES)
    const btnPolicia = document.getElementById('btnPolicia');
    const modalPolicia = document.getElementById('modalPolicia');

    // Abre el modal y reinicia la vista
    btnPolicia.addEventListener('click', () => {
        document.getElementById('policiaSearchArea').style.display = 'block';
        document.getElementById('policiaResultArea').style.display = 'none';
        document.getElementById('inputCedulaPolicia').value = ''; // Limpiar el input
        modalPolicia.style.display = 'flex';
    });

    // Realiza la búsqueda "institucional"
    document.getElementById('btnEjecutarBusquedaPolicia').addEventListener('click', async () => {
        const cedula = document.getElementById('inputCedulaPolicia').value;
        if (!cedula) { alert("Debe ingresar una cédula"); return; }

        const btnBusqueda = document.getElementById('btnEjecutarBusquedaPolicia');
        btnBusqueda.textContent = "Buscando en Base de Datos... ⚖️";
        btnBusqueda.disabled = true;

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/v1/vendors/solicitudes/${solId}/consultar-antecedentes/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ numero_identificacion: cedula })
            });

            if (res.ok) {
                const data = await res.json();

                // 1. Ocultar el formulario y mostrar certificado
                document.getElementById('policiaSearchArea').style.display = 'none';
                document.getElementById('policiaResultArea').style.display = 'block';

                // 2. Rellenar datos del "Certificado"
                document.getElementById('certId').textContent = Math.floor(Math.random() * 900000) + 100000;
                document.getElementById('certNombre').textContent = `Persona Identificada: ${cedula}`;

                const certStatus = document.getElementById('certStatus');
                certStatus.textContent = data.estado === "NO_REQUERIDO" ? "LIBRE DE ANTECEDENTES ✅" : "REQUERIDO POR LA JUSTICIA ⚠️";

                // Colores institucionales
                certStatus.style.background = data.estado === "NO_REQUERIDO" ? "#dcfce7" : "#fee2e2";
                certStatus.style.color = data.estado === "NO_REQUERIDO" ? "#166534" : "#991b1b";

            } else {
                alert("Error al conectar con el servidor de la Policía.");
            }
        } catch (error) {
            console.error(error);
            alert("Falla técnica en la consulta judicial.");
        } finally {
            btnBusqueda.textContent = "GENERAR CERTIFICADO ⚖️";
            btnBusqueda.disabled = false;
        }
    });

});