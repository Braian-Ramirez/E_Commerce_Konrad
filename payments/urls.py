from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PagoOrdenViewSet, SuscripcionViewSet, ConsignacionBancariaViewSet

router = DefaultRouter()
router.register(r'pagos', PagoOrdenViewSet)
router.register(r'suscripciones', SuscripcionViewSet)
router.register(r'consignaciones', ConsignacionBancariaViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

