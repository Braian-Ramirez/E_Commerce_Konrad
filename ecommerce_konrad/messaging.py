import json
import socket
# pyrefly: ignore [missing-import]
from confluent_kafka import Producer
from django.conf import settings


class KafkaProducerService:
    """
    Singleton que gestiona la conexión con Kafka.
    RNF Seguridad #2: en producción la comunicación se cifra con SSL/TLS.
    En desarrollo se usa una conexión plain para facilitar el trabajo local.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(KafkaProducerService, cls).__new__(cls)

            # RNF #7: Los 3 brokers del clúster — si uno cae, los otros atienden
            bootstrap_servers = getattr(
                settings,
                'KAFKA_BOOTSTRAP_SERVERS',
                'localhost:9092,localhost:9093,localhost:9094'
            )

            if not settings.DEBUG:
                # ── PRODUCCIÓN: comunicación cifrada con SSL (RNF Seguridad #2) ──
                conf = {
                    'bootstrap.servers': bootstrap_servers,
                    'client.id': socket.gethostname(),
                    'security.protocol': 'SSL',
                    'ssl.ca.location': getattr(settings, 'KAFKA_SSL_CA', '/etc/kafka/ssl/ca-cert.pem'),
                    'ssl.certificate.location': getattr(settings, 'KAFKA_SSL_CERT', '/etc/kafka/ssl/client-cert.pem'),
                    'ssl.key.location': getattr(settings, 'KAFKA_SSL_KEY', '/etc/kafka/ssl/client-key.pem'),
                }
                print("[KAFKA] Conexión con SSL habilitada (producción)")
            else:
                # ── DESARROLLO: sin SSL para facilitar el trabajo local ──
                conf = {
                    'bootstrap.servers': bootstrap_servers,
                    'client.id': socket.gethostname(),
                }
                print("[KAFKA] Conexión sin SSL (modo desarrollo)")

            cls._instance.producer = Producer(conf)
        return cls._instance

    def publish_event(self, topic, message_dict):
        try:
            payload = json.dumps(message_dict).encode('utf-8')
            self.producer.produce(topic, value=payload)
            self.producer.flush()  # Forzar el envío
            print(f"[KAFKA] Evento publicado en {topic}")
        except Exception as e:
            print(f"[KAFKA] Error publicando evento: {e}")


# Instancia global para usar en todo el proyecto (Patrón Singleton)
kafka_service = KafkaProducerService()
