from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied  
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Orden, DetalleOrden, CalificacionProducto
from products.models import CostoDomicilio
from payments.models import PagoOrden
from .serializers import OrdenSerializer, DetalleOrdenSerializer, CalificacionProductoSerializer
from decimal import Decimal

#Vista Orden
class OrdenViewSet(viewsets.ModelViewSet):
    serializer_class = OrdenSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Orden.objects.none()
        if user.is_staff or user.is_superuser:
            return Orden.objects.all().order_by('-fecha')
        if hasattr(user, 'persona_profile'):
            return Orden.objects.filter(comprador=user.persona_profile).order_by('-fecha')
        return Orden.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        from vendors.models import Persona
        persona, _ = Persona.objects.get_or_create(user=user)
        serializer.save(comprador=persona)

    @action(detail=True, methods=['post'])
    def checkout(self, request, pk=None):
        # Recuperar datos de la orden actual
        orden = self.get_object()
        
        # Validaciones básicas de negocio
        if orden.estado != 'CARRITO':
            return Response({'error': 'Esta orden ya fue procesada'}, status=400)

        detalles = orden.detalles.all()
        if not detalles.exists():
            return Response({'error': 'No puedes hacer checkout de un carrito vacío'}, status=400)

        # Inicializamos contadores matemáticos
        subtotal = 0
        total_comision = 0
        total_iva = 0
        peso_total = 0

        # Recorrer cada producto
        for detalle in detalles:
            producto = detalle.producto
            categoria = producto.categoria

            # --- A. CÁLCULOS BASE ---
            # El precio_base AHORA SÍ ESTÁ ADENTRO DEL FOR:
            precio_base = detalle.valor_unitario * detalle.cantidad
            subtotal += precio_base
            
            # --- B. CÁLCULO DE COMISIÓN (Dinámico) ---
            # Si el porcentaje en BD es 5.0, dividimos en 100 para que sea 0.05
            factor_comision = categoria.porcentaje_comision / 100
            total_comision += (precio_base * factor_comision)

            # --- C. CÁLCULO DE IVA (Dinámico) ---
            # Si la categoría en la BD dice que aplica IVA, sacamos el 19%
            if categoria.aplica_iva:
                total_iva += (precio_base * Decimal('0.19'))
                
            # --- D. CÁLCULO DE PESO Y ACTUALIZACIÓN DE ESTADÍSTICAS ---
            peso_total += (producto.peso * detalle.cantidad)
            
            # --- E. ACTUALIZAR ESTADÍSTICAS Y DESCONTAR STOCK ---
            producto.ventas_totales += detalle.cantidad
            if producto.cantidad >= detalle.cantidad:
                producto.cantidad -= detalle.cantidad
            else:
                producto.cantidad = 0 # Fallback por seguridad para no dejar inventarios negativos
            
            producto.save()

        # 5. Cálculo del costo de envío
        costo_envio = 0

        # Si el usuario NO eligió "Recoger" en el local...
        # [PATRÓN DE DISEÑO: STRATEGY]
        # Seleccionamos dinámicamente el cálculo del envío basándonos 
        # en la estrategia elegida por el comprador (DOMICILIO vs RECOGER).
        if orden.tipo_entrega == 'DOMICILIO':
            # El comprador hereda los datos de Persona (donde está su ciudad)
            ciudad_comprador = orden.comprador.ciudad
            
            # Magia del ORM de Django para buscar entre Rangos
            tarifa = CostoDomicilio.objects.filter(
                ciudad__iexact=ciudad_comprador, # Busca la ciudad sin importar mayúsculas
                peso_min__lte=peso_total,        # El minimo debe ser menor/igual a nuestro peso
                peso_max__gte=peso_total         # El maximo debe ser mayor/igual a nuestro peso
            ).first()
            
            if tarifa:
                costo_envio = tarifa.costo
            else:
                # Tarifa "castigo" por defecto (Alineado a la vista estática del Frontend de 12.000)
                costo_envio = Decimal('12000.00') 

        # 6. Actualizamos los totales y terminamos
        # IMPORTANT: 'subtotal' ya incluye IVA, por lo que NO se debe sumar total_iva al final para no cobrar doble.
        total_final = subtotal + total_comision + costo_envio
        
        orden.costo_envio = costo_envio
        orden.total_iva = total_iva
        orden.total_comision = total_comision
        orden.total_final = total_final
        orden.estado = 'PAGADA' # El mock aprobó el pago ANTES de llegar aquí
        orden.save()

        # 7. Crear el registro de Pago (Auditoría)
        metodo_raw = request.data.get('metodo_pago', 'TARJETA').upper()
        # Mapeo simple front -> back
        metodo_map = {'TARJETA': 'TARJETA', 'PSE': 'PSE', 'CONSIGNACION': 'EFECTIVO'}
        metodo_final = metodo_map.get(metodo_raw, 'TARJETA')
        
        banco_final = request.data.get('banco_nombre', 'Banco Konrad')

        PagoOrden.objects.create(
            orden=orden,
            monto=orden.total_final,
            metodo_pago=metodo_final,
            estado='EXITOSO',
            banco_nombre=banco_final, # Si agregamos este campo al modelo
            referencia_transaccion=f"K-PAY-{orden.id}-{int(Decimal(subtotal))}"
        )

        # 8. Notificar a cada vendedor involucrado
        try:
            from notifications.services import enviar_notificacion_venta_vendedor
            vendedores_dict = {}
            for detalle in detalles:
                v_persona = detalle.producto.vendedor.persona
                if v_persona not in vendedores_dict:
                    vendedores_dict[v_persona] = []
                vendedores_dict[v_persona].append(detalle)
                
            for v_persona, det_agrupados in vendedores_dict.items():
                enviar_notificacion_venta_vendedor(v_persona, orden, det_agrupados)
        except Exception as e:
            print("[EMAIL] Error al enviar notificación de venta a vendedores:", e)

        return Response({
            'mensaje': 'Checkout matemático exitoso', 
            'subtotal': subtotal,
            'iva': total_iva,
            'comision': total_comision,
            'costo_envio': costo_envio,
            'total_a_pagar': orden.total_final,
            'metodo_usado': metodo_final
        })




#Vista DetalleOrden
class DetalleOrdenViewSet(viewsets.ModelViewSet):
    serializer_class = DetalleOrdenSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return DetalleOrden.objects.none()
        if user.is_staff or user.is_superuser:
            return DetalleOrden.objects.all()
        if hasattr(user, 'persona_profile'):
            return DetalleOrden.objects.filter(orden__comprador=user.persona_profile)
        return DetalleOrden.objects.none()

    def perform_destroy(self, instance):
        if instance.orden.estado != 'CARRITO':
            raise PermissionDenied("La orden ya fue procesada")
        instance.delete()    

    @action(detail=False, methods=['get'])
    def mis_ventas(self, request):
        user = request.user
        if not hasattr(user, 'persona_profile'):
            return Response([])
        # Filtrar solo productos que le pertenecen al vendedor y de órdenes confirmadas
        ventas = DetalleOrden.objects.filter(
            producto__vendedor__persona=user.persona_profile
        ).exclude(orden__estado='CARRITO').order_by('-orden__fecha')
        
        serializer = self.get_serializer(ventas, many=True)
        return Response(serializer.data)

#Vista CalificacionProducto
class CalificacionProductoViewSet(viewsets.ModelViewSet):
    queryset = CalificacionProducto.objects.all()
    serializer_class = CalificacionProductoSerializer

