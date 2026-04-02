from django.contrib import admin
from .models import DirectorComercial

from django.contrib import admin
from .models import DirectorComercial

@admin.register(DirectorComercial)
class DirectorComercialAdmin(admin.ModelAdmin):
    # Aquí 'traemos' campos de la tabla Persona para verlos en la lista
    list_display = ('get_nombre', 'get_email', 'cargo', 'dependencia')
    search_fields = ('persona__nombre', 'persona__apellido', 'persona__email')

    # Funciones auxiliares para mostrar datos de la Persona vinculada
    def get_nombre(self, obj):
        return f"{obj.persona.nombre} {obj.persona.apellido}"
    get_nombre.short_description = 'Nombre Completo'

    def get_email(self, obj):
        return obj.persona.email
    get_email.short_description = 'Correo Electrónico'
