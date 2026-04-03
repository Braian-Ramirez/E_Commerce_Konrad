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

# Modelo Medio de Pago
class MedioPago(models.Model):
    TIPO_MEDIO_CHOICES = [
        ('TARJETA', 'Tarjeta de Crédito / Débito'),
        ('CUENTA', 'Cuenta Bancaria'),
        ('BILLETERA', 'Billetera Digital (Nequi/Daviplata)'),
    ]

    comprador = models.ForeignKey(Comprador, on_delete=models.CASCADE, related_name='medios_pago')
    banco_nombre = models.CharField(max_length=100, help_text="Ej: Nu, Bancolombia, Nequi")
    titular_nombre = models.CharField(max_length=200)
    tipo = models.CharField(max_length=20, choices=TIPO_MEDIO_CHOICES, default='TARJETA')
    # En un sistema real esto iría cifrado o manejado por un vault externo (ej: Stripe/PCI DSS)
    # Por ahora lo guardamos como texto de referencia para el prototipo
    numero_cuenta_tarjeta = models.CharField(max_length=20, help_text="Número de cuenta o tarjeta")
    token_seguridad = models.CharField(max_length=100, blank=True, null=True, help_text="Simulación de Token/OTP")
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.banco_nombre} - {self.numero_cuenta_tarjeta[-4:]}"

    class Meta:
        verbose_name = "Medio de Pago"
        verbose_name_plural = "Medios de Pago"

