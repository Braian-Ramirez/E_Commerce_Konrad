from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Suscripcion

@receiver(post_save, sender=Suscripcion)
def actualizar_vendedor_desde_suscripcion(sender, instance, **kwargs):
    """
    Sincroniza el estado y fecha de vencimiento del Vendedor cuando se guarda una Suscripción.
    """
    vendedor = instance.vendedor
    if instance.activo:
        vendedor.fecha_vencimiento = instance.fecha_fin
        # Si la fecha de fin es a futuro o hoy, asegurar que esté activa
        from django.utils import timezone
        if instance.fecha_fin >= timezone.now().date():
            vendedor.estado_suscripcion = 'ACTIVA'
        vendedor.save()
