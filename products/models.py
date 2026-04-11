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

    AUTENTICIDAD_CHOICES = [
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
    descripcion = models.TextField(default='',help_text="Descripción detallada del producto")
    autenticidad = models.CharField(max_length=20, choices=AUTENTICIDAD_CHOICES, default='ORIGINAL')
    color = models.CharField(max_length=50)
    tamano = models.CharField(max_length=50,blank=True, null=True)
    peso = models.DecimalField(max_digits=10, decimal_places=2, help_text="Peso en kg")
    talla = models.CharField(max_length=20,blank=True, null=True)
    condicion = models.CharField(max_length=10, choices=CONDICION_CHOICES, default='NUEVO')
    cantidad = models.IntegerField(default=1)
    valor = models.DecimalField(max_digits=12, decimal_places=2)
    ventas_totales = models.IntegerField(default=0, help_text="Contador para productos destacados")

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

# Interacción: Preguntas
class PreguntaProducto(models.Model):
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='preguntas')
    comprador = models.ForeignKey('vendors.Persona', on_delete=models.CASCADE)
    pregunta = models.TextField()
    respuesta = models.TextField(blank=True, null=True)
    fecha_pregunta = models.DateTimeField(auto_now_add=True)
    fecha_respuesta = models.DateTimeField(blank=True, null=True)

    class Meta:
        verbose_name = "Pregunta de Producto"
        verbose_name_plural = "Preguntas de Productos"

# Interacción: Comentarios de Compradores
class ComentarioProducto(models.Model):
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='comentarios')
    comprador = models.ForeignKey('vendors.Persona', on_delete=models.CASCADE)
    orden = models.ForeignKey('orders.Orden', on_delete=models.SET_NULL, null=True, blank=True, related_name='comentarios_productos')
    comentario = models.TextField()
    calificacion = models.IntegerField(default=10, help_text="Calificación de 1 a 10")
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Comentario de Producto"
        verbose_name_plural = "Comentarios de Productos"
        unique_together = [['producto', 'orden', 'comprador']]

# Tabla de Costos de Envío
class CostoDomicilio(models.Model):
    ciudad = models.CharField(max_length=100)
    peso_min = models.DecimalField(max_digits=10, decimal_places=2, help_text="En kg")
    peso_max = models.DecimalField(max_digits=10, decimal_places=2, help_text="En kg")
    costo = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"Envío a {self.ciudad} ({self.peso_min}-{self.peso_max}kg)"

    class Meta:
        verbose_name = "Costo de Domicilio"
        verbose_name_plural = "Costos de Domicilio"

