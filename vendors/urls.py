from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PersonaViewSet, VendedorViewSet, SolicitudViewSet

router = DefaultRouter()
router.register(r'personas', PersonaViewSet)
router.register(r'vendedores', VendedorViewSet)
router.register(r'solicitudes', SolicitudViewSet)

urlpatterns = [
    path('', include(router.urls)),
]