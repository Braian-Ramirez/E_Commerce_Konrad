from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoriaViewSet, ProductoViewSet, CostoDomicilioViewSet, ComentarioProductoViewSet, CalificacionProductoViewSet

router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet)
router.register(r'productos', ProductoViewSet)
router.register(r'costos-envio', CostoDomicilioViewSet)
router.register(r'comentarios', ComentarioProductoViewSet)
router.register(r'calificaciones', CalificacionProductoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
