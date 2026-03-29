from rest_framework import serializers
from .models import Orden, DetalleOrden, CalificacionProducto

# 1. Primero el Detalle (porque la Orden lo usará)
class DetalleOrdenSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.ReadOnlyField(source='producto.nombre')
    
    class Meta:
        model = DetalleOrden
        fields = ['id', 'producto', 'producto_nombre', 'cantidad', 'valor_unitario']

    def validate(self, attrs):
        # Obtener datos del carrito
        producto = attrs.get('producto') or self.instance.producto
        cantidad_pedida = attrs.get('cantidad') or self.instance.cantidad

        # Validación para cantidades negativas o cero
        if cantidad_pedida <= 0:
            raise serializers.ValidationError({
                "cantidad": f"cantidad invalida solo puede seleccionar cantidades mayores a cero"
            })

        # Validación para cantidades mayores al stock    
        if producto.cantidad < cantidad_pedida:
            raise serializers.ValidationError({
                "cantidad": f"No hay suficiente stock. Stock actual: {producto.cantidad}"
            })     

        # Validación estado de la orden
        orden = attrs.get('orden') or self.instance.orden
        if orden.estado != 'CARRITO':
            raise serializers.ValidationError("No puede modificar un producto de una orden que ya no se encuentra en su carrito")
        return attrs

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
