from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from .models import Categoria, Producto, ImagenProducto, CostoDomicilio, ComentarioProducto, Subcategoria
from .serializers import CategoriaSerializer, ProductoSerializer, CostoDomicilioSerializer, ComentarioProductoSerializer, SubcategoriaSerializer
from ecommerce_konrad.permissions import IsVendorOwnerOrReadOnly

# Vista categoria
class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer

# Vista subcategoria
class SubcategoriaViewSet(viewsets.ModelViewSet):
    queryset = Subcategoria.objects.all()
    serializer_class = SubcategoriaSerializer

    def get_queryset(self):
        queryset = Subcategoria.objects.all()
        categoria_id = self.request.query_params.get('categoria')
        if categoria_id:
            queryset = queryset.filter(categoria_id=categoria_id)
        return queryset

# Vista producto
class ProductoViewSet(viewsets.ModelViewSet):
    queryset = Producto.objects.all()
    serializer_class = ProductoSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsVendorOwnerOrReadOnly]

    def perform_create(self, serializer):
        user = self.request.user
        if hasattr(user, 'persona_profile') and hasattr(user.persona_profile, 'vendedor_profile'):
            serializer.save(vendedor=user.persona_profile.vendedor_profile)
        else:
            serializer.save()

    @action(detail=False, methods=['get'], url_path='mis-productos', permission_classes=[IsAuthenticated])
    def mis_productos(self, request):
        """Devuelve los productos del vendedor autenticado. Solo si tiene suscripción activa."""
        user = request.user

        if not hasattr(user, 'persona_profile') or not hasattr(user.persona_profile, 'vendedor_profile'):
            return Response(
                {"error": "No tienes un perfil de vendedor.", "codigo": "SIN_PERFIL"},
                status=status.HTTP_403_FORBIDDEN
            )

        vendedor = user.persona_profile.vendedor_profile

        if vendedor.estado_suscripcion != 'ACTIVA':
            return Response(
                {"error": "Necesitas una suscripción activa para gestionar productos.", "codigo": "SUSCRIPCION_INACTIVA"},
                status=status.HTTP_403_FORBIDDEN
            )

        productos = Producto.objects.filter(vendedor=vendedor).prefetch_related('imagenes', 'comentarios')
        serializer = ProductoSerializer(productos, many=True, context={'request': request})
        return Response(serializer.data)

    @action(
        detail=False,
        methods=['post'],
        url_path='crear-producto',
        permission_classes=[IsAuthenticated],
        parser_classes=[MultiPartParser, FormParser]
    )
    def crear_producto(self, request):
        """Crea un producto con imágenes. Solo si la suscripción está activa."""
        user = request.user

        if not hasattr(user, 'persona_profile') or not hasattr(user.persona_profile, 'vendedor_profile'):
            return Response(
                {"error": "No tienes un perfil de vendedor.", "codigo": "SIN_PERFIL"},
                status=status.HTTP_403_FORBIDDEN
            )

        vendedor = user.persona_profile.vendedor_profile

        if vendedor.estado_suscripcion != 'ACTIVA':
            return Response(
                {"error": "Necesitas una suscripción activa para crear productos.", "codigo": "SUSCRIPCION_INACTIVA"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Construir los datos del producto
        data = request.data.copy()
        data['vendedor'] = vendedor.id

        serializer = ProductoSerializer(data=data, context={'request': request})
        if serializer.is_valid():
            producto = serializer.save(vendedor=vendedor)

            # Procesar imágenes adjuntas
            imagenes = request.FILES.getlist('imagenes')
            for i, imagen in enumerate(imagenes):
                ImagenProducto.objects.create(
                    producto=producto,
                    imagen=imagen,
                    es_principal=(i == 0)  # La primera imagen es la principal
                )

            # Devolver el producto completo con imágenes
            producto_completo = ProductoSerializer(producto, context={'request': request})
            return Response(producto_completo.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(
        detail=True,
        methods=['delete'],
        url_path='eliminar',
        permission_classes=[IsAuthenticated]
    )
    def eliminar_producto(self, request, pk=None):
        """Elimina un producto del vendedor autenticado."""
        user = request.user

        if not hasattr(user, 'persona_profile') or not hasattr(user.persona_profile, 'vendedor_profile'):
            return Response({"error": "Sin perfil de vendedor."}, status=status.HTTP_403_FORBIDDEN)

        vendedor = user.persona_profile.vendedor_profile

        if vendedor.estado_suscripcion != 'ACTIVA':
            return Response({"error": "Suscripción inactiva."}, status=status.HTTP_403_FORBIDDEN)

        try:
            producto = Producto.objects.get(pk=pk, vendedor=vendedor)
            producto.delete()
            return Response({"mensaje": "Producto eliminado correctamente."}, status=status.HTTP_200_OK)
        except Producto.DoesNotExist:
            return Response({"error": "Producto no encontrado."}, status=status.HTTP_404_NOT_FOUND)

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
