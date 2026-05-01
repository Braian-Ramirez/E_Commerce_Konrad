from .models import RegistroAuditoria
from .middleware import get_current_user
import json
from django.core.serializers.json import DjangoJSONEncoder

def registrar_evento_auditoria(instancia, accion, severidad='INFO', detalles=None):
    """
    Función utilitaria para registrar un evento en la tabla de auditoría.
    """
    usuario = get_current_user()
    
    usuario_str = "Sistema/Anónimo"
    if usuario and not usuario.is_anonymous:
        # Intentar obtener información extendida del perfil Persona
        try:
            if hasattr(usuario, 'persona_profile'):
                persona = usuario.persona_profile
                nombre_completo = f"{persona.nombre} {persona.apellido}"
                
                # Identificar el rol basado en los perfiles hijos o estatus de Django
                rol = "Usuario"
                if usuario.is_superuser:
                    rol = "Superusuario"
                elif usuario.is_staff:
                    rol = "Staff"
                elif hasattr(persona, 'vendedor_profile'):
                    rol = "Vendedor"
                elif hasattr(persona, 'perfil_comprador'):
                    rol = "Comprador"
                elif hasattr(persona, 'director_profile'):
                    rol = "Director Comercial"
                
                usuario_str = f"{nombre_completo} ({rol})"
            else:
                rol = "Admin/Sistema" if usuario.is_staff or usuario.is_superuser else "Usuario"
                usuario_str = f"{usuario.username} ({rol})"
        except Exception:
            usuario_str = f"{usuario.username} (Error en perfil)"
    
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
