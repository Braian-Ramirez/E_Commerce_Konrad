from django.contrib import admin
from .models import Persona, Solicitud, Documento, Vendedor, ConsultaCrediticia_Local

class PersonaAdmin(admin.ModelAdmin):
    # Campos que verás en la lista principal
    list_display = ('nombre', 'apellido', 'email', 'numero_identificacion', 'tipo_persona', 'get_username')
    
    # Campo de búsqueda para encontrar gente rápido
    search_fields = ('nombre', 'apellido', 'email', 'numero_identificacion')
    
    # Filtro lateral
    list_filter = ('tipo_persona', 'pais')

    # Función para mostrar el username del User vinculado
    def get_username(self, obj):
        return obj.user.username if obj.user else "Sin Usuario"
    get_username.short_description = 'Username'

admin.site.register(Persona, PersonaAdmin)
admin.site.register(Solicitud)
admin.site.register(Documento)
admin.site.register(Vendedor)
