from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
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
    serializer_class = SolicitudSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Solicitud.objects.none()
            
        if user.is_superuser:
            return Solicitud.objects.all()
            
        if hasattr(user, 'persona_profile') and user.persona_profile:
            persona = user.persona_profile
            if hasattr(persona, 'vendedor_profile'):
                return Solicitud.objects.filter(persona=persona)
            elif hasattr(persona, 'perfil_comprador'):
                # Los compradores no deberían ver solicitudes de vendedores (o solo la suya si existiera)
                return Solicitud.objects.filter(persona=persona)
            else:
                # Se asume Director si no tiene perfil específico de tercero pero sí persona_profile
                return Solicitud.objects.all()
                
        return Solicitud.objects.none()
    
    # Solo el Director (autenticado) puede ver la lista completa
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='register_vendor', permission_classes=[AllowAny])
    def register_vendor(self, request):
        serializer = SolicitudVendedorRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            solicitud = serializer.save()
            return Response({
                "message": "Solicitud creada exitosamente",
                "numero_radicado": solicitud.numero_solicitud
            }, status=status.HTTP_201_CREATED)
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
    # Acción para que el Director apruebe/rechace (solo autenticados)
    @action(detail=True, methods=['patch'], url_path='cambiar-estado')
    def cambiar_estado(self, request, pk=None):
        solicitud = self.get_object()
        nuevo_estado = request.data.get('estado')
        
        if nuevo_estado in ['APROBADA', 'RECHAZADA', 'PENDIENTE']:
            solicitud.estado = nuevo_estado
            solicitud.save()
            return Response({"message": f"Estado actualizado a {nuevo_estado}"})
        
        return Response({"error": "Estado no válido"}, status=status.HTTP_400_BAD_REQUEST)

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

    @action(detail=False, methods=['get'], url_path='consultar-estado', permission_classes=[AllowAny])
    def consultar_estado(self, request):
        identificacion = request.query_params.get('identificacion')
        radicado = request.query_params.get('radicado')
        
        if not identificacion and not radicado:
            return Response({"error": "Debes proporcionar un número de identificación o un radicado"}, status=400)
        
        # Lógica de búsqueda dinámica
        if radicado:
            solicitud = Solicitud.objects.filter(numero_solicitud=radicado).last()
        else:
            solicitud = Solicitud.objects.filter(persona__numero_identificacion=identificacion).last()
    
        if solicitud:
            return Response({
                "numero_radicado": solicitud.numero_solicitud,
                "estado": solicitud.estado,
                "fecha": solicitud.fecha_creacion.strftime("%d/%m/%Y"),
                "nombre": f"{solicitud.persona.nombre} {solicitud.persona.apellido}"
            })
        else:
            return Response({"error": "No se encontró ninguna solicitud con los datos proporcionados"}, status=404)
            

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
