# pyrefly: ignore [missing-import]
from rest_framework import viewsets, status
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.decorators import action
# pyrefly: ignore [missing-import]
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, AllowAny
from .models import Categoria, Producto, ImagenProducto, CostoDomicilio, ComentarioProducto, Subcategoria, PreguntaProducto
from .serializers import CategoriaSerializer, ProductoSerializer, CostoDomicilioSerializer, ComentarioProductoSerializer, SubcategoriaSerializer, PreguntaProductoSerializer
from ecommerce_konrad.permissions import IsVendorOwnerOrReadOnly, IsProductVendor
from django.utils import timezone
# pyrefly: ignore [missing-import]
from rest_framework.exceptions import ValidationError

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

    def perform_update(self, serializer):
        producto = serializer.save()
        
        # Manejar imágenes si se envían
        if 'imagenes' in self.request.FILES:
            # Opción: Reemplazar imágenes anteriores si se suben nuevas
            producto.imagenes.all().delete()
            
            imagenes = self.request.FILES.getlist('imagenes')
            try:
                raw_idx = self.request.data.get('indice_principal', 0)
                indice_principal = int(raw_idx) if raw_idx != "" else 0
            except (ValueError, TypeError):
                indice_principal = 0
                
            for i, imagen in enumerate(imagenes):
                ImagenProducto.objects.create(
                    producto=producto,
                    imagen=imagen,
                    es_principal=(i == indice_principal)
                )

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

        serializer = ProductoSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            producto = serializer.save(vendedor=vendedor)

            # Procesar imágenes adjuntas
            imagenes = request.FILES.getlist('imagenes')
            
            # Obtener el índice principal de forma segura
            try:
                raw_idx = request.data.get('indice_principal', 0)
                indice_principal = int(raw_idx) if raw_idx != "" else 0
            except (ValueError, TypeError):
                indice_principal = 0
            
            for i, imagen in enumerate(imagenes):
                ImagenProducto.objects.create(
                    producto=producto,
                    imagen=imagen,
                    es_principal=(i == indice_principal)
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

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def ciudades_disponibles(self, request):
        """Devuelve un listado de ciudades únicas que tienen tarifas de envío configuradas."""
        ciudades = CostoDomicilio.objects.values_list('ciudad', flat=True).distinct().order_by('ciudad')
        return Response(ciudades)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def calcular_costo(self, request):
        """Calcula el costo de envío basado en ciudad y peso total."""
        ciudad = request.data.get('ciudad')
        try:
            peso_total = float(request.data.get('peso_total', 0))
        except (ValueError, TypeError):
            peso_total = 0

        if not ciudad:
            return Response({"error": "Debe especificar una ciudad."}, status=400)

        # Limpieza básica de la ciudad enviada
        ciudad_clean = ciudad.strip().lower()

        # Buscar todas las tarifas para esa ciudad (insensible a mayúsculas/minúsculas)
        tarifas = CostoDomicilio.objects.filter(ciudad__iexact=ciudad_clean).order_by('peso_min')

        # Si no hay match exacto, intentamos una búsqueda por aproximación
        if not tarifas.exists():
            tarifas = CostoDomicilio.objects.filter(ciudad__icontains=ciudad_clean).order_by('peso_min')

        if not tarifas.exists():
            return Response({"error": f"No hay tarifas configuradas para {ciudad}."}, status=404)

        # 1. Intentar encontrar el rango exacto
        tarifa = tarifas.filter(peso_min__lte=peso_total, peso_max__gte=peso_total).first()

        # 2. Si no hay rango exacto pero el peso es menor al mínimo de la primera tarifa
        if not tarifa and peso_total < tarifas.first().peso_min:
            tarifa = tarifas.first()

        # 3. Si el peso es mayor al máximo de todas las tarifas, tomamos la última
        if not tarifa:
            tarifa = tarifas.last()

        costo_base = float(tarifa.costo)
        costo_final = costo_base

        # Cálculo de excedente si aplica
        if peso_total > tarifa.peso_max:
            exceso = peso_total - float(tarifa.peso_max)
            costo_final += float(exceso * float(tarifa.costo_kilo_extra))

        return Response({
            "ciudad": ciudad,
            "peso_total": peso_total,
            "costo_envio": costo_final,
            "tarifa_aplicada": f"{tarifa.peso_min}kg - {tarifa.peso_max}kg",
            "precio_base": float(tarifa.costo)
        })

# Vista comentario producto
class ComentarioProductoViewSet(viewsets.ModelViewSet):
    queryset = ComentarioProducto.objects.all()
    serializer_class = ComentarioProductoSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        user = self.request.user
        producto_id = self.request.data.get('producto')
        orden_id = self.request.data.get('orden')
        
        from vendors.models import Persona
        persona, _ = Persona.objects.get_or_create(user=user)

        # Evitar duplicados por compra (si se proporciona orden)
        if orden_id:
            if ComentarioProducto.objects.filter(comprador=persona, producto_id=producto_id, orden_id=orden_id).exists():
                
                raise ValidationError("Ya has calificado este producto para esta compra.")

        comentario_obj = serializer.save(comprador=persona)

        # ── Sincronización de reputación del vendedor ───────────────────────
        from django.db.models import Avg, Count
        from django.core.mail import send_mail
        from django.conf import settings

        vendedor = comentario_obj.producto.vendedor

        # Recalcular promedio
        promedio = ComentarioProducto.objects.filter(
            producto__vendedor=vendedor
        ).aggregate(Avg('calificacion'))['calificacion__avg']
        vendedor.calificacion_promedio = promedio or 0

        # ── Trigger 1: Promedio por debajo de 5.0 ───────────────────────────
        PROMEDIO_MINIMO = 5.0
        if (promedio or 0) < PROMEDIO_MINIMO and vendedor.estado_suscripcion != 'CANCELADA':
            vendedor.estado_suscripcion = 'CANCELADA'
            from notifications.services import enviar_correo_promedio_bajo_vendedor
            enviar_correo_promedio_bajo_vendedor(
                persona=vendedor.persona,
                promedio=promedio or 0
            )

        # Contar strikes (calificaciones < 3)
        strikes = ComentarioProducto.objects.filter(
            producto__vendedor=vendedor,
            calificacion__lt=3,
            calificacion__gt=0
        ).count()

        # Si llega a 10 strikes → cancelar suscripción y notificar por el servicio de notificaciones
        MAX_STRIKES = 10
        if strikes >= MAX_STRIKES and vendedor.estado_suscripcion != 'CANCELADA':
            vendedor.estado_suscripcion = 'CANCELADA'
            from notifications.services import enviar_correo_cancelacion_vendedor
            enviar_correo_cancelacion_vendedor(
                persona=vendedor.persona,
                strikes=strikes,
                max_strikes=MAX_STRIKES
            )

        vendedor.save()

# Vista pregunta producto
class PreguntaProductoViewSet(viewsets.ModelViewSet):
    queryset = PreguntaProducto.objects.all()
    serializer_class = PreguntaProductoSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        user = self.request.user
        from vendors.models import Persona
        persona, _ = Persona.objects.get_or_create(user=user)
        instance = serializer.save(comprador=persona)
        
        # Notificar al vendedor
        try:
            from notifications.services import crear_notificacion
            vendedor_persona = instance.producto.vendedor.persona
            crear_notificacion(
                persona=vendedor_persona,
                tipo='PREGUNTA',
                mensaje=f"Tienes una nueva pregunta sobre tu producto '{instance.producto.nombre}'."
            )
        except Exception as e:
            print(f"Error al crear notificación para vendedor: {e}")

    @action(detail=True, methods=['post'], url_path='responder', permission_classes=[IsAuthenticated, IsProductVendor])
    def responder(self, request, pk=None):
        pregunta = self.get_object()
        respuesta = request.data.get('respuesta')
        
        if not respuesta:
            return Response({"error": "La respuesta no puede estar vacía."}, status=status.HTTP_400_BAD_REQUEST)
        
        pregunta.respuesta = respuesta
        pregunta.fecha_respuesta = timezone.now()
        pregunta.save()

        # Notificar al comprador
        try:
            from notifications.services import crear_notificacion
            crear_notificacion(
                persona=pregunta.comprador,
                tipo='RESPUESTA',
                mensaje=f"Tu pregunta sobre '{pregunta.producto.nombre}' ha sido respondida."
            )
        except Exception as e:
            print(f"Error al crear notificación para comprador: {e}")
        
        return Response({"status": "Respuesta guardada correctamente."}, status=status.HTTP_200_OK)
