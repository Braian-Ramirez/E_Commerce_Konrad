import os
import sys
import django

# Añadir la raíz del proyecto al PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecommerce_konrad.settings')
django.setup()

from bam.views import KpiVendedorEstrellaView, KpiConversionComercialView
from orders.models import Orden, DetalleOrden
from django.db.models import Sum, F

# Manual logic check
fecha_desde = '2026-04-01'
fecha_hasta = '2026-05-30'
filtros = {'orden__fecha__date__range': [fecha_desde, fecha_hasta]}

vendedor = (
    DetalleOrden.objects
    .filter(orden__estado='PAGADA', **filtros)
    .values('producto__vendedor__persona__nombre', 'producto__vendedor__persona__apellido')
    .annotate(total_ventas=Sum(F('cantidad') * F('valor_unitario')))
    .order_by('-total_ventas')
    .first()
)

print("VENDEDOR ESTRELLA:", vendedor)

from vendors.models import Solicitud
filtros_conv = {'fecha_creacion__date__range': [fecha_desde, fecha_hasta]}
total = Solicitud.objects.filter(**filtros_conv).count()
aprobadas = Solicitud.objects.filter(estado='APROBADA', **filtros_conv).count()

print("CONVERSION:", total, aprobadas)
