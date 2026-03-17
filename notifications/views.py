from rest_framework import viewsets
from .models import Notificacion, CorreoEnviado
from .serializers import NotificacionSerializer, CorreoEnviadoSerializer

#Vista Notificacion
class NotificacionViewSet(viewsets.ModelViewSet):
    queryset = Notificacion.objects.all()
    serializer_class = NotificacionSerializer

#Vista CorreoEnviado
class CorreoEnviadoViewSet(viewsets.ModelViewSet):
    queryset = CorreoEnviado.objects.all()
    serializer_class = CorreoEnviadoSerializer
    
