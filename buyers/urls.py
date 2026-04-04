from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompradorViewSet, MedioPagoViewSet

router = DefaultRouter()
router.register(r'compradores', CompradorViewSet)
router.register(r'medios-pago', MedioPagoViewSet, basename='medios-pago')

urlpatterns = [
    path('', include(router.urls)),
]
