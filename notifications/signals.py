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
            asunto = 'Comercial Konrad - Novedad Solicitud'
            mensaje = f'Hola {instance.persona.nombre}, lo sentimos. Tu solicitud fue rechazada por antecedentes o datacrédito.'
            
            send_mail(asunto, mensaje, settings.DEFAULT_FROM_EMAIL, [correo_destino], fail_silently=False)
            
        # --- LÓGICA DE DEVOLUCIÓN ---
        elif instance.estado == 'DEVUELTA':
            asunto = 'Comercial Konrad - Solicitud en Pausa'
            mensaje = f'Hola {instance.persona.nombre}, solicitud DEVUELTA. Tu vida crediticia esta en advertencia, podrás iniciar un nuevo proceso cuando tu calificación sea alta.'
            
            send_mail(asunto, mensaje, settings.DEFAULT_FROM_EMAIL, [correo_destino], fail_silently=False)
