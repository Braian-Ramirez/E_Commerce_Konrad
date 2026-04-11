document.getElementById('vendorRegisterForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData();

    // 1. Datos de Persona (Singular)
    formData.append('nombre', document.getElementById('nombre').value);
    formData.append('apellido', document.getElementById('apellido').value);
    formData.append('email', document.getElementById('email').value);
    formData.append('tipo_documento', document.getElementById('tipo_documento').value);
    formData.append('numero_identificacion', document.getElementById('numero_identificacion').value);
    formData.append('telefono', document.getElementById('telefono').value);
    formData.append('pais', document.getElementById('pais').value);
    formData.append('ciudad', document.getElementById('ciudad').value);
    formData.append('direccion', document.getElementById('direccion').value);
    formData.append('tipo_persona', document.getElementById('tipo_persona').value);

    // 2. Los 5 archivos individuales (Cambiamos el loop viejo por esto)
    formData.append('doc_cedula', document.getElementById('doc_cedula').files[0]);
    formData.append('doc_rut', document.getElementById('doc_rut').files[0]);
    formData.append('doc_camara', document.getElementById('doc_camara').files[0]);
    formData.append('doc_riesgo', document.getElementById('doc_riesgo').files[0]);
    formData.append('doc_datos', document.getElementById('doc_datos').files[0]);

    try {
        const response = await fetch('http://localhost:8000/api/v1/vendors/solicitudes/register_vendor/', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            mostrarModal(true, '¡Solicitud Recibida!', 'Tu registro se ha guardado y pasará a revisión técnica.', data.numero_radicado);
        } else {
            console.error(data);
            mostrarModal(false, 'Error en el Registro', 'Hubo un problema al subir tus documentos. Revisa que todos estén adjuntos.');
        }
    } catch (error) {
        console.error(error);
        mostrarModal(false, 'Error Crítico', 'No se pudo conectar con el servidor.');
    }
});

function mostrarModal(exito, titulo, mensaje, radicado = null) {
    const modal = document.getElementById('modalResultado');
    document.getElementById('modalIcono').textContent = exito ? '📩' : '❌';
    document.getElementById('modalTitulo').textContent = titulo;
    document.getElementById('modalMensaje').textContent = mensaje;

    const radBox = document.getElementById('radicadoBox');
    if (radicado) {
        document.getElementById('numRadicado').textContent = radicado;
        radBox.style.display = 'block';
    } else {
        radBox.style.display = 'none';
    }

    const btn = document.getElementById('modalBtn');
    btn.style.background = exito ? '#f97316' : '#ef4444';
    btn.style.color = 'white';
    modal.style.display = 'flex';

    btn.onclick = () => {
        modal.style.display = 'none';
        if (exito) window.location.href = 'index.html';
    };
}
