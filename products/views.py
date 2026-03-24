from rest_framework import viewsets
from .models import Categoria, Producto, CostoDomicilio, ComentarioProducto, CalificacionProducto
from .serializers import CategoriaSerializer, ProductoSerializer, CostoDomicilioSerializer, ComentarioProductoSerializer, CalificacionProductoSerializer

# Vista categoria
class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer

# Vista producto
class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer

# Vista costo domicilio
class CostoDomicilioViewSet(viewsets.ModelViewSet):
    queryset = CostoDomicilio.objects.all()
    serializer_class = CostoDomicilioSerializer

# Vista comentario producto
class ComentarioProductoViewSet(viewsets.ModelViewSet):
    queryset = ComentarioProducto.objects.all()
    serializer_class = ComentarioProductoSerializer

# Vista calificacion producto
class CalificacionProductoViewSet(viewsets.ModelViewSet):
    queryset = CalificacionProducto.objects.all()
    serializer_class = CalificacionProductoSerializer  
