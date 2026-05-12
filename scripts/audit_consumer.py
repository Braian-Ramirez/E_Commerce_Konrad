import json
import os
import sys
import django
# pyrefly: ignore [missing-import]
from confluent_kafka import Consumer

# 1. Configuración de entorno Django para el script independiente
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecommerce_konrad.settings')
django.setup()

from audit.models import RegistroAuditoria

def start_audit_consumer():
    # Configuración del consumidor
    conf = {
        'bootstrap.servers': 'localhost:9092',
        'group.id': 'audit-group-v5', # ID de grupo nuevo para procesar todo
        'auto.offset.reset': 'earliest'
    }

    consumer = Consumer(conf)
    consumer.subscribe(['audit-logs'])

    print("[KAFKA] Consumidor de Auditoría iniciado (Modo Inteligente) y escuchando...")

    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None: 
                continue
            
            val = msg.value()
            if not val: 
                continue
                
            try:
                # Decodificar el JSON enviado por el productor
                data = json.loads(val.decode('utf-8'))
                
                # --- MAPEO INTELIGENTE ---
                # Prioriza datos específicos (de vistas) sobre genéricos (del middleware)
                entidad = data.get('entidad', 'API_ENDPOINT')
                id_entidad = data.get('id_entidad', 0)
                
                # Construir la acción: si no viene una explícita, usa Método + Path
                accion_defecto = f"{data.get('method', 'LOG')} {data.get('path', '')}"
                accion = data.get('accion', accion_defecto)
                
                # Identificar al responsable
                responsable = data.get('username', 'Anónimo')

                # Guardar en la base de datos
                RegistroAuditoria.objects.create(
                    entidad_afectada=entidad,
                    id_entidad=id_entidad,
                    accion=accion,
                    nivel_severidad='INFO' if data.get('status_code', 200) < 400 else 'WARNING',
                    usuario_responsable=responsable,
                    detalles_json=data # Guardamos todo el payload para auditoría técnica
                )
                
                print(f"✅ Log procesado: [{entidad}] | Responsable: {responsable} | Acción: {accion}")

            except Exception as e:
                print(f"[KAFKA] Error procesando mensaje: {e}")
                continue

    except KeyboardInterrupt:
        pass
    finally:
        consumer.close()

if __name__ == '__main__':
    start_audit_consumer()
