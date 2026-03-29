from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrdenViewSet, DetalleOrdenViewSet, CalificacionProductoViewSet

router = DefaultRouter()
router.register(r'ordenes', OrdenViewSet, basename='ordenes')
router.register(r'detalles', DetalleOrdenViewSet, basename='detalles')
router.register(r'calificaciones-producto', CalificacionProductoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]