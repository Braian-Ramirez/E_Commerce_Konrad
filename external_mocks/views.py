from django.http import JsonResponse
import random
import uuid

# Vistas Centrales de Riesgo (CIFIN/Datacrédito)
def mock_centrales_riesgo(request, identificacion):
    """
    Simula una consulta a CIFIN/Datacrédito.
    Devuelve un score aleatorio y un veredicto.
    """
    # Generamos un puntaje de crédito aleatorio entre 300 y 850
    score = random.randint(300, 850)
    
    if score >= 700:
        resultado = 'ALTA'
    elif score >= 500:
        resultado = 'ADVERTENCIA'
    else:
        resultado = 'BAJA'

    return JsonResponse({
        "documento": identificacion,
        "score_crediticio": score,
        "calificacion": resultado,
        "entidad_simulada": "Mock Datacrédito"
    })

# Vistas Antecedentes Judiciales (Policía/Procuraduría)
def mock_antecedentes_judiciales(request, identificacion):
    """
    Simula una consulta a la Policía/Procuraduría.
    90% de probabilidad de estar limpio.
    """
    # random.random() da un número entre 0 y 1. Si es menor a 0.9, está limpio.
    esta_limpio = random.random() < 0.90 

    return JsonResponse({
        "documento": identificacion,
        "tiene_antecedentes": not esta_limpio,
        "estado": "NO_REQUERIDO" if esta_limpio else "REQUERIDO",
        "entidad_simulada": "Mock Antecedentes Nacionales"
    })

# Vistas Pasarela de Pagos (PayU/Stripe)
def mock_pasarela_pagos(request):
    """
    Simula un intento de cobro en tarjeta de crédito o PSE.
    80% de probabilidad de que el pago pase.
    """
    pago_exitoso = random.random() < 0.80
    referencia = str(uuid.uuid4()) # Genera un ID único como "123e4567-e89b-12d3..."

    return JsonResponse({
        "transaccion_id": referencia,
        "estado": "EXITOSO" if pago_exitoso else "RECHAZADO",
        "mensaje": "Transacción aprobada" if pago_exitoso else "Fondos insuficientes o tarjeta rechazada",
        "entidad_simulada": "Mock Pasarela Pagos (PayU/Stripe)"
    })
