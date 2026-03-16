from django.contrib import admin
from .models import PagoOrden, Suscripcion, ConsignacionBancaria

class SuscripcionAdmin(admin.ModelAdmin):
    list_display = ('vendedor', 'tipo', 'fecha_inicio', 'fecha_fin', 'activo')

class ConsignacionAdmin(admin.ModelAdmin):
    list_display = ('vendedor', 'referencia', 'validada', 'fecha_subida')

admin.site.register(PagoOrden)
admin.site.register(Suscripcion, SuscripcionAdmin)
admin.site.register(ConsignacionBancaria, ConsignacionAdmin)
