from django.urls import path
from .views import (
    KpiProductoMasVendidoView, KpiSuscripcionesPorSemestreView,
    KpiCategoriaMasConsultadaView, KpiProductosTendenciaView,
    KpiEnviarPromocionesView, RegistrarVisitaProductoView,
    KpiVendedorEstrellaView, KpiTicketPromedioView,
    KpiConversionComercialView, KpiIngresosTotalesView
)

urlpatterns = [
    path('kpi/producto-mas-vendido/', KpiProductoMasVendidoView.as_view(), name='kpi-producto-mas-vendido'),
    path('kpi/suscripciones-semestre/', KpiSuscripcionesPorSemestreView.as_view(), name='kpi-suscripciones'),
    path('kpi/categoria-mas-consultada/', KpiCategoriaMasConsultadaView.as_view(), name='kpi-categoria-mas-consultada'),
    path('kpi/productos-tendencia/', KpiProductosTendenciaView.as_view(), name='kpi-productos-tendencia'),
    path('kpi/enviar-promociones/', KpiEnviarPromocionesView.as_view(), name='kpi-enviar-promociones'),
    path('registrar-visita/', RegistrarVisitaProductoView.as_view(), name='registrar-visita-producto'),
    
    # Nuevos KPIs
    path('kpi/vendedor-estrella/', KpiVendedorEstrellaView.as_view(), name='kpi-vendedor-estrella'),
    path('kpi/ticket-promedio/', KpiTicketPromedioView.as_view(), name='kpi-ticket-promedio'),
    path('kpi/conversion-comercial/', KpiConversionComercialView.as_view(), name='kpi-conversion-comercial'),
    path('kpi/ingresos-totales/', KpiIngresosTotalesView.as_view(), name='kpi-ingresos-totales'),
]
