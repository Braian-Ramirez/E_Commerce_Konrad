// Array temporal con MOCKS de productos para mostrar el diseño
// Más adelante conectaremos esto al endpoint: http://localhost:8000/api/v1/products/
const mockProducts = [
  {
    id: 1,
    nombre: "MacBook Pro M3 Max",
    precio: 14500000,
    categoria: "Tecnología",
    img: "💻", // Usamos un emoji temporalmente mientras conectamos las imágenes
    vendedor: "TechCorp"
  },
  {
    id: 2,
    nombre: "Auriculares Sony WH-1000XM5",
    precio: 1800000,
    categoria: "Tecnología",
    img: "🎧",
    vendedor: "AudioManiacs"
  },
  {
    id: 3,
    nombre: "Silla Ergonomica Herman Miller",
    precio: 5200000,
    categoria: "Hogar",
    img: "🪑",
    vendedor: "OfficePremium"
  },
  {
    id: 4,
    nombre: "iPhone 15 Pro",
    precio: 4800000,
    categoria: "Tecnología",
    img: "📱",
    vendedor: "TechCorp"
  }
];

let carritoItems = 0;

// Inicializador principal
document.addEventListener("DOMContentLoaded", () => {
  renderProductGrid(mockProducts);
});

// Función creadora (Componente visual) de tarjetas de producto
function renderProductGrid(products) {
  const grid = document.getElementById("productGrid");
  
  // Limpiamos el loader 
  grid.innerHTML = '';

  products.forEach(product => {
    // Formateador de moneda (COP)
    const precioFormat = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(product.precio);

    // Creamos la "Tarjeta (Card)" con efecto de cristal
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <div class="product-image" style="display: flex; justify-content: center; align-items: center; font-size: 5rem;">
        ${product.img}
      </div>
      <div class="product-badge" style="font-size: 0.8rem; color: var(--secondary); margin-bottom: 5px; font-weight: bold;">
        ${product.categoria}
      </div>
      <h4 class="product-title">${product.nombre}</h4>
      <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 15px;">Vendido por: ${product.vendedor}</p>
      <div class="product-price">${precioFormat} <span>COP</span></div>
      <button class="add-cart-btn" onclick="addToCart(${product.id})">Añadir al Carrito</button>
    `;
    grid.appendChild(card);
  });
}

// Hacer la función de carrito global para el onClick del HTML
window.addToCart = (productId) => {
  carritoItems++;
  // Resaltamos visualmente el indicador del navbar
  const badge = document.getElementById("cartCount");
  badge.textContent = carritoItems;
  
  // Pequeña animación pop al añadir
  badge.style.transform = "scale(1.5)";
  badge.style.background = "var(--secondary)";
  badge.style.color = "white";
  
  setTimeout(() => {
    badge.style.transform = "scale(1)";
    badge.style.background = "white";
    badge.style.color = "var(--bg-dark)";
  }, 200);
};
