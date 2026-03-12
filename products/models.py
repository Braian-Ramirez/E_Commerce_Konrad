from django.db import models
from vendors.models import Vendedor
# Modelo Categoria
class Categoria(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    porcentaje_comision = models.DecimalField(max_digits=5, decimal_places=2, help_text="5.00 para 5%")
    aplica_iva = models.BooleanField(default=True)
    descripcion = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Categoria"
        verbose_name_plural = "Categorias"

# Modelo Subcategoria
class Subcategoria(models.Model):
    categoria = models.ForeignKey(Categoria, on_delete=models.CASCADE, related_name='subcategorias')
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Subcategoria"
        verbose_name_plural = "Subcategorias"

# Modelo Producto
class Producto(models.Model):
    CONDICION_CHOICES = [
        ('NUEVO', 'Nuevo'),
        ('USADO', 'Usado'),
    ]

    ORIGINALIDAD_CHOICES = [
        ('ORIGINAL', 'Original'),
        ('GENERICO', 'Generico'),
    ]

    # Relaciones
    vendedor = models.ForeignKey(Vendedor, on_delete=models.CASCADE, related_name='productos')
    categoria = models.ForeignKey(Categoria,on_delete= models.CASCADE, related_name='productos')
    subcategoria = models.ForeignKey(Subcategoria, on_delete=models.CASCADE, related_name='productos')

    # Atributos
    nombre = models.CharField(max_length=200)
    marca = models.CharField(max_length=100)
    originalidad = models.CharField(max_length=20, choices=ORIGINALIDAD_CHOICES, default='ORIGINAL')
    color = models.CharField(max_length=50)
    tamano = models.CharField(max_length=50,blank=True, null=True)
    peso = models.DecimalField(max_digits=10, decimal_places=2, help_text="Peso en kg")
    talla = models.CharField(max_length=20,blank=True, null=True)
    condicion = models.CharField(max_length=10, choices=CONDICION_CHOICES, default='NUEVO')
    cantidad = models.IntegerField(default=1)
    valor = models.DecimalField(max_digits=12, decimal_places=2)

    # Control de tiempo
    fecha_publicacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nombre

    class Meta:
        verbose_name = "Producto"
        verbose_name_plural = "Productos"

# Imagenes producto
class ImagenProducto(models.Model):
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='imagenes')
    imagen = models.ImageField(upload_to='productos_imagenes/')
    es_principal = models.BooleanField(default=False, help_text="Marcar si es la imagen principal que se muestra en el catálogo")

    def __str__(self):
        return f"Imagen de {self.producto.nombre}"

    class Meta:
        verbose_name = "Imagen de Producto"
        verbose_name_plural = "Imágenes de Productos"

# Create your models here.
