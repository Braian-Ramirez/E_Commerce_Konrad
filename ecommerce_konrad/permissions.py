from rest_framework import permissions

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

class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Solo los administradores pueden hacer cambios (POST, PUT, PATCH, DELETE).
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_staff)

class IsAdminOrPostOnly(permissions.BasePermission):
    """
    Para Solicitudes: Todos pueden crear (POST) o ver (GET).
    Pero solo los administradores pueden hacer PUT, PATCH, DELETE.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS or request.method == 'POST':
            return True
        return bool(request.user and request.user.is_staff)
