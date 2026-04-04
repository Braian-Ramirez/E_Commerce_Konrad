from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from vendors.models import Solicitud

# [PATRÓN DE DISEÑO: OBSERVER]
# El decorador @receiver es el Observador que espera la señal del Sujeto (Solicitud).
@receiver(post_save, sender=Solicitud)
def enviar_notificacion_solicitud(sender, instance, created, **kwargs):
    if not created:
        correo_destino = instance.persona.email      
     
        # --- LÓGICA DE RECHAZO ---
        if instance.estado == 'RECHAZADA':
            from .services import enviar_correo_rechazo
            enviar_correo_rechazo(instance.persona)
            
        # --- LÓGICA DE DEVOLUCIÓN ---
        elif instance.estado == 'DEVUELTA':
            from .services import enviar_correo_devolucion
            enviar_correo_devolucion(instance.persona)
