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

# Registro de Correos Certificados (RNF)
class CorreoEnviado(models.Model):
    destinatario = models.ForeignKey(Persona, on_delete=models.CASCADE, related_name='correos_recibidos')
    asunto = models.CharField(max_length=255)
    cuerpo = models.TextField()
    fecha_envio = models.DateTimeField(auto_now_add=True)
    # Estampado cronológico (timestamp de servidor para validez legal)
    timestamp_hash = models.CharField(max_length=255, blank=True, null=True, help_text="Hash de validez legal")

    def __str__(self):
        return f"Correo a {self.destinatario.email} - {self.fecha_envio}"

    class Meta:
        verbose_name = "Correo Enviado"
        verbose_name_plural = "Correos Enviados"
