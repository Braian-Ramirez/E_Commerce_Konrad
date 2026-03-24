from django.db import models
from vendors.models import Persona
from products.models import Producto

# Modelo Orden
class Orden(models.Model):
    ESTADO_ORDEN_CHOICES = [
        ('CARRITO', 'Carrito Activo'),
        ('PENDIENTE', 'Pendiente de pago'),
        ('PAGADA', 'Pagada / Completada'),
        ('ENVIADA', 'Enviada'),
        ('CANCELADA', 'Cancelada'),
    ]

    TIPO_ENTREGA_CHOICES = [
        ('RECOGER', 'Recoger en punto'),
        ('DOMICILIO', 'Entrega en domicilio'),
    ]

    comprador = models.ForeignKey(Persona, on_delete=models.CASCADE, related_name='ordenes')
    fecha = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=20, choices=ESTADO_ORDEN_CHOICES, default='CARRITO')
    tipo_entrega = models.CharField(max_length=20, choices=TIPO_ENTREGA_CHOICES, default='RECOGER')
    costo_envio = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Datos auditoria 
    total_iva = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_comision = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_final = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    def __str__(self):
        return f"Orden #{self.id} - {self.comprador.nombre} [{self.get_estado_display()}]"

    class Meta:
        verbose_name = "Orden"
        verbose_name_plural = "Órdenes"

# Modelo Detalle Orden
class DetalleOrden(models.Model):
    orden = models.ForeignKey(Orden, on_delete=models.CASCADE, related_name='detalles')
    producto = models.ForeignKey(Producto, on_delete=models.RESTRICT, related_name='detalles_orden')
    cantidad = models.IntegerField(default=1)
    valor_unitario = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.cantidad} x {self.producto.nombre}"

    class Meta:
        verbose_name = "Detalle de orden"
        verbose_name_plural = "Detalles de orden"

# Calificación de Producto (solo si hay una orden PAGADA)
class CalificacionProducto(models.Model):
    producto = models.ForeignKey(Producto, on_delete=models.CASCADE, related_name='calificaciones')
    orden = models.ForeignKey(Orden, on_delete=models.CASCADE, related_name='calificaciones')
    comprador = models.ForeignKey(Persona, on_delete=models.SET_NULL, null=True, related_name='calificaciones_producto')
    puntuacion = models.IntegerField(choices=[(i, f"{i}/10") for i in range(1, 11)])
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Un comprador solo puede calificar un producto UNA VEZ por orden
        unique_together = [['producto', 'orden', 'comprador']]
        verbose_name = "Calificación de Producto"
        verbose_name_plural = "Calificaciones de Productos"

    def __str__(self):
        return f"{self.puntuacion}/10 para {self.producto.nombre} (Orden #{self.orden.id})"
