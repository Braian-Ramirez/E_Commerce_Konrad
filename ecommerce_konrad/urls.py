"""
URL configuration for ecommerce_konrad project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView, TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth.models import User
from rest_framework import exceptions

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # El frontend envía el email en el campo "username"
        email_ingresado = attrs.get('username')
        
        
        # Filtramos ignorando mayúsculas/minúsculas y tomamos el primero
        user_obj = User.objects.filter(email__iexact=email_ingresado).first()
        if user_obj:
            attrs['username'] = user_obj.username

        data = super().validate(attrs)
        rol = None # Por defecto no tiene rol
        user = self.user
        
        if hasattr(user, 'persona_profile') and user.persona_profile:
            persona = user.persona_profile
            # Verificación de roles basada en perfiles relacionados
            # Priorizar Vendedor sobre Comprador si tiene ambos
            if hasattr(persona, 'director_profile'):
                rol = 'DIRECTOR_COMERCIAL'
            elif persona.solicitudes.filter(estado='APROBADA').exists() or hasattr(persona, 'vendedor_profile'):
                rol = 'VENDEDOR'
            elif hasattr(persona, 'perfil_comprador'):
                rol = 'COMPRADOR'
        
        # Si no encajó en nada pero es superuser base
        if not rol and user.is_superuser:
            rol = 'DIRECTOR_COMERCIAL'
            
        # Si finalmente no tiene ningún rol (ni solicitud aprobada), denegamos el acceso
        if not rol:
            raise exceptions.AuthenticationFailed('Acceso denegado: No tienes un rol asignado o tu solicitud no ha sido aprobada.')
            
        data['rol'] = rol
        
        # Inyectar datos del usuario para pintar el frontend
        user_data = {
            'email': user.email,
        }
        if hasattr(user, 'persona_profile') and user.persona_profile:
            p = user.persona_profile
            user_data.update({
                'id': p.id,
                'nombre': p.nombre,
                'apellido': p.apellido,
                'tipo_documento': p.tipo_documento,
                'numero_identificacion': p.numero_identificacion,
                'telefono': p.telefono,
                'direccion': p.direccion or '',
                'tipo_persona': p.tipo_persona or 'JURIDICA',
                'pais': p.pais,
                'ciudad': p.ciudad,
            })
            if rol == 'VENDEDOR':
                # Sobrescribir "nombre" si es juridica? El form usa nombre.
                pass
                
        data['user'] = user_data
        return data

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


urlpatterns = [
    path('admin/', admin.site.urls),
    # API Endpoints
    path('api/v1/products/', include('products.urls')), #urls de productos
    path('api/v1/vendors/', include('vendors.urls')), #urls de vendedores
    path('api/v1/orders/', include('orders.urls')), #urls de órdenes
    path('api/v1/payments/', include('payments.urls')), #urls de pagos
    path('api/v1/notifications/', include('notifications.urls')), #urls de notificaciones
    path('api/v1/buyers/', include('buyers.urls')), #urls de compradores
    path('api/v1/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'), #Ruta login customizada
    path('api/v1/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'), #Ruta refresh token
    path('api/v1/directors/', include('directors.urls')),
    path('api/v1/audit/', include('audit.urls')),
    
    # Conectamos nuestras URLs falsas:
    path('mocks/', include('external_mocks.urls')),
]

# Exponer los archivos crudos en modo desarrollo local
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
