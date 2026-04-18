import hashlib
import time
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from .models import CorreoEnviado
from vendors.models import Persona

def _registrar_auditoria_correo(persona, asunto, cuerpo):
    """
    Genera el estampado de tiempo (hash SHA-256) y registra
    el correo en la base de datos ANTES de intentar enviarlo.
    """
    # Generar el Hash único (Huella Digital Legal)
    timestamp_raw = f"{persona.email}-{asunto}-{time.time()}"
    timestamp_hash = hashlib.sha256(timestamp_raw.encode()).hexdigest()

    # Guardar en la DB de Notificaciones
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


def enviar_correo_otp(persona, otp_code, email_override=None):
    """
    Envía un código OTP de autorización de pago.
    Se audita vinculándolo a la Persona solicitante.
    """
    asunto = '🔐 Código de Autorización - Comercial Konrad'
    
    mensaje = (
        f"Hola,\n\n"
        f"Tu código de seguridad (OTP) para autorizar la transacción en Comercial Konrad es:\n\n"
        f"    {otp_code}\n\n"
        f"Este código es de un solo uso. Si no solicitaste este código, por favor ignora este correo.\n"
    )
    
    _registrar_auditoria_correo(persona, asunto, mensaje)
    
    destino = email_override if email_override else persona.email
    _enviar_safe(asunto, mensaje, destino)


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

def enviar_notificacion_pago_suscripcion(persona, plan, valor, vencimiento):
    """
    Notificación certificada de pago de suscripción con soporte de datos y hash.
    """
    asunto = '✅ Soporte de Pago: Suscripción Activada - Comercial Konrad'
    
    # Primero registramos para obtener el hash, pero el mensaje necesita el hash...
    # Ajustamos: generamos el hash primero
    timestamp_raw = f"{persona.email}-{asunto}-{time.time()}"
    hash_validez = hashlib.sha256(timestamp_raw.encode()).hexdigest()
    
    context = {
        'nombre': persona.nombre,
        'plan': plan,
        'valor': valor,
        'fecha_pago': time.strftime("%d/%m/%Y %H:%M:%S"),
        'fecha_vencimiento': vencimiento,
        'hash_validez': hash_validez
    }
    
    mensaje = render_to_string('notifications/emails/pago_suscripcion.txt', context)
    
    # Guardar en la DB de Notificaciones (Auditoría)
    CorreoEnviado.objects.create(
        destinatario=persona,
        asunto=asunto,
        cuerpo=mensaje,
        timestamp_hash=hash_validez
    )
    
    _enviar_safe(asunto, mensaje, persona.email)

def crear_notificacion(persona, tipo, mensaje):
    """
    Crea una notificación interna en la base de datos para un usuario.
    """
    from .models import Notificacion
    return Notificacion.objects.create(
        persona=persona,
        tipo=tipo,
        mensaje=mensaje
    )
