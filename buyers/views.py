from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import Comprador, MedioPago
from .serializers import (
    CompradorSerializer, CompradorRegistrationSerializer, 
    MedioPagoSerializer, CompradorUpdateSerializer
)

#vista CompradorViewSet
class CompradorViewSet(viewsets.ModelViewSet):
    queryset = Comprador.objects.all()
    serializer_class = CompradorSerializer

    @action(detail=False, methods=['get', 'put', 'patch'], permission_classes=[IsAuthenticated])
    def me(self, request):
        from vendors.models import Persona
        # Intentamos obtener la persona. Si no existe, la creamos y jalamos nombres del User base.
        persona, created = Persona.objects.get_or_create(user=request.user)
        
        # Sincronización proactiva: Si Persona no tiene nombres pero el User sí, los copiamos una vez.
        if not persona.nombre and request.user.first_name:
            persona.nombre = request.user.first_name
        if not persona.apellido and request.user.last_name:
            persona.apellido = request.user.last_name
        if not persona.email:
            persona.email = request.user.email
        
        if created or not persona.nombre:
            persona.save()

        comprador, _ = Comprador.objects.get_or_create(persona=persona)

        if request.method == 'GET':
            serializer = CompradorUpdateSerializer(comprador)
            return Response(serializer.data)
        
        serializer = CompradorUpdateSerializer(comprador, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods= ['post'], permission_classes= [AllowAny])
    def register(self, request):
        serializer = CompradorRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Registro exitoso. Revisa tu correo"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Vista MedioPagoViewSet
class MedioPagoViewSet(viewsets.ModelViewSet):
    serializer_class = MedioPagoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'persona_profile') and hasattr(user.persona_profile, 'perfil_comprador'):
            return MedioPago.objects.filter(comprador=user.persona_profile.perfil_comprador)
        return MedioPago.objects.none()

    def perform_create(self, serializer):
        # Aseguramos que el usuario tenga un perfil de comprador activo
        comprador, _ = Comprador.objects.get_or_create(persona=self.request.user.persona_profile)
        serializer.save(comprador=comprador)

