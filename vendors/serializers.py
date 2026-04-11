from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Persona, Vendedor, Solicitud, ConsultaCrediticia_Local, CalificacionVendedor, Documento
from notifications.models import Notificacion
from django.db import transaction



# Serializador User
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

# Serializador Persona
class PersonaSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = Persona
        fields = [
            'id', 'user', 'user_details', 'nombre', 'apellido', 
            'email', 'numero_identificacion', 'telefono', 'direccion',
            'tipo_persona', 'pais', 'ciudad'
        ]

# Serializador Vendedor
class VendedorSerializer(serializers.ModelSerializer):
    persona_details = PersonaSerializer(source='persona', read_only=True)
    
    class Meta:
        model = Vendedor
        fields = [
            'id', 'persona', 'persona_details', 'estado_suscripcion', 
            'fecha_vencimiento', 'calificacion_promedio'
        ]

# Serializador Consulta Crediticia Local
class ConsultaCrediticiaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultaCrediticia_Local
        fields = '__all__'

# Serializador Solicitud (Aplanado para el Dashboard)
class SolicitudSerializer(serializers.ModelSerializer):
    identificacion = serializers.CharField(source='persona.numero_identificacion', read_only=True)
    nombres = serializers.CharField(source='persona.nombre', read_only=True)
    apellidos = serializers.CharField(source='persona.apellido', read_only=True)
    email = serializers.EmailField(source='persona.email', read_only=True)
    telefono = serializers.CharField(source='persona.telefono', read_only=True)
    
    # Campo anidado para el reporte de riesgo detallado
    credit_data = ConsultaCrediticiaSerializer(read_only=True)

    class Meta:
        model = Solicitud
        fields = [
            'id', 'numero_solicitud', 'estado', 'fecha_creacion',
            'identificacion', 'nombres', 'apellidos', 'email', 'telefono',
            'resultado_datacredito', 'resultado_cifin', 'resultado_judicial',
            'fecha_consulta_judicial', 'credit_data'
        ]

# Serializador CalificacionVendedor
class CalificacionVendedorSerializer(serializers.ModelSerializer):
    class Meta:
        model = CalificacionVendedor
        fields = '__all__'
        read_only_fields = ['fecha']

# Serializador Solicitud Vendedor Registro
# Serializador Solicitud Vendedor Registro
class SolicitudVendedorRegistrationSerializer(serializers.ModelSerializer):
    # Campos de Persona
    nombre = serializers.CharField(write_only=True)
    apellido = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    tipo_documento = serializers.CharField(write_only=True)
    numero_identificacion = serializers.CharField(write_only=True)
    telefono = serializers.CharField(write_only=True)
    pais = serializers.CharField(write_only=True)
    ciudad = serializers.CharField(write_only=True)
    direccion = serializers.CharField(write_only=True, required=False, allow_blank=True)
    tipo_persona = serializers.CharField(write_only=True)
    
    # 5 Campos de Documentación Obligatoria (Independientes)
    doc_cedula = serializers.FileField(write_only=True)
    doc_rut = serializers.FileField(write_only=True)
    doc_camara = serializers.FileField(write_only=True)
    doc_riesgo = serializers.FileField(write_only=True)
    doc_datos = serializers.FileField(write_only=True)

    class Meta:
        model = Solicitud
        # Definimos los campos que retornaremos (lectura) y los que recibiremos (escritura)
        fields = [
            'nombre', 'apellido', 'email', 'tipo_documento', 'numero_identificacion',
            'telefono', 'pais', 'ciudad', 'direccion', 'tipo_persona',
            'doc_cedula', 'doc_rut', 'doc_camara', 'doc_riesgo', 'doc_datos',
            'id', 'numero_solicitud', 'estado'
        ]
        read_only_fields = ['id', 'numero_solicitud', 'estado']

    def create(self, validated_data):
        # Extraemos los archivos individuales
        doc_cedula = validated_data.pop('doc_cedula')
        doc_rut = validated_data.pop('doc_rut')
        doc_camara = validated_data.pop('doc_camara')
        doc_riesgo = validated_data.pop('doc_riesgo')
        doc_datos = validated_data.pop('doc_datos')

        with transaction.atomic():
            # 1. Crear o buscar la Persona
            persona_data = {
                'nombre': validated_data.pop('nombre'),
                'apellido': validated_data.pop('apellido'),
                'email': validated_data.pop('email'),
                'tipo_documento': validated_data.pop('tipo_documento'),
                'numero_identificacion': validated_data.pop('numero_identificacion'),
                'telefono': validated_data.pop('telefono'),
                'pais': validated_data.pop('pais'),
                'ciudad': validated_data.pop('ciudad'),
                'direccion': validated_data.pop('direccion', ''),
                'tipo_persona': validated_data.pop('tipo_persona'),
            }
            persona, created = Persona.objects.get_or_create(
                numero_identificacion=persona_data['numero_identificacion'],
                defaults=persona_data
            )

            # 2. Crear la Solicitud inicialmente con número temporal
            solicitud = Solicitud.objects.create(
                persona=persona,
                numero_solicitud="TEMP"
            )

            # 3. Asignar el ID real como número de radicado definitivo
            solicitud.numero_solicitud = f"RAD-{solicitud.id:04d}"
            solicitud.save()

            # 4. Guardar los 5 documentos vinculándolos a su TIPO específico
            docs_a_guardar = [
                ('CEDULA', doc_cedula),
                ('RUT', doc_rut),
                ('CAMARA_COMERCIO', doc_camara),
                ('ACEPTACION_RIESGO', doc_riesgo),
                ('ACEPTACION_DATOS', doc_datos),
            ]

            for tipo, archivo in docs_a_guardar:
                Documento.objects.create(
                    solicitud=solicitud,
                    tipo=tipo,
                    url_archivo=archivo
                )

            # 5. Notificación automática del sistema para el Director Comercial
            # Buscamos al Director Comercial en la base de datos (administrador del sistema)
            director = Persona.objects.filter(user__is_staff=True).first()
            
            # Si no hay un staff asignado como Persona, devolvemos a la persona original como fallback
            notificar_a = director if director else persona

            Notificacion.objects.create(
                persona=notificar_a,
                tipo='SOLICITUD',
                mensaje=f"🔔 Nueva solicitud de registro: {persona.nombre} {persona.apellido}. Radicado: {solicitud.numero_solicitud}. Pendiente por revisar."
            )

            return solicitud

