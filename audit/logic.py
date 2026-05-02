from .middleware import get_current_user

def obtener_identidad_usuario():
    """
    Retorna una cadena con el nombre real y rol del usuario actual.
    Lógica centralizada para evitar importaciones circulares.
    """
    usuario = get_current_user()
    usuario_str = "Sistema/Anónimo"
    
    if usuario and not usuario.is_anonymous:
        try:
            if hasattr(usuario, 'persona_profile'):
                persona = usuario.persona_profile
                nombre_completo = f"{persona.nombre} {persona.apellido}"
                
                # Identificar el rol
                rol = "Usuario"
                if usuario.is_superuser:
                    rol = "Superusuario"
                elif usuario.is_staff:
                    rol = "Staff"
                elif hasattr(persona, 'director_profile'):
                    rol = "Director Comercial"
                elif hasattr(persona, 'vendedor_profile'):
                    rol = "Vendedor"
                elif hasattr(persona, 'perfil_comprador'):
                    rol = "Comprador"
                
                usuario_str = f"{nombre_completo} ({rol})"
            else:
                rol = "Admin/Sistema" if usuario.is_staff or usuario.is_superuser else "Usuario"
                usuario_str = f"{usuario.username} ({rol})"
        except Exception:
            usuario_str = f"{usuario.username} (Error en perfil)"
            
    return usuario_str
