from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.contrib.auth.models import User
from django.http import FileResponse
import json 
import io
import zipfile

from .models import DirectorComercial
from .serializers import DirectorComercialSerializer, DirectorSolicitudSerializer
from vendors.models import Solicitud, ConsultaCrediticia_Local
from notifications.services import enviar_correo_bienvenida_vendedor, enviar_correo_devolucion, enviar_correo_rechazo
from external_mocks.views import mock_datacredito, mock_cifin, mock_antecedentes_judiciales

# Vista Director Comercial
class DirectorComercialViewSet(viewsets.ModelViewSet):
    queryset = DirectorComercial.objects.all()
    serializer_class = DirectorComercialSerializer


# --- GESTIÓN EXCLUSIVA DEL DIRECTOR COMERCIAL ---

class GestionSolicitudesViewSet(viewsets.ModelViewSet):
    queryset = Solicitud.objects.all()
    serializer_class = DirectorSolicitudSerializer
    permission_classes = [IsAuthenticated]

    # Acción para que el Director apruebe/rechace (solo autenticados)
    @action(detail=True, methods=['patch'], url_path='cambiar-estado')
    def cambiar_estado(self, request, pk=None):
        solicitud = self.get_object()
        nuevo_estado = request.data.get('estado')
        
        if nuevo_estado in ['APROBADA', 'RECHAZADA', 'PENDIENTE', 'DEVUELTA']:
            solicitud.estado = nuevo_estado
            solicitud.save()

            if nuevo_estado == 'APROBADA' and not solicitud.persona.user:
                password_temporal = get_random_string(10)
                username = solicitud.persona.email
                nuevo_usuario = User.objects.create_user(
                    username=username,
                    email=solicitud.persona.email,
                    password=password_temporal,
                    first_name=solicitud.persona.nombre,
                    last_name=solicitud.persona.apellido
                )
                solicitud.persona.user = nuevo_usuario
                solicitud.persona.save()
                enviar_correo_bienvenida_vendedor(solicitud.persona, password_temporal)
            
            # --- NOTA ARQUITECTÓNICA ---
            # Las notificaciones de DEVUELTA y RECHAZADA no se disparan desde aquí en el controlador. 
            # Están enganchadas bajo el [PATRÓN DE DISEÑO: OBSERVER] en 'notifications/signals.py'.
            # Esto mantiene el View mucho más limpio y previene envíos duplicados.

            return Response({"message": f"Estado actualizado a {nuevo_estado}"})
        
        return Response({"error": "Estado no válido"}, status=status.HTTP_400_BAD_REQUEST)

    # Historial: solicitudes procesadas (no PENDIENTE) — Solo Lectura
    @action(detail=False, methods=['get'], url_path='historial')
    def historial(self, request):
        solicitudes = Solicitud.objects.exclude(estado='PENDIENTE').order_by('-fecha_creacion')
        serializer = DirectorSolicitudSerializer(solicitudes, many=True)
        return Response(serializer.data)

    # Acción consultar datacrédito
    @action(detail=True, methods=['get'], url_path= 'mock_datacredito')
    def consultar_datacredito(self, request, pk=None):
        solicitud = self.get_object()
        numero_identificacion = solicitud.persona.numero_identificacion
        response = mock_datacredito(request,numero_identificacion) 
        data = json.loads(response.content.decode('utf-8'))
        score = data.get('score_datacredito')
        claficacion = data.get('calificacion')
        solicitud.resultado_datacredito = claficacion
        solicitud.save()
        credit_data, created = ConsultaCrediticia_Local.objects.get_or_create(
            solicitud=solicitud
        )
        credit_data.score_datacredito = score
        credit_data.dictamen_datacredito = claficacion
        credit_data.save()
        return response

    # Acción consultar CIFIN
    @action(detail=True, methods=['get'], url_path= 'mock_cifin')
    def consultar_cifin(self, request, pk=None):
        solicitud = self.get_object()
        numero_identificacion = solicitud.persona.numero_identificacion
        response = mock_cifin(request,numero_identificacion) 
        data = json.loads(response.content.decode('utf-8'))
        score = data.get('score_cifin')
        claficacion = data.get('calificacion')
        solicitud.resultado_cifin = claficacion
        solicitud.save()
        credit_data, created = ConsultaCrediticia_Local.objects.get_or_create(
            solicitud=solicitud
        )
        credit_data.score_cifin = score
        credit_data.dictamen_cifin = claficacion
        credit_data.save()
        return response    

    # Acción consultar Antecedentes (Policía)
    @action(detail=True, methods=['post'], url_path='consultar-antecedentes')
    def consultar_antecedentes(self, request, pk=None):
        solicitud = self.get_object()
        documento_ingresado = request.data.get('numero_identificacion')
        if not documento_ingresado:
            return Response({"error": "Debe ingresar una identificación"}, status=400)
        response = mock_antecedentes_judiciales(request, documento_ingresado)
        data = json.loads(response.content.decode('utf-8'))
        solicitud.resultado_judicial = data.get('estado')
        solicitud.fecha_consulta_judicial = timezone.localtime() 
        solicitud.save()
        return response

    # Acción para Descargar el ZIP con todos los documentos
    @action(detail=True, methods=['get'], url_path='descargar-expediente')
    def descargar_expediente(self, request, pk=None):
        solicitud = self.get_object()
        documentos = solicitud.documentos.all()
        if not documentos.exists():
            return Response({"error": "No hay documentos adjuntos a esta solicitud"}, status=status.HTTP_404_NOT_FOUND)
        
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as zip_file:
            for doc in documentos:
                if doc.url_archivo:
                    archivo_path = doc.url_archivo.path
                    nombre_amigable = f"{doc.get_tipo_display().replace(' ', '_')}_{solicitud.numero_solicitud}"
                    extension = doc.url_archivo.name.split('.')[-1]
                    zip_file.write(archivo_path, f"{nombre_amigable}.{extension}")
        
        buffer.seek(0)
        return FileResponse(buffer, as_attachment=True, filename=f"EXPEDIENTE_{solicitud.numero_solicitud}.zip")
