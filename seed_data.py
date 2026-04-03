import os
import django
import random

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecommerce_konrad.settings')
django.setup()

from django.contrib.auth.models import User
from vendors.models import Persona, Vendedor
from products.models import Categoria, Subcategoria, Producto, ComentarioProducto
from orders.models import Orden, DetalleOrden

print("📦 Restaurando Catálogo de Producción (32 Productos Reales + Top 10 + Reseñas)...")

def seed():
    # Purga masiva
    ComentarioProducto.objects.all().delete()
    DetalleOrden.objects.all().delete()
    Orden.objects.all().delete()
    Producto.objects.all().delete()
    Persona.objects.all().delete()

    # Vendedor Maestro
    u_admin, _ = User.objects.get_or_create(username='konrad_admin')
    v_p = Persona.objects.create(
        user=u_admin, nombre='Konrad Shop', apellido='Oficial',
        email='ventas@konradshop.com', numero_identificacion='ID-900800'
    )
    vendedor = Vendedor.objects.create(persona=v_p)

    # Compradores para reviews
    compradores = []
    for i, name in enumerate(['Viviana', 'Andres', 'Paula', 'Juan']):
        u, _ = User.objects.get_or_create(username=f'user_{i}')
        p = Persona.objects.create(
            user=u, nombre=name, apellido='Garcia', 
            email=f'{name.lower()}@mail.com', numero_identificacion=f'ID-100{i}'
        )
        compradores.append(p)

    cat_elec = Categoria.objects.get_or_create(nombre="Tecnología", defaults={'porcentaje_comision': 5.0, 'aplica_iva': True})[0]
    cat_moda = Categoria.objects.get_or_create(nombre="Moda", defaults={'porcentaje_comision': 3.0, 'aplica_iva': True})[0]
    cat_hogar = Categoria.objects.get_or_create(nombre="Hogar", defaults={'porcentaje_comision': 4.0, 'aplica_iva': True})[0]

    sc_pc = Subcategoria.objects.get_or_create(categoria=cat_elec, nombre="Computadores")[0]
    sc_mov = Subcategoria.objects.get_or_create(categoria=cat_elec, nombre="Celulares")[0]
    sc_rop = Subcategoria.objects.get_or_create(categoria=cat_moda, nombre="Ropa")[0]
    sc_dec = Subcategoria.objects.get_or_create(categoria=cat_hogar, nombre="Decoración")[0]

    items = [
        ("MacBook Pro 16 M3 Max", 14500000, "Apple", sc_pc, "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?q=80&w=800"),
        ("iPhone 15 Pro Titanium", 5850000, "Apple", sc_mov, "https://images.unsplash.com/photo-1696446701796-da61225697cc?q=80&w=800"),
        ("Monitor LG Panoramic 34", 1950000, "LG", sc_pc, "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?q=80&w=800"),
        ("PC Gamer Master RGB", 8900000, "Alienware", sc_pc, "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=800"),
        ("Nintendo Switch OLED", 1850000, "Nintendo", sc_mov, "https://images.unsplash.com/photo-1578303035342-841767810c67?q=80&w=800"),
        ("Sony XM5 Noise Cancelling", 1450000, "Sony", sc_mov, "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800"),
        ("PS5 Console Edition V2", 2750000, "Sony", sc_pc, "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=800"),
        ("iPad Pro M2 Artist", 4590000, "Apple", sc_mov, "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=800"),
        ("Apple Watch Ultra 2", 3200000, "Apple", sc_mov, "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800"),
        ("Teclado Keychron K2 RGB", 650000, "Keychron", sc_pc, "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?q=80&w=800"),
        # +22 items más para llegar a 32
        ("Mouse Logitech MX 3S", 450000, "Logitech", sc_pc, "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?q=80&w=800"),
        ("Chaqueta Cuero Dark", 420000, "Zara", sc_rop, "https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?q=80&w=800"),
        ("Tenis Nike Air Red", 380000, "Nike", sc_rop, "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800"),
        ("Gafas RayBan Wayfarer", 590000, "RayBan", sc_rop, "https://images.unsplash.com/photo-1572635196237-14b3f281303f?q=80&w=800"),
        ("Bolso Cuero Artisanal", 720000, "Bosi", sc_rop, "https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=800"),
        ("Reloj Fossil Chrono", 850000, "Fossil", sc_rop, "https://images.unsplash.com/photo-1524592094714-0f0654e20314?q=80&w=800"),
        ("Mochila Adventure 40L", 320000, "Northface", sc_rop, "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800"),
        ("Camisa Formal Sky", 185000, "Arturo Calle", sc_rop, "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800"),
        ("Sombrero Fedora Black", 145000, "Stetson", sc_rop, "https://images.unsplash.com/photo-1514327605112-b887c0e61c0a?q=80&w=800"),
        ("Tenis Adidas White", 295000, "Adidas", sc_rop, "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=800"),
        ("Lámpara Nordik Loft", 285000, "Ikea", sc_dec, "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?q=80&w=800"),
        ("Cafetera Nespresso Lux", 1150000, "Nespresso", sc_dec, "https://images.unsplash.com/photo-1510551310160-589462daf284?q=80&w=800"),
        ("Silla Oficina Ergo", 920000, "Herman Miller", sc_dec, "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?q=80&w=800"),
        ("Cuchillos Damasco Pro", 480000, "Zwilling", sc_dec, "https://images.unsplash.com/photo-1593618998160-e34014e67546?q=80&w=800"),
        ("Espejo Gold Minimal", 340000, "DecoIn", sc_dec, "https://images.unsplash.com/photo-1558507652-2d9626c4e67a?q=80&w=800"),
        ("Vela Aromática Wood", 65000, "AromaBox", sc_dec, "https://images.unsplash.com/photo-1603006905003-be475563bc59?q=80&w=800"),
        ("Mesa Centro Roble", 750000, "MueblesYa", sc_dec, "https://images.unsplash.com/photo-1551609141-862d6402316e?q=80&w=800"),
        ("Planta Decorativa Vivo", 85000, "Garden", sc_dec, "https://images.unsplash.com/photo-1485955900087-df50d810074f?q=80&w=800"),
        ("Juego Té Cerámica", 210000, "TeaTime", sc_dec, "https://images.unsplash.com/photo-1515696955266-4f67e13219e8?q=80&w=800"),
        ("Cámara Canon R6", 11200000, "Canon", sc_pc, "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=800"),
        ("Lente 50mm f/1.8", 950000, "Canon", sc_pc, "https://images.unsplash.com/photo-1617005082133-548c4dd27635?q=80&w=800"),
        ("Trípode Carbono Pro", 1250000, "Manfrotto", sc_pc, "https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?q=80&w=800")
    ]

    reviews_ext = [
        "Calidad superior, el vendedor es muy cumplido.",
        "Excelente producto, llegó impecable a mi casa.",
        "Recomendado por la durabilidad y el diseño.",
        "Vale cada peso, superó mis expectativas.",
        "Instalación fácil y funcionamiento perfecto."
    ]

    for name, pr, brand, sub, url in items:
        # Los primeros 10 tendrán MUY altas ventas para ser destacados
        v_offset = items.index((name, pr, brand, sub, url))
        ventas = random.randint(3000, 5000) if v_offset < 10 else random.randint(50, 2500)
        
        prod = Producto.objects.create(
            vendedor=vendedor, categoria=sub.categoria, subcategoria=sub,
            nombre=name, marca=brand, valor=pr, cantidad=100, peso=2.5,
            ventas_totales=ventas,
            descripcion=f"Edición Premium por {brand}. ||IMG:{url}||"
        )
        # 2 reviews por producto
        for _ in range(2):
            ComentarioProducto.objects.create(
                producto=prod, comprador=random.choice(compradores),
                comentario=random.choice(reviews_ext), calificacion=random.randint(8, 10)
            )

    print(f"✅ ¡Producción OK! 32 Productos HD y Reseñas Reales creadas.")

if __name__ == '__main__':
    seed()
