from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrdenViewSet, DetalleOrdenViewSet

router = DefaultRouter()
router.register(r'ordenes', OrdenViewSet)
router.register(r'detalles', DetalleOrdenViewSet)

urlpatterns = [
    path('', include(router.urls)),
]