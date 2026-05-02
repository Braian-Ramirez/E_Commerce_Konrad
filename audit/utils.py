from .models import RegistroAuditoria, LogError
import json
from django.core.serializers.json import DjangoJSONEncoder
from .logic import obtener_identidad_usuario

def registrar_evento_auditoria(instancia, accion, severidad='INFO', detalles=None):
    """
    Función utilitaria para registrar un evento en la tabla de auditoría.
    """
    usuario_str = obtener_identidad_usuario()
    
    # Intentar obtener el ID de la instancia
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

    RegistroAuditoria.objects.create(
        entidad_afectada=entidad,
        id_entidad=id_entidad,
        accion=accion,
        nivel_severidad=severidad,
        usuario_responsable=usuario_str,
        detalles_json=detalles_json
    )

def registrar_error_tecnico(modulo, mensaje, stacktrace=None):
    """
    Registra un error técnico en el Log de Errores.
    """
    usuario_str = obtener_identidad_usuario()

    LogError.objects.create(
        modulo=modulo,
        mensaje_error=mensaje,
        stacktrace=stacktrace,
        usuario_afectado=usuario_str
    )
