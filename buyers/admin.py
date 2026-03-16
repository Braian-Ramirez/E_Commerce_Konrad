from django.contrib import admin
from .models import Comprador

class CompradorAdmin(admin.ModelAdmin):
    # Mostramos datos del comprador trayendo info de la Persona vinculada
    list_display = ('get_nombre_completo', 'puntos_recompensa', 'twitter', 'instagram')
    search_fields = ('persona__nombre', 'persona__apellido', 'persona__email')

    def get_nombre_completo(self, obj):
        return f"{obj.persona.nombre} {obj.persona.apellido}"
    get_nombre_completo.short_description = 'Nombre Completo'

admin.site.register(Comprador, CompradorAdmin)
