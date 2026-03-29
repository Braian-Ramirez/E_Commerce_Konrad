from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from vendors.models import Solicitud

@receiver(post_save, sender=Solicitud)
def enviar_notificacion_solicitud(sender, instance, created, **kwargs):
    if not created:
        correo_destino = instance.persona.email
        
        # --- LÓGICA DE APROBACIÓN ---
        if instance.estado == 'APROBADA':
            asunto = '¡Bienvenido a Comercial Konrad!'
            mensaje = f'¡Felicidades {instance.persona.nombre}! Su solicitud fue APROBADA. Pronto recibirá más instrucciones para acceder a su panel de ventas.'
            
            # El disparo automático a internet:
            send_mail(asunto, mensaje, settings.DEFAULT_FROM_EMAIL, [correo_destino], fail_silently=False)

        # --- LÓGICA DE RECHAZO ---
        elif instance.estado == 'RECHAZADA':
            asunto = 'Comercial Konrad - Novedad Solicitud'
            mensaje = f'Hola {instance.persona.nombre}, lo sentimos. Tu solicitud fue rechazada por antecedentes o datacrédito.'
            
            send_mail(asunto, mensaje, settings.DEFAULT_FROM_EMAIL, [correo_destino], fail_silently=False)
            
        # --- LÓGICA DE DEVOLUCIÓN ---
        elif instance.estado == 'DEVUELTA':
            asunto = 'Comercial Konrad - Solicitud en Pausa'
            mensaje = f'Hola {instance.persona.nombre}, solicitud DEVUELTA. Tu vida crediticia esta en advertencia, podrás iniciar un nuevo proceso cuando tu calificación sea alta.'
            
            send_mail(asunto, mensaje, settings.DEFAULT_FROM_EMAIL, [correo_destino], fail_silently=False)
