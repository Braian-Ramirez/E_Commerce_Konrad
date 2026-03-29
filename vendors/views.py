from rest_framework import viewsets
from django.db.models import Avg
from .models import Persona, Vendedor, Solicitud, CalificacionVendedor
from .serializers import PersonaSerializer, VendedorSerializer, SolicitudSerializer, CalificacionVendedorSerializer
from ecommerce_konrad.permissions import IsAdminOrPostOnly

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
    permission_classes = [IsAdminOrPostOnly]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Solicitud.objects.none()
        if user.is_staff or user.is_superuser:
            return Solicitud.objects.all()
        if hasattr(user, 'persona_profile'):
            return Solicitud.objects.filter(persona=user.persona_profile)
        return Solicitud.objects.none()

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

        # 2. Identificar a quién calificaron (minúscula para variables)
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
