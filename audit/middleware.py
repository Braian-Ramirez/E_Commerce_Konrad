import threading
from django.utils.functional import SimpleLazyObject
# pyrefly: ignore [missing-import]
from rest_framework_simplejwt.authentication import JWTAuthentication
from ecommerce_konrad.messaging import kafka_service

_thread_locals = threading.local()

def get_current_user():
    return getattr(_thread_locals, 'user', None)

class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # 1. Identificar al usuario
        user = getattr(request, 'user', None)
        if not user or user.is_anonymous:
            header = request.META.get('HTTP_AUTHORIZATION')
            if header:
                try:
                    auth_res = JWTAuthentication().authenticate(request)
                    if auth_res:
                        user = auth_res[0]
                except Exception:
                    pass

        _thread_locals.user = user
        
        audit_data = {
            "user_id": user.id if user and user.is_authenticated else None,
            "username": user.username if user and user.is_authenticated else "Anónimo",
            "path": request.path,
            "method": request.method,
            "ip": request.META.get('REMOTE_ADDR', '127.0.0.1'),
        }

        try:
            response = self.get_response(request)
            
            # 2. FILTRADO INTELIGENTE
            metodos_auditables = ['POST', 'PUT', 'PATCH', 'DELETE']
            rutas_ignoradas = ['/admin/', '/api/audit/']
            es_ruta_ignorada = any(request.path.startswith(ruta) for ruta in rutas_ignoradas)
            
            # --- LA MAGIA ---
            # Si la función utilitaria ya registró el evento, saltamos este paso
            ha_sido_auditado = getattr(_thread_locals, 'audit_completa', False)

            if request.method in metodos_auditables and not es_ruta_ignorada and not ha_sido_auditado:
                audit_data["status_code"] = response.status_code
                kafka_service.publish_event('audit-logs', audit_data)
            
            return response
            
        finally:
            # LIMPIAR SIEMPRE AMBAS BANDERAS
            if hasattr(_thread_locals, 'audit_completa'):
                del _thread_locals.audit_completa
            if hasattr(_thread_locals, 'user'):
                del _thread_locals.user
