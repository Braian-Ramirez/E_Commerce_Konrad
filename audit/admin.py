from django.contrib import admin
from .models import RegistroAuditoria, LogError

class RegistroAuditoriaAdmin(admin.ModelAdmin):
    # Esto hace que la fecha aparezca en el formulario pero no se pueda editar
    readonly_fields = ('fecha_evento',)
    list_display = ('entidad_afectada', 'accion', 'nivel_severidad', 'fecha_evento')

class LogErrorAdmin(admin.ModelAdmin):
    readonly_fields = ('fecha',)
    list_display = ('modulo', 'mensaje_error', 'fecha')

admin.site.register(RegistroAuditoria, RegistroAuditoriaAdmin)
admin.site.register(LogError, LogErrorAdmin)


