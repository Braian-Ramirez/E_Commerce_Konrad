import hashlib
import time
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from .models import CorreoEnviado


def _registrar_auditoria_correo(persona, asunto, cuerpo):
    """
    Genera el estampado de tiempo (hash SHA-256) y registra
    el correo en la base de datos ANTES de intentar enviarlo.
    """
    timestamp_raw = f"{persona.email}-{asunto}-{time.time()}"
    timestamp_hash = hashlib.sha256(timestamp_raw.encode()).hexdigest()

    CorreoEnviado.objects.create(
        destinatario=persona,
        asunto=asunto,
        cuerpo=cuerpo,
        timestamp_hash=timestamp_hash
    )
    return timestamp_hash


def _enviar_safe(asunto, mensaje, destinatario):
    """
    Envío seguro: si el SMTP falla, NO interrumpe el flujo HTTP principal.
    El registro de auditoría ya fue guardado antes de llamar a esta función.
    """
    try:
        send_mail(asunto, mensaje, settings.DEFAULT_FROM_EMAIL, [destinatario])
    except Exception as e:
        print(f"[NOTIFICACIONES] Error al enviar correo a {destinatario}: {e}")


def enviar_correo_bienvenida_vendedor(persona, password):
    """
    Bienvenida con credenciales para vendedor aprobado (auditado).
    """
    asunto = '🚀 ¡Bienvenido a Comercial Konrad! - Cuenta Aprobada'
    context = {
        'nombre': persona.nombre,
        'email': persona.email,
        'password': password
    }
    mensaje = render_to_string('notifications/emails/bienvenida_vendedor.txt', context)
    _registrar_auditoria_correo(persona, asunto, mensaje)
    _enviar_safe(asunto, mensaje, persona.email)


def enviar_correo_devolucion(persona):
    """
    Notificación de devolución con registro de auditoría.
    """
    asunto = '⚠️ Comercial Konrad - Solicitud en Revisión (Acción Requerida)'
    context = {'nombre': persona.nombre}
    mensaje = render_to_string('notifications/emails/devolucion_vendedor.txt', context)
    _registrar_auditoria_correo(persona, asunto, mensaje)
    _enviar_safe(asunto, mensaje, persona.email)


def enviar_correo_rechazo(persona):
    """
    Notificación de rechazo con registro de auditoría.
    """
    asunto = '🚫 Comercial Konrad - Resultados de Solicitud de Vendedor'
    context = {'nombre': persona.nombre}
    mensaje = render_to_string('notifications/emails/rechazo_vendedor.txt', context)
    _registrar_auditoria_correo(persona, asunto, mensaje)
    _enviar_safe(asunto, mensaje, persona.email)


def enviar_correo_bienvenida_comprador(persona, password):
    """
    Bienvenida con credenciales para nuevo comprador (auditado).
    """
    asunto = '🎁 ¡Bienvenido a Comercial Konrad! - Tu aventura empieza aquí'
    context = {
        'nombre': persona.nombre,
        'email': persona.email,
        'password': password
    }
    mensaje = render_to_string('notifications/emails/bienvenida_comprador.txt', context)
    _registrar_auditoria_correo(persona, asunto, mensaje)
    _enviar_safe(asunto, mensaje, persona.email)
