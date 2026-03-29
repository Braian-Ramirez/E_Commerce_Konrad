from django.db.models.signals import post_save
from django.dispatch import receiver
from vendors.models import Solicitud

# Receptor (Observer) de la señal post_save
@receiver(post_save, sender=Solicitud)
def enviar_notificacion_solicitud(sender, instance, created, **kwargs):
    # 'instance' es el objeto especifico que se acaba de guardar en BD
    # 'created' es True si es nuevo, False si es update
    
    if not created:
        if instance.estado == 'APROBADA':
            print(f"📧 SIMULANDO ENVÍO DE CORREO: ¡Felicidades {instance.persona.nombre}, solicitud APROBADA! Te enviaremos pronto tus credenciales.")

        elif instance.estado == 'RECHAZADA':
            print(f"📧 SIMULANDO ENVÍO DE CORREO: Hola {instance.persona.nombre}, lo sentimos. Tu solicitud fue rechazada por antecedentes o datacrédito.")       
    
        elif instance.estado == 'DEVUELTA':
            print(f"📧 SIMULANDO ENVÍO DE CORREO: Hola {instance.persona.nombre}, solicitud DEVUELTA. Tu vida crediticia esta en advertencia, podrás iniciar un nuevo proceso cuando tu calificción sea alta.")
                