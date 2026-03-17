from rest_framework import viewsets
from .models import PagoOrden, Suscripcion, ConsignacionBancaria
from .serializers import PagoOrdenSerializer, SuscripcionSerializer, ConsignacionBancariaSerializer

#vista PagoOrdenViewSet
class PagoOrdenViewSet(viewsets.ModelViewSet):
    queryset = PagoOrden.objects.all()
    serializer_class = PagoOrdenSerializer

#vista SuscripcionViewSet
class SuscripcionViewSet(viewsets.ModelViewSet):
    queryset = Suscripcion.objects.all()
    serializer_class = SuscripcionSerializer

#vista ConsignacionBancariaViewSet
class ConsignacionBancariaViewSet(viewsets.ModelViewSet):
    queryset = ConsignacionBancaria.objects.all()
    serializer_class = ConsignacionBancariaSerializer
