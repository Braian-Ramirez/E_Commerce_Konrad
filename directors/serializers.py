from rest_framework import serializers
from .models import DirectorComercial

# Serializador Director Comercial
class DirectorComercialSerializer(serializers.ModelSerializer):
    class Meta:
        model = DirectorComercial
        fields = '__all__'