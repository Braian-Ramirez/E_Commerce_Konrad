from django.db import models
from vendors.models import Persona

# Modelo Notificacion
class Notificacion(models.Model):
    TIPO_NOTIFICACION_CHOICES = [
        ('SOLICITUD', 'Actualización de Solicitud'),
        ('COMPRA', 'Nueva Compra'),
        ('SISTEMA', 'Aviso del Sistema'),
    ]

    persona = models.ForeignKey(Persona, on_delete=models.CASCADE, related_name='notificaciones')
    tipo = models.CharField(max_length=20, choices=TIPO_NOTIFICACION_CHOICES)
    mensaje = models.TextField()
    leida = models.BooleanField(default=False)
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tipo} para {self.persona.nombre} - {'Leída' if self.leida else 'No leída'}"

    class Meta:
        verbose_name = "Notificación"
        verbose_name_plural = "Notificaciones"
        ordering = ['-fecha_creacion']  # Muestra las más nuevas primero
