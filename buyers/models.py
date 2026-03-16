from django.db import models
from vendors.models import Persona

class Comprador(models.Model):
    persona = models.OneToOneField(
        Persona, 
        on_delete=models.CASCADE, 
        related_name='perfil_comprador'
    )
    puntos_recompensa = models.IntegerField(default=0, help_text="Puntos ganados por compras")
    direccion_envio_principal = models.TextField(blank=True, null=True)
    twitter = models.CharField(max_length=100, blank=True, null=True)
    instagram = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"Comprador: {self.persona.nombre} {self.persona.apellido}"

    class Meta:
        verbose_name = "Comprador"
        verbose_name_plural = "Compradores"
