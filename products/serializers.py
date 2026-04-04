from rest_framework import serializers
from .models import Categoria, Subcategoria, Producto, ImagenProducto, CostoDomicilio, ComentarioProducto

# Serializador Categoria
class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'

# Serializador Subcategoria
class SubcategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subcategoria
        fields = '__all__'

# Serializador ImagenProducto
class ImagenProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagenProducto
        fields = ['id', 'imagen', 'es_principal']

# Serializador ComentarioProducto
class ComentarioProductoSerializer(serializers.ModelSerializer):
    comprador_nombre = serializers.SerializerMethodField()
    
    def get_comprador_nombre(self, obj):
        if hasattr(obj, 'comprador') and obj.comprador:
            if obj.comprador.nombre:
                return obj.comprador.nombre
            if obj.comprador.user:
                return obj.comprador.user.first_name or obj.comprador.user.username
        return "Usuario Konrad"
    class Meta:
        model = ComentarioProducto
        fields = ['id', 'producto', 'comprador', 'comprador_nombre', 'comentario', 'calificacion', 'fecha']
        read_only_fields = ['fecha', 'comprador']

# Serializador Producto (Enriquecido para Producción)
class ProductoSerializer(serializers.ModelSerializer):
    imagenes = ImagenProductoSerializer(many=True, read_only=True)
    comentarios = ComentarioProductoSerializer(many=True, read_only=True)
    categoria_nombre = serializers.ReadOnlyField(source='categoria.nombre')
    vendedor_nombre = serializers.ReadOnlyField(source='vendedor.persona.nombre')
    
    class Meta:
        model = Producto
        fields = [
            'id', 'vendedor', 'vendedor_nombre', 'categoria', 'categoria_nombre', 
            'subcategoria', 'nombre', 'marca', 'descripcion', 'autenticidad',
            'color', 'tamano', 'peso', 'talla', 'condicion', 
            'cantidad', 'valor', 'fecha_publicacion', 'imagenes', 'comentarios'
        ]

# Serializador CostoDomicilio
class CostoDomicilioSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostoDomicilio
        fields = '__all__'