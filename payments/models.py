from django.db import models
from orders.models import Orden
from vendors.models import Vendedor

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


class Suscripcion(models.Model):
    TIPO_CHOICES = [
        ('MENSUAL', 'Mensual'),
        ('SEMESTRAL', 'Semestral'),
        ('ANUAL', 'Anual'),
    ]

    vendedor = models.ForeignKey(Vendedor, on_delete=models.CASCADE, related_name='historial_suscripciones')
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='MENSUAL')
    monto_pagado = models.DecimalField(max_digits=12, decimal_places=2)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"Suscripción {self.vendedor} (Hasta {self.fecha_fin})"

    class Meta:
        verbose_name = "Suscripción"
        verbose_name_plural = "Suscripciones"

class ConsignacionBancaria(models.Model):
    vendedor = models.ForeignKey(Vendedor, on_delete=models.CASCADE)
    pago_orden = models.OneToOneField('PagoOrden', on_delete=models.SET_NULL, null=True, blank=True, related_name='consignacion')
    referencia = models.CharField(max_length=100, unique=True)
    comprobante_img = models.ImageField(upload_to='consignaciones/', null=True, blank=True)
    validada = models.BooleanField(default=False)
    fecha_subida = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Consignación {self.referencia} - {self.vendedor}"

    class Meta:
        verbose_name = "Consignación Bancaria"
        verbose_name_plural = "Consignaciones Bancarias"

