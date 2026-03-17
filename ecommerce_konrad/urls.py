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

urlpatterns = [
    path('admin/', admin.site.urls),
    # API Endpoints
    path('api/v1/products/', include('products.urls')), #urls de productos
    path('api/v1/vendors/', include('vendors.urls')), #urls de vendedores
    path('api/v1/orders/', include('orders.urls')), #urls de órdenes
    path('api/v1/payments/', include('payments.urls')), #urls de pagos
    path('api/v1/notifications/', include('notifications.urls')), #urls de notificaciones
    path('api/v1/buyers/', include('buyers.urls')), #urls de compradores
    
    # Conectamos nuestras URLs falsas:
    path('mocks/', include('external_mocks.urls')),
]
