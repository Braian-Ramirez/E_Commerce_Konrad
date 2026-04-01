from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from django.db.models import Avg
from .models import Persona, Vendedor, Solicitud, CalificacionVendedor
from .serializers import PersonaSerializer, VendedorSerializer, SolicitudSerializer, CalificacionVendedorSerializer, SolicitudVendedorRegistrationSerializer
from ecommerce_konrad.permissions import IsDirectorComercialOrPostOnly

# Vista Persona
class PersonaViewSet(viewsets.ModelViewSet):
    queryset = Persona.objects.all()
    serializer_class = PersonaSerializer

# Vista Vendedor
class VendedorViewSet(viewsets.ModelViewSet):
    queryset = Vendedor.objects.all()
    serializer_class = VendedorSerializer

# Vista Solicitud
class SolicitudViewSet(viewsets.ModelViewSet):
    queryset = Solicitud.objects.all()
    serializer_class = SolicitudSerializer
    parser_classes = (MultiPartParser, FormParser) # Muy importante para subir archivos
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register_vendor(self, request):
        serializer = SolicitudVendedorRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            solicitud = serializer.save()
            return Response({
                "mensaje": "Solicitud creada con éxito",
                "numero_radicado": solicitud.numero_solicitud,
                "estado": solicitud.estado
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# [PATRÓN DE DISEÑO: ADAPTER]
# Esta lógica sirve como ADAPTADOR para los servicios externos 
# (Datacrédito y CIFIN). Convertimos los datos crudos del tercero 
# (mock_data) en un estado interno de nuestra Solicitud (APROBADA/RECHAZADA).
    def perform_create(self, serializer):
        user = self.request.user
        if hasattr(user, 'persona_profile'):
            serializer.save(persona=user.persona_profile)
        else:
            serializer.save()

# Vista CalificacionVendedor
class CalificacionVendedorViewSet(viewsets.ModelViewSet):
    queryset = CalificacionVendedor.objects.all()
    serializer_class = CalificacionVendedorSerializer

    # Patrón: interceptamos el guardado para inyectar lógica de negocio
    def perform_create(self, serializer):
        # 1. Guardar la nueva calificación en BD
        calificacion = serializer.save()

        # 2. Identificar a quién calificaron
        vendedor = calificacion.vendedor

        # 3. Calcular nuevo promedio usando todo el historial
        promedio_dict = vendedor.calificaciones.aggregate(promedio=Avg('estrellas'))
        nuevo_promedio = promedio_dict['promedio'] or 0
        vendedor.calificacion_promedio = nuevo_promedio

        # 4. Regla de seguridad: cancelación automática
        malas_calificaciones = vendedor.calificaciones.filter(estrellas__lt=3).count() 
        
        if malas_calificaciones >= 10 or nuevo_promedio < 5:
            vendedor.estado_suscripcion = 'CANCELADA'
            # (Futuro: llamar a notifications para enviar email)
        
        # 5. Guardar los cambios
        vendedor.save()
