// auth-guard.js
document.addEventListener('DOMContentLoaded', () => {
    const rol = localStorage.getItem('rol');
    const path = window.location.pathname;

    if (path.includes('director-dashboard.html') || path.includes('director-detail.html')) {
        if (rol !== 'DIRECTOR_COMERCIAL' && rol !== 'ADMIN') {
            window.location.href = '../index.html';
        }
    }

    if (path.includes('vendor-dashboard.html')) {
        if (rol !== 'VENDEDOR') {
            window.location.href = '../index.html';
        }
    }

    // Si intenta entrar a Perfil/Compras sin estar logueado
    const privatePages = ['profile.html', 'my-orders.html', 'payment-methods.html'];
    if (privatePages.some(pp => path.includes(pp))) {
        if (!localStorage.getItem('access_token')) {
            window.location.href = 'login.html';
        }
    }
});
