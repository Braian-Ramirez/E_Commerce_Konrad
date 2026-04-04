from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Notificacion, CorreoEnviado
from .serializers import NotificacionSerializer, CorreoEnviadoSerializer

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

# Vista CorreoEnviado
class CorreoEnviadoViewSet(viewsets.ModelViewSet):
    queryset = CorreoEnviado.objects.all()
    serializer_class = CorreoEnviadoSerializer
    
