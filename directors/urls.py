from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DirectorComercialViewSet, GestionSolicitudesViewSet

router = DefaultRouter()
router.register(r'directores', DirectorComercialViewSet)
router.register(r'solicitudes', GestionSolicitudesViewSet, basename='director-solicitudes')

urlpatterns = [
    path('', include(router.urls)),
]