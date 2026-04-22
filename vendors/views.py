from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db.models import Avg

from .models import Persona, Vendedor, Solicitud, CalificacionVendedor
from .serializers import PersonaSerializer, VendedorSerializer, CalificacionVendedorSerializer, SolicitudVendedorRegistrationSerializer
from notifications.services import enviar_notificacion_pago_suscripcion
from payments.models import Suscripcion
from datetime import date, timedelta

# Vista Persona
class PersonaViewSet(viewsets.ModelViewSet):
    queryset = Persona.objects.all()
    serializer_class = PersonaSerializer

# Vista Vendedor
class VendedorViewSet(viewsets.ModelViewSet):
    queryset = Vendedor.objects.all()
    serializer_class = VendedorSerializer

    @action(detail=False, methods=['post'], url_path='activar-suscripcion', permission_classes=[IsAuthenticated])
    def activar_suscripcion(self, request):
        user = request.user
        plan = request.data.get('plan', '').upper()
        
        # 1. Asegurarnos que el usuario tiene una Persona
        if not hasattr(user, 'persona_profile'):
            return Response({"error": "El usuario no tiene un perfil de persona asociado."}, status=status.HTTP_400_BAD_REQUEST)
        
        persona = user.persona_profile
        
        # 2. Buscar o crear el perfil de Vendedor
        vendedor, created = Vendedor.objects.get_or_create(persona=persona)
        
        # 3. Calcular fecha de vencimiento según el plan
        hoy = date.today()
        dias = 30
        
        # Detectar el nombre limpio y el valor para el historial
        nombre_plan = "MENSUAL"
        valor_plan = "$50.000"
        
        if 'SEMESTRAL' in plan: 
            dias = 180
            nombre_plan = "SEMESTRAL"
            valor_plan = "$250.000"
        elif 'ANUAL' in plan: 
            dias = 365
            nombre_plan = "ANUAL"
            valor_plan = "$450.000"
        
        vendedor.estado_suscripcion = 'ACTIVA'
        vendedor.fecha_vencimiento = hoy + timedelta(days=dias)
        vendedor.save()

        # 4. Registrar en el historial de pagos (App Payments)
        Suscripcion.objects.create(
            vendedor=vendedor,
            tipo=nombre_plan,
            monto_pagado=float(valor_plan.replace('$', '').replace('.', '')),
            fecha_inicio=hoy,
            fecha_fin=vendedor.fecha_vencimiento,
            activo=True
        )

        # 5. Enviar notificación certificada (RNF)      
        enviar_notificacion_pago_suscripcion(
            persona=persona,
            plan=nombre_plan,
            valor=valor_plan,
            vencimiento=vendedor.fecha_vencimiento.strftime("%d/%m/%Y")
        )
        
        return Response({
            "status": "ACTIVA",
            "vencimiento": vendedor.fecha_vencimiento.strftime("%d/%m/%Y"),
            "mensaje": f"Suscripción {nombre_plan} activada con éxito."
        })

    @action(detail=False, methods=['get'], url_path='mi-status', permission_classes=[IsAuthenticated])
    def mi_status(self, request):
        user = request.user
        if hasattr(user, 'persona_profile') and hasattr(user.persona_profile, 'vendedor_profile'):
            vendedor = user.persona_profile.vendedor_profile
            from products.models import ComentarioProducto
            strikes = ComentarioProducto.objects.filter(
                producto__vendedor=vendedor,
                calificacion__lt=3,
                calificacion__gt=0
            ).count()
            # Incluimos el nombre del vendedor para la UI
            return Response({
                "nombre": f"{vendedor.persona.nombre} {vendedor.persona.apellido}",
                "estado_suscripcion": vendedor.estado_suscripcion,
                "fecha_vencimiento": vendedor.fecha_vencimiento,
                "calificacion": vendedor.calificacion_promedio,
                "strikes": strikes,
                "max_strikes": 10
            })
        return Response({"estado_suscripcion": "INACTIVA"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='mis-calificaciones', permission_classes=[IsAuthenticated])
    def mis_calificaciones(self, request):
        """Obtiene el historial de reseñas de productos para el panel del vendedor."""
        user = request.user
        if not hasattr(user, 'persona_profile') or not hasattr(user.persona_profile, 'vendedor_profile'):
            return Response({"error": "Sin perfil de vendedor."}, status=status.HTTP_403_FORBIDDEN)
        
        vendedor = user.persona_profile.vendedor_profile
        from products.models import ComentarioProducto
        
        # Filtramos estrictamente RELACIONES DE VENTA con CALIFICACIÓN (reseñas)
        comentarios = ComentarioProducto.objects.filter(
            producto__vendedor=vendedor,
            calificacion__gt=0
        ).select_related('producto', 'orden', 'comprador').order_by('-fecha')
        
        data = []
        for c in comentarios:
            # Obtener imagen principal del producto
            img = c.producto.imagenes.filter(es_principal=True).first() or c.producto.imagenes.first()
            img_url = request.build_absolute_uri(img.imagen.url) if img else None
            
            data.append({
                "id": c.id,
                "producto_nombre": c.producto.nombre,
                "producto_imagen": img_url,
                "comprador_nombre": f"{c.comprador.nombre} {c.comprador.apellido}" if c.comprador else "Comprador Desconocido",
                "calificacion": c.calificacion,
                "comentario": c.comentario,
                "fecha": c.fecha.strftime("%d/%m/%Y")
            })
            
        return Response(data)

# Vista Solicitud (SÓLO RUTAS PÚBLICAS Y BÁSICAS DE VENDEDORES)
class SolicitudViewSet(viewsets.GenericViewSet):
    queryset = Solicitud.objects.all()
    permission_classes = [IsAuthenticated]

    # Acción de registro público (abierto a todo mundo)
    @action(detail=False, methods=['post'], url_path='register_vendor', permission_classes=[AllowAny], parser_classes=[MultiPartParser, FormParser])
    def register_vendor(self, request):
        serializer = SolicitudVendedorRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Solicitud creada con éxito."}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
        
        # 5. Guardar los cambios
        vendedor.save()
