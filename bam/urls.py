from django.urls import path
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponseForbidden
from decouple import config
from .soap_service import django_soap_app
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

# Decorador de seguridad para el servicio SOAP
def require_soap_api_key(view_func):
    def wrapper(request, *args, **kwargs):
        # Permitimos GET para que los sistemas puedan descargar el WSDL (contrato público)
        if request.method == 'POST':
            api_key = request.headers.get('X-API-Key')
            valid_api_key = config('SOAP_API_KEY', default='KONRAD-ERP-SECRET-2026')
            if api_key != valid_api_key:
                return HttpResponseForbidden("Acceso Denegado: Se requiere un API Key corporativo válido (X-API-Key).")
        return view_func(request, *args, **kwargs)
    return wrapper

urlpatterns.append(path('soap/', csrf_exempt(require_soap_api_key(django_soap_app))))
