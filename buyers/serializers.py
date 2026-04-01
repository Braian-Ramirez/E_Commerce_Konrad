from rest_framework import serializers
from django.db import transaction
from django.contrib.auth.models import User
from django.utils.crypto import get_random_string
from django.core.mail import send_mail
from django.template.loader import render_to_string
from .models import Comprador
from vendors.models import Persona
from vendors.serializers import PersonaSerializer

# Serializer para Comprador
class CompradorSerializer(serializers.ModelSerializer):
    #ANIDACIÓN: Traemos toda la info de la persona vinculada
    persona_detalles = PersonaSerializer(source='persona', read_only=True)
    
    class Meta:
        model = Comprador
        fields = ['id', 'persona', 'persona_detalles', 'puntos_recompensa', 'twitter', 'instagram']

# Serializerespecilizado en REGISTRO
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

    def create(self,validated_data):
        with transaction.atomic():
            # Extraer los datos pertenecientes a Persona
            email = validated_data.pop('email')
            nombre = validated_data.pop('nombre')
            apellido = validated_data.pop('apellido')
            tipo_documento = validated_data.pop('tipo_documento')
            numero_identificacion = validated_data.pop('numero_identificacion')
            telefono = validated_data.pop('telefono')
            pais = validated_data.pop('pais')
            ciudad = validated_data.pop('ciudad')
            direccion = validated_data.pop('direccion')

            #Crear Usuario
            username = email
            password = get_random_string(12)
            user = User.objects.create_user(username=username, email=email, password=password)

            #Crear Persona
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

            #Crear Comprador
            comprador = Comprador.objects.create(persona=persona, **validated_data)

            # Enviar credenciales por correo
            # Renderizar el mensaje usando el template externo
            mensaje = render_to_string('emails/registro_bienvenida.txt', {
                'nombre': nombre,
                'email': email,
                'password': password,
            })
            send_mail(
                subject='Bienvenido a Konrad Shop - Tus Credenciales',
                message=mensaje,
                from_email=None,
                recipient_list=[email],
                fail_silently=False,
            )

            return comprador