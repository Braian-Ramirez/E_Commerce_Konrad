from rest_framework import serializers
from .models import Comprador
from vendors.serializers import PersonaSerializer

#Serializer para Comprador
class CompradorSerializer(serializers.ModelSerializer):
    #ANIDACIÓN: Traemos toda la info de la persona vinculada
    persona_detalles = PersonaSerializer(source='persona', read_only=True)
    
    class Meta:
        model = Comprador
        fields = ['id', 'persona', 'persona_detalles', 'puntos_recompensa', 'twitter', 'instagram']
