from django.contrib import admin
from .models import Notificacion, CorreoEnviado

class CorreoEnviadoAdmin(admin.ModelAdmin):
    list_display = ('destinatario', 'asunto', 'fecha_envio')
    readonly_fields = ('fecha_envio', 'timestamp_hash')

admin.site.register(Notificacion)
admin.site.register(CorreoEnviado, CorreoEnviadoAdmin)
