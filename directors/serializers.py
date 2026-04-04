from rest_framework import serializers
from .models import DirectorComercial
from vendors.models import Solicitud, ConsultaCrediticia_Local

# Serializador Director Comercial
class DirectorComercialSerializer(serializers.ModelSerializer):
    class Meta:
        model = DirectorComercial
        fields = '__all__'


# --- SERIALIZADORES DEL DASHBOARD DEL DIRECTOR COMERCIAL ---

# Serializador Consulta Crediticia Local
class ConsultaCrediticiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultaCrediticia_Local
        fields = '__all__'

# Serializador Solicitud (Aplanado para el Dashboard)
class DirectorSolicitudSerializer(serializers.ModelSerializer):
    identificacion = serializers.CharField(source='persona.numero_identificacion', read_only=True)
    nombres = serializers.CharField(source='persona.nombre', read_only=True)
    apellidos = serializers.CharField(source='persona.apellido', read_only=True)
    email = serializers.EmailField(source='persona.email', read_only=True)
    telefono = serializers.CharField(source='persona.telefono', read_only=True)
    
    # Campo anidado para el reporte de riesgo detallado
    credit_data = ConsultaCrediticiaSerializer(read_only=True)

    class Meta:
        model = Solicitud
        fields = [
            'id', 'numero_solicitud', 'estado', 'fecha_creacion',
            'identificacion', 'nombres', 'apellidos', 'email', 'telefono',
            'resultado_datacredito', 'resultado_cifin', 'resultado_judicial',
            'fecha_consulta_judicial', 'credit_data'
        ]