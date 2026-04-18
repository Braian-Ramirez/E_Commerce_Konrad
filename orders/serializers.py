from rest_framework import serializers
from .models import Orden, DetalleOrden, CalificacionProducto
from payments.serializers import PagoOrdenSerializer

# 1. Primero el Detalle (porque la Orden lo usará)
class DetalleOrdenSerializer(serializers.ModelSerializer):
    producto_nombre = serializers.ReadOnlyField(source='producto.nombre')
    producto_imagen = serializers.SerializerMethodField()
    ya_calificado = serializers.SerializerMethodField()
    orden_estado = serializers.ReadOnlyField(source='orden.estado')
    orden_fecha = serializers.ReadOnlyField(source='orden.fecha')
    comprador_nombre = serializers.ReadOnlyField(source='orden.comprador.nombre')
    
    def get_ya_calificado(self, obj):
        from products.models import ComentarioProducto
        return ComentarioProducto.objects.filter(
            producto=obj.producto, 
            orden=obj.orden, 
            comprador=obj.orden.comprador
        ).exists()

    def get_producto_imagen(self, obj):
        if hasattr(obj.producto, 'imagenes') and obj.producto.imagenes.exists():
            imagen_obj = obj.producto.imagenes.first().imagen
            return imagen_obj.url if imagen_obj else None
        if hasattr(obj.producto, 'descripcion') and '||IMG:' in obj.producto.descripcion:
            import re
            match = re.search(r'\|\|IMG:(.*?)\|\|', obj.producto.descripcion)
            if match: return match.group(1)
        return '📦'

    class Meta:
        model = DetalleOrden
        fields = ['id', 'orden', 'producto', 'producto_nombre', 'producto_imagen', 'cantidad', 'valor_unitario', 'ya_calificado', 'orden_estado', 'orden_fecha', 'comprador_nombre']

    def validate(self, attrs):
        # Para creación (self.instance es None), obtenemos de attrs directamente
        producto = attrs.get('producto') or (self.instance.producto if self.instance else None)
        cantidad_pedida = attrs.get('cantidad') or (self.instance.cantidad if self.instance else None)

        if producto is None or cantidad_pedida is None:
            return attrs  # Dejar que la validación de campos requeridos lo maneje

        # Validación para cantidades negativas o cero
        if cantidad_pedida <= 0:
            raise serializers.ValidationError({
                "cantidad": "Cantidad inválida: solo puede seleccionar cantidades mayores a cero"
            })

        # Validación para cantidades mayores al stock    
        if producto.cantidad < cantidad_pedida:
            raise serializers.ValidationError({
                "cantidad": f"No hay suficiente stock. Stock actual: {producto.cantidad}"
            })

        # Validación estado de la orden
        orden = attrs.get('orden') or (self.instance.orden if self.instance else None)
        if orden and orden.estado != 'CARRITO':
            raise serializers.ValidationError("No puede modificar un producto de una orden que ya no se encuentra en su carrito")
        return attrs

# 2. Luego la Orden
class OrdenSerializer(serializers.ModelSerializer):
    detalles = DetalleOrdenSerializer(many=True, read_only=True)
    pagos = PagoOrdenSerializer(many=True, read_only=True)
    comprador_nombre = serializers.ReadOnlyField(source='comprador.nombre')
    
    class Meta:
        model = Orden
        fields = [
            'id', 'comprador', 'comprador_nombre', 'fecha', 'estado', 
            'tipo_entrega', 'costo_envio', 'total_iva', 
            'total_comision', 'total_final', 'detalles', 'pagos'
        ]
        # comprador se inyecta desde perform_create; no es necesario en el body del request
        read_only_fields = ['comprador', 'comprador_nombre', 'fecha', 'estado',
                            'costo_envio', 'total_iva', 'total_comision', 'total_final']

# 3. Calificación de Producto (vinculada a una Orden)
class CalificacionProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalificacionProducto
        fields = '__all__'
        read_only_fields = ['fecha']
