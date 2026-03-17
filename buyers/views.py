from rest_framework import viewsets
from .models import Comprador
from .serializers import CompradorSerializer

#vista CompradorViewSet
class CompradorViewSet(viewsets.ModelViewSet):
    queryset = Comprador.objects.all()
    serializer_class = CompradorSerializer
