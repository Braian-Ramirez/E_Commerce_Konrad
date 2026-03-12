from django.contrib import admin
from .models import Categoria, Subcategoria, Producto, ImagenProducto

admin.site.register(Categoria)
admin.site.register(Subcategoria)
admin.site.register(Producto)
admin.site.register(ImagenProducto)


# Register your models here.
