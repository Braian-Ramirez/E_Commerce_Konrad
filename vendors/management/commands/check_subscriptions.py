from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from vendors.models import Vendedor
from notifications.models import Notificacion
from notifications.services import (
    enviar_notificacion_vencimiento_suscripcion,
    enviar_notificacion_suscripcion_en_mora,
    enviar_notificacion_suscripcion_cancelada
)

class Command(BaseCommand):
    help = 'Revisa las suscripciones de los vendedores y gestiona estados (Aviso, Mora, Cancelación).'

    def handle(self, *args, **options):
        # Usamos la fecha local de Colombia para coincidir con el Admin
        hoy = timezone.localtime(timezone.now()).date()
        
        # 1. AVISO: Una semana antes del vencimiento
        fecha_alerta = hoy + timedelta(days=7)
        self.stdout.write(f"--- Revisando Avisos (Vence: {fecha_alerta}) ---")
        vendedores_alerta = Vendedor.objects.filter(estado_suscripcion='ACTIVA', fecha_vencimiento=fecha_alerta)
        for v in vendedores_alerta:
            if not Notificacion.objects.filter(persona=v.persona, tipo='SISTEMA', fecha_creacion__date=hoy, mensaje__icontains='vence el').exists():
                self.stdout.write(f"Avisando a: {v.persona.email}")
                enviar_notificacion_vencimiento_suscripcion(v.persona, v.fecha_vencimiento)

        # 2. MORA: Hoy venció y no ha pagado
        self.stdout.write(f"--- Revisando Vencimientos de Hoy (Mora) ---")
        vendedores_mora = Vendedor.objects.filter(estado_suscripcion='ACTIVA', fecha_vencimiento=hoy)
        for v in vendedores_mora:
            self.stdout.write(f"Pasando a MORA: {v.persona.email}")
            v.estado_suscripcion = 'EN_MORA'
            v.save()
            enviar_notificacion_suscripcion_en_mora(v.persona)

        # 3. CANCELACIÓN: 30 días después del vencimiento si sigue en mora
        fecha_limite_cancelacion = hoy - timedelta(days=30)
        self.stdout.write(f"--- Revisando Cancelaciones (Venció hace 30 días: {fecha_limite_cancelacion}) ---")
        vendedores_cancelar = Vendedor.objects.filter(estado_suscripcion='EN_MORA', fecha_vencimiento=fecha_limite_cancelacion)
        for v in vendedores_cancelar:
            self.stdout.write(f"CANCELANDO por falta de pago: {v.persona.email}")
            v.estado_suscripcion = 'CANCELADA'
            v.save()
            enviar_notificacion_suscripcion_cancelada(v.persona)
        
        self.stdout.write(self.style.SUCCESS('Proceso de gestión de suscripciones finalizado.'))
