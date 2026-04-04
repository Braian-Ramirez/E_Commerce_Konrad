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

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # El frontend envía el email en el campo "username"
        email_ingresado = attrs.get('username')
        from django.contrib.auth.models import User
        
        # Filtramos ignorando mayúsculas/minúsculas y tomamos el primero
        user_obj = User.objects.filter(email__iexact=email_ingresado).first()
        if user_obj:
            attrs['username'] = user_obj.username

        data = super().validate(attrs)
        rol = "DIRECTOR_COMERCIAL"
        user = self.user
        
        if hasattr(user, 'persona_profile') and user.persona_profile:
            persona = user.persona_profile
            if hasattr(persona, 'vendedor_profile'):
                rol = 'VENDEDOR'
            elif hasattr(persona, 'perfil_comprador'):
                rol = 'COMPRADOR'
            
        data['rol'] = rol
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
    path('api/v1/bam/', include('bam.urls')), #urls de bam
    path('api/v1/directors/', include('directors.urls')), #urls de directores
    
    # Conectamos nuestras URLs falsas:
    path('mocks/', include('external_mocks.urls')),
]

# Exponer los archivos crudos en modo desarrollo local
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
