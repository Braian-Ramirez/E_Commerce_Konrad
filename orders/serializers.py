from rest_framework import serializers
from .models import Orden, DetalleOrden

# 1. Primero el Detalle (porque la Orden lo usará)
class DetalleOrdenSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.ReadOnlyField(source='producto.nombre') # <--- Tip: ver el nombre del producto, no solo el ID
    
    class Meta:
        model = DetalleOrden
        fields = ['id', 'producto', 'producto_nombre', 'cantidad', 'valor_unitario']

# 2. Luego la Orden
class OrdenSerializer(serializers.ModelSerializer):
    # Esto es lo que "anida" los productos dentro de la orden:
    detalles = DetalleOrdenSerializer(many=True, read_only=True)
    comprador_nombre = serializers.ReadOnlyField(source='comprador.nombre')
    
    class Meta:
        model = Orden
        fields = [
            'id', 'comprador', 'comprador_nombre', 'fecha', 'estado', 
            'tipo_entrega', 'costo_envio', 'total_iva', 
            'total_comision', 'total_final', 'detalles' 
        ]
