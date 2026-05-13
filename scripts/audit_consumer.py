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
        # RNF #7: Computación distribuida — los 3 brokers del clúster
        'bootstrap.servers': 'localhost:9092,localhost:9093,localhost:9094',
        'group.id': 'audit-group-v5',
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

            if msg.error():
                # RNF #7: Ignorar errores de "Topic no disponible" mientras el clúster arranca
                # El consumidor se reconectará solo cuando el topic sea creado por kafka-setup
                continue
            
            val = msg.value()
            if not val:
                continue

            # Defensa extra: ignorar mensajes con payload vacío o en blanco
            decoded = val.decode('utf-8').strip()
            if not decoded:
                continue

            try:
                data = json.loads(decoded)
                
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
                print(f"[KAFKA] Payload malformado: '{decoded}'")
                continue

    except KeyboardInterrupt:
        pass
    finally:
        consumer.close()

if __name__ == '__main__':
    start_audit_consumer()
