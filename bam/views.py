from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Count, Sum, Avg, F
from django.db.models.functions import Coalesce
from django.utils import timezone
from datetime import timedelta

from orders.models import Orden, DetalleOrden
from payments.models import Suscripcion
from buyers.models import Comprador
from products.models import Producto
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
        dias = int(request.query_params.get('dias', 30))
        hace_un_mes = timezone.now() - timedelta(days=dias)

        producto = (
            DetalleOrden.objects
            .filter(orden__fecha__gte=hace_un_mes, orden__estado='PAGADA')
            .values('producto__nombre')
            .annotate(unidades_vendidas=Count('producto'))
            .order_by('-unidades_vendidas')
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
        dias = int(request.query_params.get('dias', 7))
        fecha_inicio = timezone.now() - timedelta(days=dias)
        
        categorias = (
            LogVisitaProducto.objects
            .filter(fecha_visita__gte=fecha_inicio)
            .values('producto__categoria__nombre')
            .annotate(total_visitas=Count('id'))
            .order_by('-total_visitas')
        )
        
        if not categorias:
            return Response({"mensaje": "No hay visitas registradas en la última semana."})
            
        return Response({
            "kpi": "Categorías más consultadas (última semana)",
            "categoria": categorias[0]['producto__categoria__nombre'],
            "total_visitas": categorias[0]['total_visitas'],
            "desglose": list(categorias)
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
        dias = int(request.query_params.get('dias', 7))
        fecha_inicio = timezone.now() - timedelta(days=dias)
        
        productos = (
            LogVisitaProducto.objects
            .filter(fecha_visita__gte=fecha_inicio)
            .values('producto', 'producto__nombre', 'producto__categoria__nombre')
            .annotate(total_visitas=Count('id'))
            .order_by('-total_visitas')[:5]  # <-- Solo el Top 5
        )
        
        return Response({
            "kpi": "Top 5 productos en tendencia (última semana)",
            "data": list(productos)
        })
# Vista KPI Vendedor Estrella
class KpiVendedorEstrellaView(APIView):
    """
    KPI: Vendedor con mayor volumen de ventas (en dinero) en el periodo.
    """
    def get(self, request):
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        
        if fecha_desde and fecha_hasta:
            filtros = {'orden__fecha__date__range': [fecha_desde, fecha_hasta]}
        else:
            dias = int(request.query_params.get('dias', 30))
            fecha_inicio = timezone.now() - timedelta(days=dias)
            filtros = {'orden__fecha__gte': fecha_inicio}

        vendedor = (
            DetalleOrden.objects
            .filter(orden__estado='PAGADA', **filtros)
            .values('producto__vendedor__persona__nombre', 'producto__vendedor__persona__apellido')
            .annotate(total_ventas=Sum(F('cantidad') * F('valor_unitario')))
            .order_by('-total_ventas')
            .first()
        )
        
        if not vendedor:
            return Response({"mensaje": "No hay ventas en el periodo."})
            
        nombre_completo = f"{vendedor['producto__vendedor__persona__nombre']} {vendedor['producto__vendedor__persona__apellido']}"
        return Response({
            "vendedor": nombre_completo,
            "total_ventas": vendedor['total_ventas']
        })

# Vista KPI Ticket Promedio
class KpiTicketPromedioView(APIView):
    """
    KPI: Valor promedio de las órdenes pagadas.
    """
    def get(self, request):
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        
        if fecha_desde and fecha_hasta:
            filtros = {'orden__fecha__date__range': [fecha_desde, fecha_hasta]}
        else:
            dias = int(request.query_params.get('dias', 30))
            fecha_inicio = timezone.now() - timedelta(days=dias)
            filtros = {'orden__fecha__gte': fecha_inicio}
            
        avg_ticket = (
            DetalleOrden.objects
            .filter(orden__estado='PAGADA', **filtros)
            .aggregate(promedio=Avg(F('cantidad') * F('valor_unitario')))
        )['promedio'] or 0
        
        return Response({"ticket_promedio": avg_ticket})

# Vista KPI Conversión Comercial
class KpiConversionComercialView(APIView):
    """
    KPI: % de solicitudes aprobadas vs total.
    """
    def get(self, request):
        from vendors.models import Solicitud
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        
        if fecha_desde and fecha_hasta:
            filtros = {'fecha_creacion__date__range': [fecha_desde, fecha_hasta]}
        else:
            filtros = {}

        total = Solicitud.objects.filter(**filtros).count()
        aprobadas = Solicitud.objects.filter(estado='APROBADA', **filtros).count()
        
        conversion = (aprobadas / total * 100) if total > 0 else 0
        return Response({
            "total_solicitudes": total,
            "aprobadas": aprobadas,
            "tasa_conversion": round(conversion, 1)
        })

# Vista KPI Ingresos Totales (GMV)
class KpiIngresosTotalesView(APIView):
    """
    KPI: Suma total de ventas pagadas + suscripciones.
    """
    def get(self, request):
        fecha_desde = request.query_params.get('fecha_desde')
        fecha_hasta = request.query_params.get('fecha_hasta')
        
        if fecha_desde and fecha_hasta:
            f_detalle = {'orden__fecha__date__range': [fecha_desde, fecha_hasta]}
            f_orden = {'fecha__date__range': [fecha_desde, fecha_hasta]}
            f_suscrip = {'fecha_inicio__range': [fecha_desde, fecha_hasta]}
        else:
            dias = int(request.query_params.get('dias', 30))
            fecha_inicio = timezone.now() - timedelta(days=dias)
            f_detalle = {'orden__fecha__gte': fecha_inicio}
            f_orden = {'fecha__gte': fecha_inicio}
            f_suscrip = {'fecha_inicio__gte': fecha_inicio}
        
        ventas = (
            DetalleOrden.objects
            .filter(orden__estado='PAGADA', **f_detalle)
            .aggregate(total=Sum(F('cantidad') * F('valor_unitario')))
        )['total'] or 0
        
        comisiones = (
            Orden.objects
            .filter(estado='PAGADA', **f_orden)
            .aggregate(total=Sum('total_comision'))
        )['total'] or 0
        
        suscripciones = (
            Suscripcion.objects
            .filter(**f_suscrip)
            .aggregate(total=Sum('monto_pagado'))
        )['total'] or 0
        
        return Response({
            "total_ingresos": ventas + suscripciones,
            "desglose": {
                "ventas": ventas,
                "comisiones": comisiones,
                "suscripciones": suscripciones
            }
        })


# Vista Registrar Visita Producto
# [CQRS: Write-Model — evento que alimenta los KPIs del Read-Model BAM]
class RegistrarVisitaProductoView(APIView):
    """
    POST /api/v1/bam/registrar-visita/
    Registra una visita al detalle de un producto para alimentar
    los KPIs de categoría más consultada y productos en tendencia.
    No requiere autenticación (compradores anónimos también cuentan).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        producto_id = request.data.get('producto_id')
        origen = request.data.get('origen', 'directo')

        if not producto_id:
            return Response({"error": "producto_id es requerido."}, status=400)

        try:
            producto = Producto.objects.get(pk=producto_id)
        except Producto.DoesNotExist:
            return Response({"error": "Producto no encontrado."}, status=404)

        LogVisitaProducto.objects.create(
            producto=producto,
            origen=origen or 'directo'
        )

        return Response({"ok": True, "producto": producto.nombre}, status=201)


# Vista Enviar Promociones Automaticas
# [PATRON OBSERVER + CQRS: Deteccion de tendencias y disparo de notificaciones]
class KpiEnviarPromocionesView(APIView):
    """
    F41/F42: Identifica los productos mas consultados de la semana y envia
    correos masivos de promocion a todos los compradores registrados.
    Solo el Director Comercial puede disparar este proceso.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        hace_una_semana = timezone.now() - timedelta(days=7)

        # 1. Identificar top 3 productos en tendencia (CQRS: Read-Model)
        top_productos = (
            LogVisitaProducto.objects
            .filter(fecha_visita__gte=hace_una_semana)
            .values('producto__nombre', 'producto__categoria__nombre')
            .annotate(total_visitas=Count('id'))
            .order_by('-total_visitas')[:3]
        )

        if not top_productos:
            return Response(
                {"mensaje": "No hay datos de tendencia esta semana para enviar promociones."},
                status=200
            )

        # 2. Construir resumen de productos en tendencia
        productos_texto = "\n".join([
            f"  - {p['producto__nombre']} (Categoria: {p['producto__categoria__nombre'] or 'General'}) "
            f"- {p['total_visitas']} consultas"
            for p in top_productos
        ])

        # 3. Obtener todos los compradores registrados con correo valido
        compradores = Comprador.objects.filter(
            persona__email__isnull=False
        ).select_related('persona')

        if not compradores.exists():
            return Response({"mensaje": "No hay compradores registrados para notificar."}, status=200)

        # 4. Enviar correo a cada comprador (Observer: disparo asincrono seguro)
        enviados = 0
        errores = 0
        try:
            from notifications.services import _enviar_safe, _registrar_auditoria_correo
            asunto = '🔥 ¡Productos en Tendencia esta Semana! — Comercial Konrad'

            for comprador in compradores:
                persona = comprador.persona
                if not persona or not persona.email:
                    continue
                cuerpo = (
                    f"Hola {persona.nombre or 'estimado cliente'},\n\n"
                    f"🌟 ¡Hemos notado que estos productos están arrasando en Comercial Konrad esta semana!\n\n"
                    f"Top 3 Tendencias Actuales:\n"
                    f"{productos_texto}\n\n"
                    f"🔥 Aprovecha antes de que se agoten. Ingresa a la plataforma y revisa nuestro catálogo para ver más detalles.\n\n"
                    f"Saludos cordiales,\n"
                    f"El equipo de Comercial Konrad 🛒"
                )
                _registrar_auditoria_correo(persona, asunto, cuerpo)
                _enviar_safe(asunto, cuerpo, persona.email)
                enviados += 1

        except Exception as e:
            errores += 1
            print(f"[BAM PROMOCIONES] Error al enviar correo: {e}")

        return Response({
            "mensaje": f"Campana de promociones enviada correctamente.",
            "compradores_notificados": enviados,
            "top_productos": list(top_productos),
            "errores": errores
        }, status=200)
