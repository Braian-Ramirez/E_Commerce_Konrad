from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CompradorViewSet

router = DefaultRouter()
router.register(r'compradores', CompradorViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
