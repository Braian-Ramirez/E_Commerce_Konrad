from rest_framework import serializers
from .models import Orden, DetalleOrden, CalificacionProducto

# 1. Primero el Detalle (porque la Orden lo usará)
class DetalleOrdenSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.ReadOnlyField(source='producto.nombre')
    
    class Meta:
        model = DetalleOrden
        fields = ['id', 'producto', 'producto_nombre', 'cantidad', 'valor_unitario']

# 2. Luego la Orden
class OrdenSerializer(serializers.ModelSerializer):
    detalles = DetalleOrdenSerializer(many=True, read_only=True)
    comprador_nombre = serializers.ReadOnlyField(source='comprador.nombre')
    
    class Meta:
        model = Orden
        fields = [
            'id', 'comprador', 'comprador_nombre', 'fecha', 'estado', 
            'tipo_entrega', 'costo_envio', 'total_iva', 
            'total_comision', 'total_final', 'detalles' 
        ]

# 3. Calificación de Producto (vinculada a una Orden)
class CalificacionProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalificacionProducto
        fields = '__all__'
        read_only_fields = ['fecha']
