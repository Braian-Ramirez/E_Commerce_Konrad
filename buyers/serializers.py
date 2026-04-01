from rest_framework import serializers
from django.db import transaction
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from .models import Comprador
from notifications.models import CorreoEnviado
from vendors.models import Persona
from vendors.serializers import PersonaSerializer
import random
import string

def generar_password_valido():
        longitud = 12
        # Aseguramos al menos uno de cada tipo requerido
        p_min = random.choice(string.ascii_lowercase)
        p_maj = random.choice(string.ascii_uppercase)
        p_num = random.choice(string.digits)
        p_simbol = random.choice("!#$%&/@")
        # El resto es aleatorio
        p_resto = ''.join(random.choices(string.ascii_letters + string.digits, k=longitud-4))
        
        password = list(p_min + p_maj + p_num + p_resto + p_simbol)
        random.shuffle(password) # Mezclamos para que no siempre sea el mismo orden
        return ''.join(password)


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
            password = generar_password_valido()
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
            ahora = timezone.now()
            mensaje = render_to_string('emails/registro_bienvenida.txt', {
              'nombre': nombre,
              'email': email,
              'password': password,
              'fecha_stamp': ahora.strftime('%Y-%m-%d %H:%M:%S'),
              'transaccion_id': f"REG-{ahora.strftime('%y%m%d')}-{user.id}"
          })
            send_mail(
                subject='Bienvenido a Konrad Shop - Tus Credenciales',
                message=mensaje,
                from_email=None,
                recipient_list=[email],
                fail_silently=False,
            )

            # Registrar el correo en la tabla de auditoría (Notificaciones)
            CorreoEnviado.objects.create(
                destinatario=persona,
                asunto='Bienvenido a Konrad Shop - Tus Credenciales',
                cuerpo=mensaje,
                timestamp_hash=f"SHA256-{ahora.timestamp()}" # Simulación de hash legal
            )


            return comprador