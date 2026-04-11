from rest_framework import serializers
from .models import Categoria, Subcategoria, Producto, ImagenProducto, CostoDomicilio, ComentarioProducto, PreguntaProducto

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
        fields = [
            'id', 'producto', 'comprador', 'comprador_nombre', 
            'comentario', 'calificacion', 'respuesta_vendedor', 
            'fecha_respuesta', 'fecha'
        ]
        read_only_fields = ['fecha', 'comprador', 'fecha_respuesta']

# Serializador Preguntas
class PreguntaProductoSerializer(serializers.ModelSerializer):
    comprador_nombre = serializers.SerializerMethodField()
    
    def get_comprador_nombre(self, obj):
        if hasattr(obj, 'comprador') and obj.comprador:
            return f"{obj.comprador.nombre} {obj.comprador.apellido}"
        return "Comprador"

    class Meta:
        model = PreguntaProducto
        fields = ['id', 'producto', 'comprador', 'comprador_nombre', 'pregunta', 'respuesta', 'fecha_pregunta', 'fecha_respuesta']
        read_only_fields = ['fecha_pregunta', 'fecha_respuesta', 'comprador']

# Serializador Producto (Enriquecido para Producción)
class ProductoSerializer(serializers.ModelSerializer):
    imagenes = ImagenProductoSerializer(many=True, read_only=True)
    comentarios = ComentarioProductoSerializer(many=True, read_only=True)
    preguntas = PreguntaProductoSerializer(many=True, read_only=True)
    categoria_nombre = serializers.ReadOnlyField(source='categoria.nombre')
    vendedor_nombre = serializers.ReadOnlyField(source='vendedor.persona.nombre')
    
    class Meta:
        model = Producto
        fields = [
            'id', 'vendedor', 'vendedor_nombre', 'categoria', 'categoria_nombre', 
            'subcategoria', 'nombre', 'marca', 'descripcion', 'autenticidad',
            'color', 'tamano', 'peso', 'talla', 'condicion', 
            'cantidad', 'valor', 'fecha_publicacion', 'imagenes', 'comentarios', 'preguntas'
        ]
        extra_kwargs = {
            'vendedor': {'read_only': True}
        }

# Serializador CostoDomicilio
class CostoDomicilioSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostoDomicilio
        fields = '__all__'