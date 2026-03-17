from rest_framework import serializers
from .models import Notificacion, CorreoEnviado

# Serializer para Notificacion
class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = '__all__'

# Serializer para CorreoEnviado
class CorreoEnviadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CorreoEnviado
        fields = '__all__'
        #Seguridad: Nadie puede alterar la firma cronológica
        read_only_fields = ('timestamp_hash', 'fecha_envio')
