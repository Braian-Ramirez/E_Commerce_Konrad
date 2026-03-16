from django.contrib import admin
from .models import Categoria, Subcategoria, Producto, ImagenProducto, PreguntaProducto, ComentarioProducto, CostoDomicilio

class ProductoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'vendedor', 'valor', 'cantidad', 'condicion', 'autenticidad')
    list_filter = ('vendedor', 'condicion', 'autenticidad')
    search_fields = ('nombre', 'marca')

class CategoriaAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'porcentaje_comision', 'aplica_iva')

class CostoDomicilioAdmin(admin.ModelAdmin):
    list_display = ('ciudad', 'peso_min', 'peso_max', 'costo')

admin.site.register(Categoria, CategoriaAdmin)
admin.site.register(Subcategoria)
admin.site.register(Producto, ProductoAdmin)
admin.site.register(ImagenProducto)
admin.site.register(PreguntaProducto)
admin.site.register(ComentarioProducto)
admin.site.register(CostoDomicilio, CostoDomicilioAdmin)
