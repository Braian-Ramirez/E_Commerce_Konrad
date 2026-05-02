from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_error_view(request):
    """
    Vista de prueba para forzar un error y verificar que se guarde en LogError.
    Requiere estar autenticado para capturar al usuario.
    """
    try:
        resultado = 1 / 0
    except Exception as e:
        logger.error(f"Error forzado en vista de prueba: {str(e)}", exc_info=True)
        return HttpResponse(f"Error capturado y logueado para el usuario: {request.user}. Revisa la tabla LogError.")

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_unhandled_error_view(request):
    """
    Vista de prueba para un error NO manejado.
    """
    return 1 / 0
