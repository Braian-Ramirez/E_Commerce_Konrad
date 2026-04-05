import os
import django
import random
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecommerce_konrad.settings')
django.setup()

from vendors.models import Persona
from products.models import Producto
from orders.models import Orden, DetalleOrden

def run_real_purchase_demo():
    print("🚀 Iniciando Simulación de Compra de Producción (Datos Reales)...")
    
    # 1. Identificar comprador
    comprador = Persona.objects.filter(user__username='user_0').first()
    if not comprador:
        print("❌ Error: No se encontró el comprador user_0")
        return

    # 2. Seleccionar productos reales de alta gama
    prods = Producto.objects.all()[:3]
    if prods.count() < 3:
        print("❌ Error: Necesitas productos en la BD para esta prueba.")
        return

    # 3. Crear la Orden (CARRITO)
    orden = Orden.objects.create(
        comprador=comprador,
        estado='CARRITO',
        tipo_entrega='DOMICILIO'
    )
    print(f"📦 Orden #{orden.id} creada como CARRITO.")

    # 4. Añadir Detalles con precios de producción
    total_val = Decimal('0.00')
    for p in prods:
        qty = random.randint(1, 2)
        DetalleOrden.objects.create(
            orden=orden,
            producto=p,
            cantidad=qty,
            valor_unitario=p.valor
        )
        total_val += (p.valor * qty)
        print(f"   - Añadido: {p.nombre} (Cant: {qty}) | Precio: ${p.valor}")

    # 5. Ejecutar Checkout Metódico (Simulando el ViewSet)
    # Suponiendo que el ViewSet hace los cálculos de IVA/Comisión
    iva = total_val * Decimal('0.19')
    comision = total_val * Decimal('0.05')
    envio = Decimal('12000.00')
    total_final = total_val + iva + comision + envio

    orden.total_iva = iva
    orden.total_comision = comision
    orden.costo_envio = envio
    orden.total_final = total_final
    orden.estado = 'PAGADA' # Simulamos éxito del banco
    orden.save()

    # 6. Actualizar Ventas Totales (Producción)
    for det in orden.detalles.all():
        det.producto.ventas_totales += det.cantidad
        det.producto.save()

    print("\n✅ [TRANSACCIÓN EXITOSA]")
    print(f"   💰 Subtotal: ${total_val}")
    print(f"   🏛️ Impuestos (19% IVA): ${iva}")
    print(f"   🛡️ Comisión (5%): ${comision}")
    print(f"   🚚 Envío: ${envio}")
    print(f"   💎 TOTAL FINAL PAGADO: ${total_final}")
    print(f"   📂 Estado Final: {orden.get_estado_display()}")
    print("-" * 50)

if __name__ == '__main__':
    run_real_purchase_demo()
