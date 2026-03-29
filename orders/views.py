from rest_framework import viewsets
from .models import Orden, DetalleOrden, CalificacionProducto
from .serializers import OrdenSerializer, DetalleOrdenSerializer, CalificacionProductoSerializer

#Vista Orden
class OrdenViewSet(viewsets.ModelViewSet):
    serializer_class = OrdenSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Orden.objects.none()
        if user.is_staff or user.is_superuser:
            return Orden.objects.all()
        if hasattr(user, 'persona_profile'):
            return Orden.objects.filter(comprador=user.persona_profile)
        return Orden.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if hasattr(user, 'persona_profile'):
            serializer.save(comprador=user.persona_profile)
        else:
            serializer.save()

#Vista DetalleOrden
class DetalleOrdenViewSet(viewsets.ModelViewSet):
    serializer_class = DetalleOrdenSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return DetalleOrden.objects.none()
        if user.is_staff or user.is_superuser:
            return DetalleOrden.objects.all()
        if hasattr(user, 'persona_profile'):
            return DetalleOrden.objects.filter(orden__comprador=user.persona_profile)
        return DetalleOrden.objects.none()

#Vista CalificacionProducto
class CalificacionProductoViewSet(viewsets.ModelViewSet):
    queryset = CalificacionProducto.objects.all()
    serializer_class = CalificacionProductoSerializer

