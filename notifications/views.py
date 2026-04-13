from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
import random
from .models import Notificacion, CorreoEnviado
from .serializers import NotificacionSerializer, CorreoEnviadoSerializer
from .services import enviar_correo_otp

# Vista Notificacion
class NotificacionViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificacionSerializer

    def get_queryset(self):
        # El director solo ve sus propias notificaciones
        return Notificacion.objects.filter(persona__user=self.request.user).order_by('-fecha_creacion')

    @action(detail=True, methods=['post'], url_path='marcar-leida')
    def marcar_leida(self, request, pk=None):
        notificacion = self.get_object()
        notificacion.leida = True
        notificacion.save()
        return Response({'status': 'Notificación marcada como leída'}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def enviar_otp_verificacion(request):
    usuario = request.user
    
    # Manejar si el usuario tiene el related name "persona" o "persona_profile"
    persona = getattr(usuario, 'persona_profile', None)
    if not persona:
        persona = getattr(usuario, 'persona', None)
        
    if not persona:
        return Response({'status': 'Error', 'mensaje': 'Usuario no tiene perfil de persona asociado.'}, status=status.HTTP_400_BAD_REQUEST)
    
    email_override = None
    if 'email_destino' in request.data and request.data['email_destino']:
        email_override = request.data['email_destino']

    otp = str(random.randint(100000, 999999))
    enviar_correo_otp(persona, otp, email_override)

    # Devolvemos el OTP generado para que el frontend (Mock) sepa contra qué validar.
    return Response({'status': 'OTP Enviado', 'correo_destino': email_override or persona.email, 'otp_mock': otp}, status=status.HTTP_200_OK)

# Vista CorreoEnviado
class CorreoEnviadoViewSet(viewsets.ModelViewSet):
    queryset = CorreoEnviado.objects.all()
    serializer_class = CorreoEnviadoSerializer
