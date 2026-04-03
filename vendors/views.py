from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.contrib.auth.models import User
from django.db.models import Avg
from notifications.services import enviar_correo_bienvenida_vendedor, enviar_correo_devolucion, enviar_correo_rechazo
from .models import Persona, Vendedor, Solicitud, CalificacionVendedor, ConsultaCrediticia_Local
from .serializers import PersonaSerializer, VendedorSerializer, SolicitudSerializer, CalificacionVendedorSerializer, SolicitudVendedorRegistrationSerializer
from ecommerce_konrad.permissions import IsDirectorComercialOrPostOnly
from external_mocks.views import mock_datacredito, mock_cifin, mock_antecedentes_judiciales
import json 
import io
import zipfile
from django.http import FileResponse

# Vista Persona
class PersonaViewSet(viewsets.ModelViewSet):
    queryset = Persona.objects.all()
    serializer_class = PersonaSerializer

# Vista Vendedor
class VendedorViewSet(viewsets.ModelViewSet):
    queryset = Vendedor.objects.all()
    serializer_class = VendedorSerializer

# Vista Solicitud
class SolicitudViewSet(viewsets.ModelViewSet):
    queryset = Solicitud.objects.all()
    serializer_class = SolicitudSerializer
    
    # Solo el Director (autenticado) puede ver la lista completa
    permission_classes = [IsAuthenticated]
    # Acción pública para que el Vendedor consulte su estado
    @action(detail=False, methods=['get'], url_path='consultar-estado', permission_classes=[AllowAny])
    def consultar_estado(self, request):
        identificacion = request.query_params.get('identificacion')
        radicado = request.query_params.get('radicado')
        if not identificacion and not radicado:
            return Response({"error": "Debe proporcionar identificación o radicado"}, status=status.HTTP_400_BAD_REQUEST)
        solicitud = None
        if radicado:
            solicitud = Solicitud.objects.filter(numero_solicitud=radicado).first()
        elif identificacion:
            solicitud = Solicitud.objects.filter(persona__numero_identificacion=identificacion).first()
        if solicitud:
            return Response({
                "estado": solicitud.estado,
                "numero_radicado": solicitud.numero_solicitud,
                "vendedor": f"{solicitud.persona.nombre} {solicitud.persona.apellido}",
                "fecha": solicitud.fecha_creacion.strftime("%d/%m/%Y")
            })
        
        return Response({"error": "Solicitud no encontrada"}, status=status.HTTP_404_NOT_FOUND)

    # Acción para que el Director apruebe/rechace (solo autenticados)
    @action(detail=True, methods=['patch'], url_path='cambiar-estado')
    def cambiar_estado(self, request, pk=None):
        solicitud = self.get_object()
        nuevo_estado = request.data.get('estado')
        
        if nuevo_estado in ['APROBADA', 'RECHAZADA', 'PENDIENTE', 'DEVUELTA']:
            solicitud.estado = nuevo_estado
            solicitud.save()

            # --- LÓGICA DE APROBACIÓN (CREACIÓN DE USUARIO Y CORREO) --- 🏛️👤✨⚖️🍿
            if nuevo_estado == 'APROBADA' and not solicitud.persona.user:
                # 1. Generar credenciales
                password_temporal = get_random_string(10)
                username = solicitud.persona.email
                
                # 2. Crear el Usuario de Django
                nuevo_usuario = User.objects.create_user(
                    username=username,
                    email=solicitud.persona.email,
                    password=password_temporal,
                    first_name=solicitud.persona.nombre,
                    last_name=solicitud.persona.apellido
                )
                
                # 3. Vincular Persona con User
                solicitud.persona.user = nuevo_usuario
                solicitud.persona.save()

                # 4. Enviar Correo de Bienvenida (A TRAVÉS DEL SERVICIO) 
                enviar_correo_bienvenida_vendedor(solicitud.persona, password_temporal)

            # --- LÓGICA DE DEVOLUCIÓN (NUEVA) ---
            elif nuevo_estado == 'DEVUELTA':
                enviar_correo_devolucion(solicitud.persona)

            # --- LÓGICA DE RECHAZO ---
            elif nuevo_estado == 'RECHAZADA':
                enviar_correo_rechazo(solicitud.persona)

            return Response({"message": f"Estado actualizado a {nuevo_estado}"})
        
        return Response({"error": "Estado no válido"}, status=status.HTTP_400_BAD_REQUEST)

    # Acción consultar datacrédito
    @action(detail=True, methods=['get'], url_path= 'mock_datacredito')
    def consultar_datacredito(self, request, pk=None):
        # Obtener la solicitud específica 
        solicitud = self.get_object()
        # Obtenemos el número de identificación de la solicitud
        numero_identificacion = solicitud.persona.numero_identificacion
        # Guardar el resultado de calificación 
        response = mock_datacredito(request,numero_identificacion) 
        # Traducir la respuesta 
        data = json.loads(response.content.decode('utf-8'))
        # Extracción de datos de mock
        score = data.get('score_datacredito')
        claficacion = data.get('calificacion')
        # Guardar la calificación en solictud
        solicitud.resultado_datacredito = claficacion
        solicitud.save()
        # Guardar el score
        credit_data, created = ConsultaCrediticia_Local.objects.get_or_create(
            solicitud=solicitud
        )
        credit_data.score_datacredito = score
        credit_data.dictamen_datacredito = claficacion
        credit_data.save()
        # Devover la respuesta al frontend
        return response

    #Acción consultar CIFIN
    @action(detail=True, methods=['get'], url_path= 'mock_cifin')
    def consultar_cifin(self, request, pk=None):
        # Obtener la solicitud específica 
        solicitud = self.get_object()
        # Obtenemos el número de identificación de la solicitud
        numero_identificacion = solicitud.persona.numero_identificacion
        # Guardar el resultado de calificación 
        response = mock_cifin(request,numero_identificacion) 
        # Traducir la respuesta 
        data = json.loads(response.content.decode('utf-8'))
        # Extracción de datos de mock
        score = data.get('score_cifin')
        claficacion = data.get('calificacion')
        # Guardar la calificación en solictud
        solicitud.resultado_cifin = claficacion
        solicitud.save()
        # Guardar el score
        credit_data, created = ConsultaCrediticia_Local.objects.get_or_create(
            solicitud=solicitud
        )
        credit_data.score_cifin = score
        credit_data.dictamen_cifin = claficacion
        credit_data.save()
        # Devover la respuesta al frontend
        return response    

    # Acción consultar Antecedentes (Policía)
    @action(detail=True, methods=['post'], url_path='consultar-antecedentes')
    def consultar_antecedentes(self, request, pk=None):
        # Obtener la solicitud actual (para guardarle el resultado al final)
        solicitud = self.get_object()
        
        # Tomar la cédula que el Director escribió en el buscador del modal
        documento_ingresado = request.data.get('numero_identificacion')
        
        if not documento_ingresado:
            return Response({"error": "Debe ingresar una identificación"}, status=400)
        
        # 3. Llamar al Mock de Antecedentes
        response = mock_antecedentes_judiciales(request, documento_ingresado)
        data = json.loads(response.content.decode('utf-8'))
        
        # 4. PASO CLAVE: Guardamos el estado judicial ('REQUERIDO' o 'NO_REQUERIDO')
        # solo si la consulta terminó bien.
        solicitud.resultado_judicial = data.get('estado')
        solicitud.fecha_consulta_judicial = timezone.localtime() # Guardar fecha real 🕰️
        solicitud.save()
        
        return response

    # Acción para Descargar el ZIP con todos los documentos
    @action(detail=True, methods=['get'], url_path='descargar-expediente')
    def descargar_expediente(self, request, pk=None):
        solicitud = self.get_object()
        documentos = solicitud.documentos.all()
        
        if not documentos.exists():
            return Response({"error": "No hay documentos adjuntos a esta solicitud"}, status=status.HTTP_404_NOT_FOUND)
        
        # Crear un buffer en memoria para el ZIP
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w') as zip_file:
            for doc in documentos:
                if doc.url_archivo:
                    # Obtenemos la ruta física del archivo
                    archivo_path = doc.url_archivo.path
                    # Nombre amigable dentro del ZIP (ej: CEDULA_123.pdf)
                    nombre_amigable = f"{doc.get_tipo_display().replace(' ', '_')}_{solicitud.numero_solicitud}"
                    extension = doc.url_archivo.name.split('.')[-1]
                    zip_file.write(archivo_path, f"{nombre_amigable}.{extension}")
        
        buffer.seek(0)
        return FileResponse(buffer, as_attachment=True, filename=f"EXPEDIENTE_{solicitud.numero_solicitud}.zip")

# [PATRÓN DE DISEÑO: ADAPTER]
# Esta lógica sirve como ADAPTADOR para los servicios externos 
# (Datacrédito y CIFIN). Convertimos los datos crudos del tercero 
# (mock_data) en un estado interno de nuestra Solicitud (APROBADA/RECHAZADA).
    def perform_create(self, serializer):
        user = self.request.user
        if hasattr(user, 'persona_profile'):
            serializer.save(persona=user.persona_profile)
        else:
            serializer.save()

    @action(detail=False, methods=['get'], url_path='consultar-estado', permission_classes=[AllowAny])
    def consultar_estado(self, request):
        identificacion = request.query_params.get('identificacion')
        radicado = request.query_params.get('radicado')
        
        if not identificacion and not radicado:
            return Response({"error": "Debes proporcionar un número de identificación o un radicado"}, status=400)
        
        # Lógica de búsqueda dinámica
        if radicado:
            solicitud = Solicitud.objects.filter(numero_solicitud=radicado).last()
        else:
            solicitud = Solicitud.objects.filter(persona__numero_identificacion=identificacion).last()
    
        if solicitud:
            return Response({
                "numero_radicado": solicitud.numero_solicitud,
                "estado": solicitud.estado,
                "fecha": solicitud.fecha_creacion.strftime("%d/%m/%Y"),
                "nombre": f"{solicitud.persona.nombre} {solicitud.persona.apellido}"
            })
        else:
            return Response({"error": "No se encontró ninguna solicitud con los datos proporcionados"}, status=404)
            

# Vista CalificacionVendedor
class CalificacionVendedorViewSet(viewsets.ModelViewSet):
    queryset = CalificacionVendedor.objects.all()
    serializer_class = CalificacionVendedorSerializer

    # Patrón: interceptamos el guardado para inyectar lógica de negocio
    def perform_create(self, serializer):
        # 1. Guardar la nueva calificación en BD
        calificacion = serializer.save()

        # 2. Identificar a quién calificaron
        vendedor = calificacion.vendedor

        # 3. Calcular nuevo promedio usando todo el historial
        promedio_dict = vendedor.calificaciones.aggregate(promedio=Avg('estrellas'))
        nuevo_promedio = promedio_dict['promedio'] or 0
        vendedor.calificacion_promedio = nuevo_promedio

        # 4. Regla de seguridad: cancelación automática
        malas_calificaciones = vendedor.calificaciones.filter(estrellas__lt=3).count() 
        
        if malas_calificaciones >= 10 or nuevo_promedio < 5:
            vendedor.estado_suscripcion = 'CANCELADA'
            # (Futuro: llamar a notifications para enviar email)
        
        # 5. Guardar los cambios
        vendedor.save()
