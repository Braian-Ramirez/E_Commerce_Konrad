document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Suponiendo que tus inputs tienen los IDs: email y password
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('http://127.0.0.1:8000/api/v1/login/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: email, password })
        });

        // Si la respuesta no es OK, leemos el texto para ver el error de Django
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error del Servidor:', errorText);
            alert('Error en el login. Revisa la consola para más detalles.');
            return;
        }

        const data = await response.json();

        if (response.ok) {
            // Guardamos los tokens en el navegador
            localStorage.setItem('access_token', data.access);
            localStorage.setItem('refresh_token', data.refresh);

            // Redirigimos al Dashboard
            window.location.href = 'director-dashboard.html';
        } else {
            alert('Credenciales incorrectas: ' + (data.detail || 'Error de login'));
        }
    } catch (error) {
        console.error('Error en el login:', error);
        alert('Hubo un error al conectar con el servidor.');
    }
});
