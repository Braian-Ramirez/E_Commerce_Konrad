from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Persona, Vendedor, Solicitud, ConsultaCrediticia_Local

#Serializador User
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

#Serializador Persona
class PersonaSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = Persona
        fields = [
            'id', 'user', 'user_details', 'nombre', 'apellido', 
            'email', 'numero_identificacion', 'telefono', 
            'tipo_persona', 'pais', 'ciudad'
        ]

#Serializador Vendedor
class VendedorSerializer(serializers.ModelSerializer):
    persona_details = PersonaSerializer(source='persona', read_only=True)
    
    class Meta:
        model = Vendedor
        fields = [
            'id', 'persona', 'persona_details', 'estado_suscripcion', 
            'fecha_vencimiento', 'calificacion_promedio'
        ]

#Serializador Solicitud
class SolicitudSerializer(serializers.ModelSerializer):
    class Meta:
        model = Solicitud
        fields = '__all__'
