from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificacionViewSet, CorreoEnviadoViewSet, enviar_otp_verificacion

router = DefaultRouter()
router.register(r'notificaciones', NotificacionViewSet, basename='notificaciones')
router.register(r'correos_enviados', CorreoEnviadoViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('enviar-otp/', enviar_otp_verificacion, name='enviar_otp_verificacion'),
]

