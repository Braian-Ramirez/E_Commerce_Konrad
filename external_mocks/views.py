from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from django.http import JsonResponse
import random
import uuid
import json

# Vista CIFIN (TransUnion)
def mock_cifin(request, identificacion):
    score = random.randint(300, 850)
    resultado = 'ALTA' if score >= 650 else ('ADVERTENCIA' if score >= 450 else 'BAJA')
    return JsonResponse({
        "documento": identificacion,
        "score_cifin": score,
        "calificacion": resultado,
        "entidad_simulada": "CIFIN (TransUnion)"
    })

# Vista Datacrédito (Experian)
def mock_datacredito(request, identificacion):
    score = random.randint(350, 900)
    resultado = 'ALTA' if score >= 700 else ('ADVERTENCIA' if score >= 500 else 'BAJA')
    return JsonResponse({
        "documento": identificacion,
        "score_datacredito": score,
        "calificacion": resultado,
        "entidad_simulada": "Datacrédito (Experian)"
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
@csrf_exempt
def mock_pasarela_pagos(request):
    # 1. Intentamos leer los datos enviados desde el frontend
    try:
        data = json.loads(request.body) if request.body else {}
        titular = data.get('titular', 'Usuario Anónimo')
        tarjeta = data.get('numero_tarjeta', '****')
        metodo = data.get('metodo', 'Tarjeta')
        ref_consignacion = data.get('referencia_consignacion', '')
    except:
        data = {}
        titular = "Usuario Anónimo"
        metodo = "Tarjeta"
        tarjeta = "****"
        
    # 2. Lógica de simulación inteligente:
    referencia = f"PAY-{uuid.uuid4().hex[:8].upper()}"
    
    if metodo == 'Consignacion':
        return JsonResponse({
            "transaccion_id": referencia,
            "estado": "EXITOSO",
            "mensaje": f"Consignación registrada. Ref comprobante: {ref_consignacion}",
            "metodo_pago": "Consignación",
            "entidad_simulada": "Konrad Pay Gateway"
        })

    # Si la tarjeta termina en 0000, simulamos un fallo
    pago_exitoso = not tarjeta.endswith('0000')
    
    return JsonResponse({
        "transaccion_id": referencia,
        "estado": "EXITOSO" if pago_exitoso else "RECHAZADO",
        "mensaje": f"Pago aprobado para {titular}" if pago_exitoso else "La tarjeta fue declinada por el banco",
        "tarjeta_usada": f"****-****-****-{tarjeta[-4:]}",
        "entidad_simulada": "Konrad Pay Gateway"
    })

    
