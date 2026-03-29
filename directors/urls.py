from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DirectorComercialViewSet

router = DefaultRouter()
router.register(r'directores', DirectorComercialViewSet)

urlpatterns = [
    path('', include(router.urls)),
]