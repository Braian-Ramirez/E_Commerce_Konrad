from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.db.models import Avg
from .models import ComentarioProducto

@receiver(post_save, sender=ComentarioProducto)
def actualizar_calificacion_vendedor(sender, instance, created, **kwargs):
    """
    Cada vez que se crea o actualiza un comentario (que contiene la calificación del producto),
    se recalcula la calificación promedio del vendedor y se sincroniza con el modelo CalificacionVendedor.
    """
    vendedor = instance.producto.vendedor
    
    # Sincronizar automáticamente con la sección "Calificaciones de Vendedor" (Django Admin)
    # Importamos adentro para evitar dependencias circulares
    from vendors.models import CalificacionVendedor
    
    if created:
        CalificacionVendedor.objects.create(
            vendedor=vendedor,
            comprador=instance.comprador,
            estrellas=instance.calificacion,
            comentario=instance.comentario,
            fecha=instance.fecha
        )
    else:
        # Si se actualiza, buscamos el registro correspondiente y lo actualizamos
        calif_vendedor = CalificacionVendedor.objects.filter(
            vendedor=vendedor,
            comprador=instance.comprador,
            fecha=instance.fecha
        ).first()
        if calif_vendedor:
            calif_vendedor.estrellas = instance.calificacion
            calif_vendedor.comentario = instance.comentario
            calif_vendedor.save()

    # Calculamos el promedio agrupando todos los comentarios de todos los productos de este vendedor
    promedio = ComentarioProducto.objects.filter(
        producto__vendedor=vendedor
    ).aggregate(promedio_calificacion=Avg('calificacion'))['promedio_calificacion']
    
    if promedio is not None:
        vendedor.calificacion_promedio = round(promedio, 2)
    else:
        vendedor.calificacion_promedio = 0.00
        
    vendedor.save()

@receiver(post_delete, sender=ComentarioProducto)
def eliminar_calificacion_vendedor(sender, instance, **kwargs):
    vendedor = instance.producto.vendedor
    from vendors.models import CalificacionVendedor
    
    # Eliminar la copia en la sección del vendedor
    CalificacionVendedor.objects.filter(
        vendedor=vendedor,
        comprador=instance.comprador,
        fecha=instance.fecha
    ).delete()

    # Recalcular promedio
    promedio = ComentarioProducto.objects.filter(
        producto__vendedor=vendedor
    ).aggregate(promedio_calificacion=Avg('calificacion'))['promedio_calificacion']
    
    if promedio is not None:
        vendedor.calificacion_promedio = round(promedio, 2)
    else:
        vendedor.calificacion_promedio = 0.00
        
    vendedor.save()
