document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // BACKUP: Preservamos carrito y favoritos antes de limpiar la sesión
    const cartB = localStorage.getItem('konrad_cart_v99');
    const favsB = localStorage.getItem('konrad_favs_v99');
    
    localStorage.clear(); 
    
    if (cartB) localStorage.setItem('konrad_cart_v99', cartB);
    if (favsB) localStorage.setItem('konrad_favs_v99', favsB);

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://127.0.0.1:8000/api/v1/login/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: email, password })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error del Servidor:', errorText);
            alert('Error en el login. Revisa tus credenciales.');
            return;
        }

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);
            localStorage.setItem('rol', data.rol);
            localStorage.setItem('user_data', JSON.stringify(data.user || {email: email}));

            // Redirigimos al Dashboard correcto basado en el rol con protección de fallos
            const r = String(data.rol).toUpperCase();
            if (r === 'DIRECTOR_COMERCIAL' || r === 'DIRECTOR' || r === 'ADMIN') {
                window.location.href = 'director-dashboard.html';
            } else if (r === 'VENDEDOR') {
                window.location.href = 'vendor-dashboard.html';
            } else {
                window.location.href = 'buyer-dashboard.html'; // Compradores van a su panel específico
            }
        }
 else {
            alert('Credenciales incorrectas: ' + (data.detail || 'Error de login'));
        }
    } catch (error) {
        console.error('Error en el login:', error);
        alert('Hubo un error al conectar con el servidor.');
    }
});
