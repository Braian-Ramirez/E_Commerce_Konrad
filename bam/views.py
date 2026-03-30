from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta

from orders.models import DetalleOrden
from payments.models import Suscripcion
from .models import LogVisitaProducto

# [PATRÓN ARQUITECTÓNICO: CQRS - Segregación de Responsabilidades de Consulta]
# Este módulo (App BAM) separa el modelo de lectura (Queries) del modelo 
# de escritura de la aplicación principal para agilizar el Tablero de Control.

# Vista KPI Producto Mas Vendido
# [CQRS: Implementación del Read-Model]
# Esta vista procesa agregaciones pesadas en la base de datos sin 
# bloquear la tabla de Ventas para los demás usuarios.
class KpiProductoMasVendidoView(APIView):
    """
    KPI 1: Producto con mayor número de ventas en el último mes.
    Solo lectura (CQRS: Query).
    """
    def get(self, request):
        hace_un_mes = timezone.now() - timedelta(days=30)
        
        producto = (
            DetalleOrden.objects
            .filter(orden__estado='PAGADA', orden__fecha__gte=hace_un_mes)
            .values('producto__nombre')
            .annotate(total_vendido=Count('id'))
            .order_by('-total_vendido')
            .first()
        )

        if not producto:
            return Response({"mensaje": "No hay ventas registradas en el último mes."})

        return Response({
            "kpi": "Producto más vendido (último mes)",
            "producto": producto['producto__nombre'],
            "unidades_vendidas": producto['total_vendido']
        })

# Vista KPI categoría más consultada
class KpiCategoriaMasConsultadaView(APIView):
    """
    KPI 2: Categoría con más consultas en la última semana.
    """
    def get(self, request):
        hace_una_semana = timezone.now() - timedelta(days=7)
        
        categoria = (
            LogVisitaProducto.objects
            .filter(fecha_visita__gte=hace_una_semana)
            .values('producto__categoria__nombre')  # <-- Doble relación: visita → producto → categoría
            .annotate(total_visitas=Count('id'))
            .order_by('-total_visitas')
            .first()
        )
        
        if not categoria:
            return Response({"mensaje": "No hay visitas registradas en la última semana."})
            
        return Response({
            "kpi": "Categoría más consultada (última semana)",
            "categoria": categoria['producto__categoria__nombre'],
            "total_visitas": categoria['total_visitas']
        })

# Vista KPI suscripciones por semestre
# [CQRS: Análisis de Tendencias de Negocio] 
class KpiSuscripcionesPorSemestreView(APIView):
    """
    KPI 3: Comportamiento de suscripciones agrupado por semestres.
    Solo lectura (CQRS: Query).
    """
    def get(self, request):
        suscripciones = Suscripcion.objects.values('tipo').annotate(
            total=Count('id')
        ).order_by('-total')

        return Response({
            "kpi": "Suscripciones por tipo",
            "data": list(suscripciones)
        })

# Vista KPI productos tendencia
class KpiProductosTendenciaView(APIView):
    """
    KPI 4: Top 5 productos más consultados para detección de tendencias.
    """
    def get(self, request):
        hace_una_semana = timezone.now() - timedelta(days=7)
        
        productos = (
            LogVisitaProducto.objects
            .filter(fecha_visita__gte=hace_una_semana)
            .values('producto__nombre', 'producto__categoria__nombre')
            .annotate(total_visitas=Count('id'))
            .order_by('-total_visitas')[:5]  # <-- Solo el Top 5
        )
        
        return Response({
            "kpi": "Top 5 productos en tendencia (última semana)",
            "data": list(productos)
        })




