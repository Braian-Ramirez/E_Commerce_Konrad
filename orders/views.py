from rest_framework import viewsets
from .models import Orden, DetalleOrden, CalificacionProducto
from .serializers import OrdenSerializer, DetalleOrdenSerializer, CalificacionProductoSerializer

#Vista Orden
class OrdenViewSet(viewsets.ModelViewSet):
    queryset = Orden.objects.all()
    serializer_class = OrdenSerializer

#Vista DetalleOrden
class DetalleOrdenViewSet(viewsets.ModelViewSet):
    queryset = DetalleOrden.objects.all()
    serializer_class = DetalleOrdenSerializer

#Vista CalificacionProducto
class CalificacionProductoViewSet(viewsets.ModelViewSet):
    queryset = CalificacionProducto.objects.all()
    serializer_class = CalificacionProductoSerializer

