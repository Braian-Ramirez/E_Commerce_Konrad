from rest_framework import serializers
from .models import Categoria, Subcategoria, Producto, ImagenProducto, CostoDomicilio

#Serializador Categoria
class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'

#Serializador Subcategoria
class SubcategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subcategoria
        fields = '__all__'

#Serializador ImagenProducto
class ImagenProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ImagenProducto
        fields = ['id', 'imagen', 'es_principal']

#Serializador Producto
class ProductoSerializer(serializers.ModelSerializer):
    # Esto traerá las imágenes asociadas al producto en el mismo JSON
    imagenes = ImagenProductoSerializer(many=True, read_only=True)
    categoria_nombre = serializers.ReadOnlyField(source='categoria.nombre')
    
    class Meta:
        model = Producto
        fields = [
            'id', 'vendedor', 'categoria', 'categoria_nombre', 
            'subcategoria', 'nombre', 'marca', 'autenticidad',
            'color', 'tamano', 'peso', 'talla', 'condicion', 
            'cantidad', 'valor', 'fecha_publicacion', 'imagenes'
        ]

#Serializador CostoDomicilio
class CostoDomicilioSerializer(serializers.ModelSerializer):
    class Meta:
        model = CostoDomicilio
        fields = '__all__'
