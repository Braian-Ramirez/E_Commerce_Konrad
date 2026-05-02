import threading
from django.utils.functional import SimpleLazyObject

_thread_locals = threading.local()

def get_current_user():
    return getattr(_thread_locals, 'user', None)

class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1. Intentar obtener el usuario de la sesión estándar (Admin/Session)
        user = getattr(request, 'user', None)
        
        # 2. Si es anónimo, intentar capturar el usuario desde el JWT (Frontend/API)
        if not user or user.is_anonymous:
            # En Django, los headers vienen en request.META con el prefijo HTTP_
            header = request.META.get('HTTP_AUTHORIZATION')
            if header:
                from rest_framework_simplejwt.authentication import JWTAuthentication
                try:
                    # Creamos un objeto de autenticación manual
                    auth_res = JWTAuthentication().authenticate(request)
                    if auth_res:
                        user = auth_res[0] # Usuario autenticado vía Token
                except Exception:
                    pass

        # 3. Guardar en el hilo local para que esté disponible en signals y utilidades
        _thread_locals.user = user
        
        try:
            response = self.get_response(request)
            return response
        finally:
            # Limpiar al finalizar la petición
            if hasattr(_thread_locals, 'user'):
                _thread_locals.user = None
