from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db.models import Avg

from .models import Persona, Vendedor, Solicitud, CalificacionVendedor
from .serializers import PersonaSerializer, VendedorSerializer, CalificacionVendedorSerializer, SolicitudVendedorRegistrationSerializer

# Vista Persona
class PersonaViewSet(viewsets.ModelViewSet):
    queryset = Persona.objects.all()
    serializer_class = PersonaSerializer

# Vista Vendedor
class VendedorViewSet(viewsets.ModelViewSet):
    queryset = Vendedor.objects.all()
    serializer_class = VendedorSerializer

# Vista Solicitud (SÓLO RUTAS PÚBLICAS Y BÁSICAS DE VENDEDORES)
class SolicitudViewSet(viewsets.GenericViewSet):
    queryset = Solicitud.objects.all()
    permission_classes = [IsAuthenticated]

    # Acción de registro público (abierto a todo mundo)
    @action(detail=False, methods=['post'], url_path='register_vendor', permission_classes=[AllowAny], parser_classes=[MultiPartParser, FormParser])
    def register_vendor(self, request):
        serializer = SolicitudVendedorRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Solicitud creada con éxito."}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Acción pública para que el Vendedor consulte su estado
    @action(detail=False, methods=['get'], url_path='consultar-estado', permission_classes=[AllowAny])
    def consultar_estado(self, request):
        identificacion = request.query_params.get('identificacion')
        radicado = request.query_params.get('radicado')
        if not identificacion and not radicado:
            return Response({"error": "Debe proporcionar identificación o radicado"}, status=status.HTTP_400_BAD_REQUEST)
        solicitud = None
        if radicado:
            solicitud = Solicitud.objects.filter(numero_solicitud=radicado).first()
        elif identificacion:
            solicitud = Solicitud.objects.filter(persona__numero_identificacion=identificacion).first()
        if solicitud:
            return Response({
                "estado": solicitud.estado,
                "numero_radicado": solicitud.numero_solicitud,
                "vendedor": f"{solicitud.persona.nombre} {solicitud.persona.apellido}",
                "fecha": solicitud.fecha_creacion.strftime("%d/%m/%Y")
            })
        
        return Response({"error": "Solicitud no encontrada"}, status=status.HTTP_404_NOT_FOUND)

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
        
        # 5. Guardar los cambios
        vendedor.save()
