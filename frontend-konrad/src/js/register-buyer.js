// Función fuera del try/catch para que sea accesible en todo el scope
function mostrarModal(exito, titulo, mensaje) {
    const modal = document.getElementById('modalResultado');
    document.getElementById('modalIcono').textContent = exito ? '✅' : '❌';
    document.getElementById('modalTitulo').textContent = titulo;
    document.getElementById('modalMensaje').textContent = mensaje;
    const btn = document.getElementById('modalBtn');
    btn.style.background = exito ? '#3b82f6' : '#ef4444';
    btn.style.color = 'white';
    modal.style.display = 'flex';

    btn.onclick = () => {
        modal.style.display = 'none';
        if (exito) window.location.href = 'login.html';
    };
}

document.getElementById('buyerRegisterForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        nombre: document.getElementById('nombre').value,
        apellido: document.getElementById('apellido').value,
        email: document.getElementById('email').value,
        tipo_documento: document.getElementById('tipo_documento').value,
        numero_identificacion: document.getElementById('numero_identificacion').value,
        telefono: document.getElementById('telefono').value,
        pais: document.getElementById('pais').value,
        ciudad: document.getElementById('ciudad').value,
        direccion: document.getElementById('direccion').value,
        twitter: document.getElementById('twitter').value,
        instagram: document.getElementById('instagram').value
    };

    try {
        const response = await fetch('http://localhost:8000/api/v1/buyers/compradores/register/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok) {
            mostrarModal(true, '¡Registro Exitoso!', 'Tus credenciales serán enviadas a tu correo. Ya puedes iniciar sesión.');
        } else {
            const errores = Object.values(data).flat().join(' | ');
            mostrarModal(false, 'Error en el Registro', errores);
        }

    } catch (error) {
        mostrarModal(false, 'Error de Conexión', 'No se pudo conectar con el servidor. Verifica que el backend esté corriendo.');
    }
});
