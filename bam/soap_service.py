# pyrefly: ignore [missing-import]
import sys
import collections.abc
import urllib.parse
import http.cookies

# MONKEY-PATCH PARA SOPORTAR SPYNE EN PYTHON 3.14+
# Spyne usa un "six" interno que está roto en versiones muy recientes de Python.
sys.modules['spyne.util.six.moves'] = type('Mock', (), {})
sys.modules['spyne.util.six.moves.collections_abc'] = collections.abc
sys.modules['spyne.util.six.moves.urllib'] = type('urllib', (), {'parse': urllib.parse})
sys.modules['spyne.util.six.moves.urllib.parse'] = urllib.parse
sys.modules['spyne.util.six.moves.http_cookies'] = http.cookies
# pyrefly: ignore [missing-import]
from spyne import Application, rpc, ServiceBase, Integer, Unicode, Float, Iterable
# pyrefly: ignore [missing-import]
from spyne.protocol.soap import Soap11
# pyrefly: ignore [missing-import]
from spyne.server.django import DjangoApplication
from django.db.models import Count, Sum, Avg, F
from django.utils import timezone
from datetime import timedelta
from orders.models import Orden, DetalleOrden
from payments.models import Suscripcion
from vendors.models import Solicitud

class BAMSoapService(ServiceBase):
    @rpc(Integer, _returns=Unicode)
    def get_producto_mas_vendido(ctx, dias=30):
        """Retorna el nombre del producto más vendido en el periodo."""
        hace_un_mes = timezone.now() - timedelta(days=dias)
        producto = (
            DetalleOrden.objects
            .filter(orden__fecha__gte=hace_un_mes, orden__estado='PAGADA')
            .values('producto__nombre')
            .annotate(total_vendido=Count('producto'))
            .order_by('-total_vendido')
            .first()
        )
        return producto['producto__nombre'] if producto else "No hay datos"

    @rpc(Integer, _returns=Float)
    def get_ingresos_totales(ctx, dias=30):
        """Retorna la suma de ventas y suscripciones."""
        fecha_inicio = timezone.now() - timedelta(days=dias)
        
        ventas = (
            DetalleOrden.objects
            .filter(orden__estado='PAGADA', orden__fecha__gte=fecha_inicio)
            .aggregate(total=Sum(F('cantidad') * F('valor_unitario')))
        )['total'] or 0
        
        suscripciones = (
            Suscripcion.objects
            .filter(fecha_inicio__gte=fecha_inicio)
            .aggregate(total=Sum('monto_pagado'))
        )['total'] or 0
        
        return float(ventas + suscripciones)

    @rpc(_returns=Float)
    def get_tasa_conversion_vendedores(ctx):
        """Retorna el porcentaje de solicitudes aprobadas."""
        total = Solicitud.objects.count()
        aprobadas = Solicitud.objects.filter(estado='APROBADA').count()
        return (aprobadas / total * 100) if total > 0 else 0.0

# Configuración de la aplicación Spyne
soap_app = Application(
    [BAMSoapService],
    tns='comercial.konrad.bam.soap',
    in_protocol=Soap11(validator='lxml'),
    out_protocol=Soap11()
)

# Envoltura para Django
django_soap_app = DjangoApplication(soap_app)
