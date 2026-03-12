from django.contrib import admin
from .models import Orden, DetalleOrden

admin.site.register(Orden)
admin.site.register(DetalleOrden)
