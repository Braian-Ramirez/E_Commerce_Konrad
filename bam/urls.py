from django.urls import path
from .views import KpiProductoMasVendidoView, KpiSuscripcionesPorSemestreView, KpiCategoriaMasConsultadaView, KpiProductosTendenciaView

urlpatterns = [
    path('kpi/producto-mas-vendido/', KpiProductoMasVendidoView.as_view(), name='kpi-producto-mas-vendido'),
    path('kpi/suscripciones-semestre/', KpiSuscripcionesPorSemestreView.as_view(), name='kpi-suscripciones'),
    path('kpi/categoria-mas-consultada/', KpiCategoriaMasConsultadaView.as_view(), name='kpi-categoria-mas-consultada'),
    path('kpi/productos-tendencia/', KpiProductosTendenciaView.as_view(), name='kpi-productos-tendencia'),
]
