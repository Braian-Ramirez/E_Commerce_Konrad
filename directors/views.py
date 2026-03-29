from rest_framework import viewsets
from .models import DirectorComercial
from .serializers import DirectorComercialSerializer

# Vista Director Comercial
class DirectorComercialViewSet(viewsets.ModelViewSet):
    queryset = DirectorComercial.objects.all()
    serializer_class = DirectorComercialSerializer
