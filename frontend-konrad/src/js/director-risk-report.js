document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('access_token');
    if (!token) { window.location.href = 'login.html'; return; }

    const urlParams = new URLSearchParams(window.location.search);
    const solId = urlParams.get('id');
    const modoHistorial = urlParams.get('modo') === 'historial';

    if (!solId) {
        alert("ID de solicitud no encontrado en la URL");
        return;
    }

    // Botón de Volver pasa el modo si existe
    const backUrl = modoHistorial ? `director-detail.html?id=${solId}&modo=historial` : `director-detail.html?id=${solId}`;
    document.getElementById('btnBack').href = backUrl;

    // --- MODO SOLO LECTURA ---
    if (modoHistorial) {
        const btnContainer = document.querySelector('.decision-row');
        if (btnContainer) btnContainer.style.display = 'none';
        
        ['btnAprobar', 'btnDevolver', 'btnRechazar'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
    }

    // CARGAR DATOS COMPLETOS DE RIESGO
    fetch(`http://127.0.0.1:8000/api/v1/directors/solicitudes/${solId}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(res => res.json())
        .then(sol => {
            console.log("Datos de riesgo cargados:", sol);

            // 1. Cabecera
            document.getElementById('v_nombre_completo').textContent = `${sol.nombres} ${sol.apellidos}`;
            document.getElementById('v_radicado').textContent = sol.numero_solicitud;

            // 2. Scores y Dictámenes (Credit Data LOCAL)
            const d = sol.credit_data;
            if (d) {
                document.getElementById('score_datacredito').textContent = d.score_datacredito || 'N/A';
                document.getElementById('score_cifin').textContent = d.score_cifin || 'N/A';

                const dictDatacredito = document.getElementById('dictamen_datacredito');
                dictDatacredito.textContent = d.dictamen_datacredito || 'PENDIENTE';
                setColorResult(dictDatacredito, d.dictamen_datacredito);

                const dictCifin = document.getElementById('dictamen_cifin');
                dictCifin.textContent = d.dictamen_cifin || 'PENDIENTE';
                setColorResult(dictCifin, d.dictamen_cifin);

                document.getElementById('fecha_consulta').textContent = d.fecha_consulta ? new Date(d.fecha_consulta).toLocaleString() : '---';
                document.querySelectorAll('.fecha_consulta_cifin').forEach(el => el.textContent = d.fecha_consulta ? new Date(d.fecha_consulta).toLocaleString() : '---');

                if (d.observaciones) {
                    document.getElementById('observaciones_riesgo').textContent = d.observaciones;
                }
            }

            // 3. Resultados de Solicitud (Policía Nacional)
            const judicial = document.getElementById('resultado_judicial');
            judicial.textContent = sol.resultado_judicial === 'NO_REQUERIDO' ? "LIBRE ✅" : (sol.resultado_judicial === 'REQUERIDO' ? "⚠️ ALERTA" : "PENDIENTE ⏳");
            setColorJudicial(judicial, sol.resultado_judicial);

            // 4. Tabla de trazabilidad (Estados globales)
            document.getElementById('res_solicitud_datacredito').textContent = sol.resultado_datacredito;
            document.getElementById('res_solicitud_cifin').textContent = sol.resultado_cifin;

            // Nueva trazabilidad judicial 🚓
            document.getElementById('res_solicitud_judicial').textContent = sol.resultado_judicial;
            document.getElementById('fecha_judicial').textContent = sol.fecha_consulta_judicial ? new Date(sol.fecha_consulta_judicial).toLocaleString() : '---';

            // --- REGLA DE SEGURIDAD: DESHABILITAR BOTONES SI NO ESTÁ PENDIENTE ---
            if (sol.estado !== 'PENDIENTE') {
                console.log("⚠️ Registro no pendiente. Deshabilitando acciones.");
                ['btnAprobar', 'btnDevolver', 'btnRechazar'].forEach(id => {
                    const btn = document.getElementById(id);
                    if (btn) {
                        btn.disabled = true;
                        btn.style.opacity = '0.3';
                        btn.style.cursor = 'not-allowed';
                        btn.style.filter = 'grayscale(1)';
                        btn.title = "Esta solicitud ya tiene una decisión tomada.";
                    }
                });
            }

        })
        .catch(err => console.error(err));

    // -----------------------------------------------------------
    // LÓGICA DE DECISIÓN (APROBAR / DEVOLVER / RECHAZAR)
    // -----------------------------------------------------------

    const updateEstado = async (nuevoEstado) => {
        // Bloqueo adicional por seguridad
        const btn = document.getElementById('btnAprobar');
        if (btn && btn.disabled) return;

        try {
            const res = await fetch(`http://127.0.0.1:8000/api/v1/directors/solicitudes/${solId}/cambiar-estado/`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ estado: nuevoEstado })
            });

            if (res.ok) {
                alert(`¡Decisión registrada! La solicitud ahora está: ${nuevoEstado}`);
                window.location.href = 'director-dashboard.html'; // Volver al inicio
            } else {
                const error = await res.json();
                alert('Error: ' + JSON.stringify(error));
            }
        } catch (error) {
            console.error("Error en PATCH:", error);
            alert("Error crítico al procesar la decisión.");
        }
    };

    document.getElementById('btnAprobar').addEventListener('click', () => updateEstado('APROBADA'));
    document.getElementById('btnDevolver').addEventListener('click', () => updateEstado('DEVUELTA'));
    document.getElementById('btnRechazar').addEventListener('click', () => updateEstado('RECHAZADA'));

});

// Función para colores de los dictámenes crediticios
function setColorResult(el, status) {
    if (status === 'ALTA') {
        el.style.background = '#dcfce7'; el.style.color = '#166534';
    } else if (status === 'ADVERTENCIA') {
        el.style.background = '#fef3c7'; el.style.color = '#92400e';
    } else if (status === 'BAJA') {
        el.style.background = '#fee2e2'; el.style.color = '#991b1b';
    } else {
        el.style.background = '#374151'; el.style.color = '#f3f4f6';
    }
}

// Función para colores judiciales
function setColorJudicial(el, status) {
    if (status === 'NO_REQUERIDO') {
        el.style.background = '#22c55e'; el.style.color = 'white';
    } else if (status === 'REQUERIDO') {
        el.style.background = '#ef4444'; el.style.color = 'white';
    } else {
        el.style.background = '#374151'; el.style.color = '#f3f4f6';
    }
}
