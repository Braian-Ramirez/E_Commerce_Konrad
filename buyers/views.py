from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from .models import Comprador
from .serializers import CompradorSerializer, CompradorRegistrationSerializer

#vista CompradorViewSet
class CompradorViewSet(viewsets.ModelViewSet):
    queryset = Comprador.objects.all()
    serializer_class = CompradorSerializer

    @action(detail=False, methods= ['post'], permission_classes= [AllowAny])
    def register(self, request):
        serializer = CompradorRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Registro exitoso. Revisa tu correo"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
