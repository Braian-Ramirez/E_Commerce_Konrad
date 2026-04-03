from rest_framework import viewsets
from .models import Categoria, Producto, CostoDomicilio, ComentarioProducto
from .serializers import CategoriaSerializer, ProductoSerializer, CostoDomicilioSerializer, ComentarioProductoSerializer
from ecommerce_konrad.permissions import IsVendorOwnerOrReadOnly
from rest_framework import permissions
# Vista categoria
class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer

# Vista producto
class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsVendorOwnerOrReadOnly]

    def perform_create(self, serializer):
        user = self.request.user
        if hasattr(user, 'persona_profile') and hasattr(user.persona_profile, 'vendedor_profile'):
            serializer.save(vendedor=user.persona_profile.vendedor_profile)
        else:
            serializer.save()

# Vista costo domicilio
class CostoDomicilioViewSet(viewsets.ModelViewSet):
    queryset = CostoDomicilio.objects.all()
    serializer_class = CostoDomicilioSerializer

# Vista comentario producto
class ComentarioProductoViewSet(viewsets.ModelViewSet):
    queryset = ComentarioProducto.objects.all()
    serializer_class = ComentarioProductoSerializer

    def perform_create(self, serializer):
        user = self.request.user
        from vendors.models import Persona
        persona, _ = Persona.objects.get_or_create(user=user)
        serializer.save(comprador=persona)

