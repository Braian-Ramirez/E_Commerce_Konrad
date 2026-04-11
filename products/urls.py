from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoriaViewSet, SubcategoriaViewSet, ProductoViewSet, CostoDomicilioViewSet, ComentarioProductoViewSet

router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet)
router.register(r'subcategorias', SubcategoriaViewSet)
router.register(r'productos', ProductoViewSet)
router.register(r'costos-envio', CostoDomicilioViewSet)
router.register(r'comentarios', ComentarioProductoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
