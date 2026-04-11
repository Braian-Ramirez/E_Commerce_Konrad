from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoriaViewSet, SubcategoriaViewSet, ProductoViewSet, CostoDomicilioViewSet, ComentarioProductoViewSet, PreguntaProductoViewSet

router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet)
router.register(r'subcategorias', SubcategoriaViewSet)
router.register(r'productos', ProductoViewSet)
router.register(r'costos-envio', CostoDomicilioViewSet)
router.register(r'comentarios', ComentarioProductoViewSet)
router.register(r'preguntas', PreguntaProductoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
