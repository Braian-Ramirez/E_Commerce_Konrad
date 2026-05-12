import json
from confluent_kafka import Producer
import socket

class KafkaProducerService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(KafkaProducerService, cls).__new__(cls)
            # Configuración básica
            conf = {
                'bootstrap.servers': 'localhost:9092',
                'client.id': socket.gethostname()
            }
            cls._instance.producer = Producer(conf)
        return cls._instance

    def publish_event(self, topic, message_dict):
        try:
            payload = json.dumps(message_dict).encode('utf-8')
            self.producer.produce(topic, value=payload)
            self.producer.flush() # Forzar el envío
            print(f"[KAFKA] Evento publicado en {topic}")
        except Exception as e:
            print(f"[KAFKA] Error publicando evento: {e}")

# Instancia global para usar en todo el proyecto
kafka_service = KafkaProducerService()
