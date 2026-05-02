import logging

class DBLogHandler(logging.Handler):
    """
    Handler de logging personalizado para redirigir logs de Python a nuestra tabla LogError.
    Se separa en este archivo para evitar importaciones circulares en settings.py.
    """
    def emit(self, record):
        # Evitar recursividad si el error ocurre al guardar en la DB
        if record.name == 'django.db.backends':
            return
            
        try:
            # Importamos aquí adentro para evitar problemas de carga inicial de Django
            from .utils import registrar_error_tecnico
            
            stacktrace = self.format(record) if record.exc_info else None
            registrar_error_tecnico(
                modulo=record.name[:50],
                mensaje=record.getMessage(),
                stacktrace=stacktrace
            )
        except Exception:
            # Si falla el guardado del log, no queremos romper la app principal
            pass
