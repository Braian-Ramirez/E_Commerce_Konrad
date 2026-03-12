from django.db import models
from orders.models import Orden

# Modelo Pagos
class PagoOrden(models.Model):
    METODO_PAGO_CHOICES = [
        ('TARJETA', 'Tarjeta de Crédito/Débito'),
        ('PSE', 'PSE'),
        ('EFECTIVO', 'Efectivo / Puntos físicos'),
    ]
    ESTADO_PAGO_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('EXITOSO', 'Exitoso'),
        ('RECHAZADO', 'Rechazado'),
    ]

    orden = models.ForeignKey(Orden, on_delete=models.CASCADE, related_name='pagos')
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    metodo_pago = models.CharField(max_length=20, choices=METODO_PAGO_CHOICES)
    estado = models.CharField(max_length=20, choices=ESTADO_PAGO_CHOICES, default='PENDIENTE')
    referencia_transaccion = models.CharField(max_length=100, unique=True, blank=True, null=True)
    fecha_pago = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Pago {self.id} - Orden {self.orden.id} [{self.estado}]"

    class Meta:
        verbose_name = "Pago de Orden"
        verbose_name_plural = "Pagos de Órdenes"
