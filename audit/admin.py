from django.contrib import admin
from .models import RegistroAuditoria, LogError

class RegistroAuditoriaAdmin(admin.ModelAdmin):
    readonly_fields = ('fecha_evento', 'usuario_responsable', 'id_entidad', 'entidad_afectada', 'accion', 'detalles_json')
    list_display = ('entidad_afectada', 'accion', 'usuario_responsable', 'nivel_severidad', 'fecha_evento')
    list_filter = ('nivel_severidad', 'entidad_afectada', 'fecha_evento')
    search_fields = ('usuario_responsable', 'entidad_afectada', 'accion')

class LogErrorAdmin(admin.ModelAdmin):
    readonly_fields = ('fecha',)
    list_display = ('modulo', 'mensaje_error', 'fecha')
    list_filter = ('modulo', 'fecha')
    search_fields = ('mensaje_error', 'modulo')

admin.site.register(RegistroAuditoria, RegistroAuditoriaAdmin)
admin.site.register(LogError, LogErrorAdmin)


