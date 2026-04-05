from rest_framework import serializers
from django.db import transaction
from django.contrib.auth.models import User
from .models import Comprador, MedioPago
from vendors.models import Persona
from vendors.serializers import PersonaSerializer
from notifications.services import enviar_correo_bienvenida_comprador
import random
import string

def generar_password_valido():
    longitud = 12
    p_min = random.choice(string.ascii_lowercase)
    p_maj = random.choice(string.ascii_uppercase)
    p_num = random.choice(string.digits)
    p_simbol = random.choice("!#$%&/@")
    p_resto = ''.join(random.choices(string.ascii_letters + string.digits, k=longitud-4))
    password = list(p_min + p_maj + p_num + p_resto + p_simbol)
    random.shuffle(password)
    return ''.join(password)

class CompradorSerializer(serializers.ModelSerializer):
    persona_detalles = PersonaSerializer(source='persona', read_only=True)
    class Meta:
        model = Comprador
        fields = ['id', 'persona', 'persona_detalles', 'puntos_recompensa', 'twitter', 'instagram']

class MedioPagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = MedioPago
        fields = '__all__'
        read_only_fields = ['comprador']

class CompradorUpdateSerializer(serializers.ModelSerializer):
    # Usamos required=False y allow_blank=True para evitar el error 400 si algún campo falta o está vacío
    nombre = serializers.CharField(source='persona.nombre', required=False, allow_blank=True)
    apellido = serializers.CharField(source='persona.apellido', required=False, allow_blank=True)
    telefono = serializers.CharField(source='persona.telefono', required=False, allow_blank=True)
    ciudad = serializers.CharField(source='persona.ciudad', required=False, allow_blank=True)
    pais = serializers.CharField(source='persona.pais', required=False, allow_blank=True)
    direccion = serializers.CharField(source='persona.direccion', required=False, allow_blank=True)
    email = serializers.EmailField(source='persona.email', read_only=True)

    class Meta:
        model = Comprador
        fields = ['nombre', 'apellido', 'telefono', 'ciudad', 'pais', 'direccion', 'email', 'twitter', 'instagram']

    def update(self, instance, validated_data):
        persona_data = validated_data.pop('persona', {})
        persona = instance.persona
        
        # Actualizar Persona si hay datos
        for attr, value in persona_data.items():
            setattr(persona, attr, value)
        persona.save()
        
        # Actualizar Comprador (instagram, twitter, etc)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        return instance

class CompradorRegistrationSerializer(serializers.ModelSerializer):
    nombre = serializers.CharField(write_only=True)
    apellido = serializers.CharField(write_only=True)
    email = serializers.EmailField(write_only=True)
    tipo_documento = serializers.CharField(write_only=True)
    numero_identificacion = serializers.CharField(write_only=True)
    telefono = serializers.CharField(write_only=True)
    pais = serializers.CharField(write_only=True)
    ciudad = serializers.CharField(write_only=True)
    direccion = serializers.CharField(write_only=True)

    class Meta:
        model = Comprador
        fields = ['nombre', 'apellido', 'email', 'tipo_documento',
        'numero_identificacion', 'telefono', 'pais', 'ciudad',
        'direccion', 'twitter', 'instagram']

    def validate_email(self, value):
        from django.contrib.auth.models import User
        from vendors.models import Persona
        if User.objects.filter(username=value).exists() or Persona.objects.filter(email=value).exists():
            raise serializers.ValidationError("Este correo ya se encuentra registrado en el sistema.")
        return value

    def validate_numero_identificacion(self, value):
        from vendors.models import Persona
        if Persona.objects.filter(numero_identificacion=value).exists():
            raise serializers.ValidationError("Este número de documento ya está registrado.")
        return value

    def create(self,validated_data):
        with transaction.atomic():
            email = validated_data.pop('email')
            nombre = validated_data.pop('nombre')
            apellido = validated_data.pop('apellido')
            tipo_documento = validated_data.pop('tipo_documento')
            numero_identificacion = validated_data.pop('numero_identificacion')
            telefono = validated_data.pop('telefono')
            pais = validated_data.pop('pais')
            ciudad = validated_data.pop('ciudad')
            direccion = validated_data.pop('direccion')

            username = email
            password = generar_password_valido()
            user = User.objects.create_user(username=username, email=email, password=password)

            persona = Persona.objects.create(
                user=user,
                nombre=nombre,
                apellido=apellido,
                email= email,
                tipo_documento=tipo_documento,
                numero_identificacion=numero_identificacion,
                telefono=telefono,
                pais=pais,
                ciudad=ciudad,
                direccion=direccion
            )

            comprador = Comprador.objects.create(persona=persona, **validated_data)

            # Enviar credenciales a través del SERVICIO CENTRALIZADO 🏛️📧✨
            enviar_correo_bienvenida_comprador(persona, password)

            return comprador