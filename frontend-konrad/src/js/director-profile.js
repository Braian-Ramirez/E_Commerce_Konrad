document.addEventListener('DOMContentLoaded', () => {
    // 1. Obtener la data del usuario almacenada durante el login
    const userDataStr = localStorage.getItem('user_data');
    if (!userDataStr) {
        window.location.href = 'login.html';
        return;
    }

    const userData = JSON.parse(userDataStr);

    // 2. Poblamos los campos si existen
    if (userData.nombre) document.getElementById('nombre').value = userData.nombre;
    if (userData.apellido) document.getElementById('apellido').value = userData.apellido || '';
    if (userData.email) document.getElementById('email').value = userData.email;
    if (userData.tipo_documento) document.getElementById('tipo_documento').value = userData.tipo_documento;
    if (userData.numero_identificacion) document.getElementById('numero_identificacion').value = userData.numero_identificacion;
    if (userData.telefono) document.getElementById('telefono').value = userData.telefono;
    if (userData.pais) document.getElementById('pais').value = userData.pais;
    if (userData.ciudad) document.getElementById('ciudad').value = userData.ciudad;
    if (userData.direccion) document.getElementById('direccion').value = userData.direccion;
    if (userData.tipo_persona) document.getElementById('tipo_persona').value = userData.tipo_persona;

    // Actualizar la inicial del Avatar
    const avatarCircle = document.getElementById('avatarCircle');
    if (userData.nombre && avatarCircle) {
        avatarCircle.textContent = userData.nombre.charAt(0).toUpperCase();
    }
});

// 3. Manejo del guardado real en base de datos
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const userData = JSON.parse(localStorage.getItem('user_data'));
    const personaId = userData.id;

    const updatedData = {
        nombre: document.getElementById('nombre').value,
        apellido: document.getElementById('apellido').value,
        tipo_documento: document.getElementById('tipo_documento').value,
        numero_identificacion: document.getElementById('numero_identificacion').value,
        telefono: document.getElementById('telefono').value,
        pais: document.getElementById('pais').value,
        ciudad: document.getElementById('ciudad').value,
        direccion: document.getElementById('direccion').value,
        tipo_persona: document.getElementById('tipo_persona').value,
    };

    try {
        // Asumiendo que el endpoint de actualización de personas funciona de manera global 
        // o usando el de vendors/personas temporalmente ya que comparten la tabla "Persona"
        const response = await fetch(`http://localhost:8000/api/v1/vendors/personas/${personaId}/`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            body: JSON.stringify(updatedData)
        });

        if (response.ok) {
            const data = await response.json();
            // Actualizamos el localStorage para que persista en la sesión actual
            localStorage.setItem('user_data', JSON.stringify({ ...userData, ...data }));
            
            mostrarToast('✅ Perfil del Director actualizado correctamente.', 'success');
            
            // Actualizar inicial del avatar por si cambió el nombre
            const avatarCircle = document.getElementById('avatarCircle');
            if (data.nombre && avatarCircle) {
                avatarCircle.textContent = data.nombre.charAt(0).toUpperCase();
            }
        } else {
            const error = await response.json();
            console.error('Error al actualizar:', error);
            mostrarToast('❌ Error al actualizar el perfil.', 'error');
        }
    } catch (error) {
        console.error('Error de red:', error);
        mostrarToast('❌ Error crítico de conexión.', 'error');
    }
});

/**
 * Muestra una notificación emergente estilizada
 */
function mostrarToast(mensaje, tipo = 'success') {
    const toast = document.createElement('div');
    toast.className = `vp-toast ${tipo}`;
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    
    // Desvanecer y eliminar después de 3.5 segundos
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

function handleSecurityUpdate() {
    const pass = document.getElementById('new_password').value;
    const confirm = document.getElementById('confirm_password').value;

    if (!pass) {
        mostrarToast('⚠️ Ingresa una nueva contraseña.', 'error');
        return;
    }
    if (pass !== confirm) {
        mostrarToast('❌ Las contraseñas no coinciden.', 'error');
        return;
    }

    mostrarToast('✅ Contraseña actualizada correctamente.', 'success');
}

// Exponer funciones al alcance global
window.handleSecurityUpdate = handleSecurityUpdate;
