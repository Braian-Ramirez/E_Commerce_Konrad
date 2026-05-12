import json
import os
import sys
import django
from confluent_kafka import Consumer, KafkaError

# Configurar Django para poder usar send_mail
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecommerce_konrad.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings

def start_consumer():
    conf = {
        'bootstrap.servers': 'localhost:9092',
        'group.id': 'email-workers',
        'auto.offset.reset': 'earliest'
    }

    consumer = Consumer(conf)
    consumer.subscribe(['notificaciones-email'])

    print("[KAFKA] Consumidor de correos iniciado y escuchando...")

    try:
        while True:
            msg = consumer.poll(1.0)
            if msg is None: continue
            if msg.error():
                print(f"Error: {msg.error()}")
                continue

            # Procesar el mensaje
            data = json.loads(msg.value().decode('utf-8'))
            print(f"Recibido evento para: {data['destinatario']}")

            # Realizar el envío REAL del correo
            try:
                send_mail(
                    data['asunto'],
                    data['mensaje'],
                    settings.DEFAULT_FROM_EMAIL,
                    [data['destinatario']]
                )
                print(f"Correo enviado exitosamente a {data['destinatario']}")
            except Exception as e:
                print(f"Error enviando correo SMTP: {e}")

    except KeyboardInterrupt:
        pass
    finally:
        consumer.close()

if __name__ == '__main__':
    start_consumer()
