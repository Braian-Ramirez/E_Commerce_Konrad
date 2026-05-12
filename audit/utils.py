from .models import RegistroAuditoria, LogError
import json
from django.core.serializers.json import DjangoJSONEncoder
from .logic import obtener_identidad_usuario
from ecommerce_konrad.messaging import kafka_service
from .middleware import _thread_locals

def registrar_evento_auditoria(instancia, accion, severidad='INFO', detalles=None):
    """
    Registra un evento detallado enviándolo a Kafka y marcando la petición como auditada.
    """
    usuario_str = obtener_identidad_usuario()
    
    try:
        id_entidad = instancia.pk
    except AttributeError:
        id_entidad = 0

    entidad = instancia.__class__.__name__
    
    detalles_json = None
    if detalles:
        try:
            detalles_json = json.loads(json.dumps(detalles, cls=DjangoJSONEncoder))
        except:
            detalles_json = {"error": "No se pudo serializar los detalles"}

    # --- LA MAGIA ---
    # Marcamos que esta petición YA tiene un log detallado
    _thread_locals.audit_completa = True

    # Enviar a Kafka
    kafka_service.publish_event('audit-logs', {
        "entidad": entidad,
        "id_entidad": id_entidad,
        "accion": accion,
        "severidad": severidad,
        "username": usuario_str,
        "detalles": detalles_json
    })

def registrar_error_tecnico(modulo, mensaje, stacktrace=None):
    usuario_str = obtener_identidad_usuario()
    
    kafka_service.publish_event('audit-logs', {
        "entidad": "LOG_ERROR",
        "modulo": modulo,
        "accion": mensaje,
        "severidad": 'ERROR',
        "username": usuario_str,
        "stacktrace": stacktrace
    })
