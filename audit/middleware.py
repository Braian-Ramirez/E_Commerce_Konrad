import threading

_thread_locals = threading.local()

def get_current_user():
    return getattr(_thread_locals, 'user', None)

class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # El usuario suele ser puesto por AuthenticationMiddleware antes que nosotros
        user = getattr(request, 'user', None)
        
        # Para DRF y JWT, el usuario a veces no se ha cargado aún. 
        # Intentamos forzar la carga si vemos un Header de Autorización.
        if (not user or user.is_anonymous) and 'HTTP_AUTHORIZATION' in request.META:
            from rest_framework_simplejwt.authentication import JWTAuthentication
            try:
                res = JWTAuthentication().authenticate(request)
                if res:
                    user = res[0]
            except:
                pass

        _thread_locals.user = user
        
        try:
            return self.get_response(request)
        finally:
            if hasattr(_thread_locals, 'user'):
                _thread_locals.user = None # Mejor que del para evitar errores de atributo
