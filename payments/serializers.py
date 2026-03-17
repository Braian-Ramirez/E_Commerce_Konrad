from rest_framework import serializers
from .models import PagoOrden, Suscripcion, ConsignacionBancaria

# 1. El Pago (El bloque que va adentro)
class PagoOrdenSerializer(serializers.ModelSerializer):
    class Meta:
        model = PagoOrden
        fields = '__all__'

# 2. La Consignación (El bloque que lo contiene)
class ConsignacionBancariaSerializer(serializers.ModelSerializer):
    # ANIDACIÓN: Traemos toda la info del pago vinculado
    pago_detalles = PagoOrdenSerializer(source='pago_orden', read_only=True)
    
    class Meta:
        model = ConsignacionBancaria
        fields = [
            'id', 'vendedor', 'pago_orden', 'pago_detalles', 
            'referencia', 'comprobante_img', 'fecha_subida', 'validada'
        ]

# 3. La Suscripción (Independiente)
class SuscripcionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Suscripcion
        fields = '__all__'
