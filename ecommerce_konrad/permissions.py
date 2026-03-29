from rest_framework import permissions

# clase vendedor propietario permisos de lectura
class IsVendorOwnerOrReadOnly(permissions.BasePermission):
    """
    Permite acceso de solo lectura a cualquiera (si está autenticado según config global).
    Pero solo el dueño (el Vendor) puede editar o borrar el objeto.
    """
    def has_object_permission(self, request, view, obj):
        # Permisos de lectura (GET, HEAD, OPTIONS) siempre son permitidos
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Si no tiene perfil, no tiene permiso de escritura
        if not hasattr(request.user, 'persona_profile'):
            return False
            
        persona = request.user.persona_profile
        
        if not hasattr(persona, 'vendedor_profile'):
            return False
            
        # obj debe tener un atributo 'vendedor'
        return obj.vendedor == persona.vendedor_profile

# clase administrador permisos de lectura
class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Solo los administradores pueden hacer cambios (POST, PUT, PATCH, DELETE).
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)

# clase director comercial permisos de lectura y escritura
class IsDirectorComercialOrPostOnly(permissions.BasePermission):
    """
    Para Solicitudes: Todos pueden crear (POST) o ver (GET).
    Pero solo los administradores pueden hacer PUT, PATCH, DELETE.
    """
    def has_permission(self, request, view):
        # Permisos de creación son permitidos
        if request.method in permissions.SAFE_METHODS or request.method == 'POST':
            return True
        # Permisos de modificación se exige que sea director comercial o admin     
        es_driector = hasattr(request.user, 'director_comercial_profile')

        es_admin = bool(request.user and request.user.is_staff)

        return es_driector or es_admin

# clase identificar director comercial
class IsDirectorComercial(permissions.BasePermission):
    """
    Permiso exclusivo para el rol de Director Comercial
    """
    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and 
        hasattr(request.user, 'director_comercial_profile'))