from django.db import models

# Modelo Registro de Auditoría
class RegistroAuditoria(models.Model):
    NIVEL_SEVERIDAD_CHOICES = [
        ('INFO', 'Información'),
        ('WARNING', 'Advertencia'),
        ('ERROR', 'Error Crítico'),
    ]

    entidad_afectada = models.CharField(max_length=50, help_text="Ej: Orden, Producto, Vendedor")
    id_entidad = models.IntegerField(help_text="ID del registro modificado")
    accion = models.CharField(max_length=255, help_text="Ej: Cambio de estado de Pendiente a Pagada")
    nivel_severidad = models.CharField(max_length=10, choices=NIVEL_SEVERIDAD_CHOICES, default='INFO')
    usuario_responsable = models.CharField(max_length=100, blank=True, null=True, help_text="Quién hizo el cambio")
    fecha_evento = models.DateTimeField(auto_now_add=True)
    detalles_json = models.JSONField(blank=True, null=True, help_text="Datos técnicos adicionales en formato JSON")

    def __str__(self):
        return f"[{self.nivel_severidad}] {self.entidad_afectada} {self.id_entidad} - {self.fecha_evento}"

    class Meta:
        verbose_name = "Registro de Auditoría"
        verbose_name_plural = "Registros de Auditoría"

# Modelo Log de Errores Técnicos
class LogError(models.Model):
    fecha = models.DateTimeField(auto_now_add=True)
    modulo = models.CharField(max_length=50) # Ej: Pago, Producto
    mensaje_error = models.TextField()
    stacktrace = models.TextField(blank=True, null=True) 
    usuario_afectado = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"Error en {self.modulo} - {self.fecha}"

    class Meta:
        verbose_name = "Log de Error"
        verbose_name_plural = "Logs de Errores"
