from django.contrib import admin
from .models import Comprador

class CompradorAdmin(admin.ModelAdmin):
    # Mostramos datos del comprador trayendo info de la Persona vinculada
    list_display = ('get_nombre_completo', 'puntos_recompensa', 'twitter', 'instagram')
    search_fields = ('persona__nombre', 'persona__apellido', 'persona__email', 'persona__user__username')
    list_select_related = ('persona', 'persona__user') # Optimización SQL para que no sea lento

    def get_nombre_completo(self, obj):
        # Fallback inteligente: Si no tiene nombre en Persona, buscamos en el User, si no, el username
        p = obj.persona
        u = p.user
        nombre_persona = f"{p.nombre} {p.apellido}".strip()
        
        if not nombre_persona and u:
            nombre_persona = f"{u.first_name} {u.last_name}".strip()
        
        return nombre_persona if nombre_persona else (u.username if u else "Comprador Desconocido")
        
    get_nombre_completo.short_description = 'Nombre Completo / Usuario'

admin.site.register(Comprador, CompradorAdmin)
