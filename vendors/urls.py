from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PersonaViewSet, VendedorViewSet, SolicitudViewSet, CalificacionVendedorViewSet

router = DefaultRouter()
router.register(r'personas', PersonaViewSet)
router.register(r'vendedores', VendedorViewSet)
router.register(r'solicitudes', SolicitudViewSet, basename='solicitudes')
router.register(r'calificaciones', CalificacionVendedorViewSet)

urlpatterns = [
    path('', include(router.urls)),
]