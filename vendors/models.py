from django.db import models

# Modelo Persona 
class Persona(models.Model):
    TIPO_PERSONA_CHOICES = [
        ('NATURAL', 'Persona Natural'),
        ('JURIDICA', 'Persona Juridica'),
    ]
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    numero_identificacion = models.CharField(max_length=20, unique=True)
    telefono = models.CharField(max_length=20)
    tipo_persona = models.CharField(max_length=10, choices= TIPO_PERSONA_CHOICES, default= 'NATURAL')
    pais = models.CharField(max_length=100)
    ciudad = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.nombre} {self.apellido} ({self.numero_identificacion})"

    class Meta:
        verbose_name = "Persona"
        verbose_name_plural = "Personas"

# Modelo Solicitud
class Solicitud(models.Model):

    ESTADO_CHOICES = [
        ('PENDIENTE', 'Pendiente'),
        ('APROBADA', 'Aprobada'),
        ('RECHAZADA', 'Rechazada'),
        ('DEVUELTA', 'Devuelta'),
        ('ACTIVA', 'Activa'),
        ('EN_MORA', 'En Mora'),
        ('CANCELADA', 'Cancelada'),
    ]

    RESULTADO_CREDITICIO_CHOICES = [
        ('ALTA', 'Alta'),
        ('BAJA', 'Baja'),
        ('ADVERTENCIA', 'Advertencia'),
        ('PENDIENTE', 'Pendiente'),
    ]

    RESULTADO_JUDICIAL_CHOICES = [
        ('REQUERIDO', 'Requerido'),
        ('NO_REQUERIDO', 'No Requerido'),
        ('PENDIENTE', 'Pendiente'),
    ]

    persona = models.ForeignKey(
        Persona,
        on_delete=models.CASCADE,
        related_name='solicitudes'
    )
    numero_solicitud = models.CharField(max_length=20, unique=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    resultado_crediticio = models.CharField(max_length=20, choices=RESULTADO_CREDITICIO_CHOICES, default='PENDIENTE')
    resultado_judicial = models.CharField(max_length=20, choices=RESULTADO_JUDICIAL_CHOICES, default='PENDIENTE')

    def __str__(self):
        return f"Solicitud {self.numero_solicitud} - {self.persona} [{self.estado}]"

    class Meta:
        verbose_name = "Solicitud"
        verbose_name_plural = "Solicitudes"

# Modelo Documento 
class Documento(models.Model):
    TIPO_DOCUMENTO_CHOICES = [
        ('CEDULA', 'Cédula'),
        ('RUT', 'RUT'),
        ('CAMARA_COMERCIO', 'Cámara de Comercio'),
        ('ACEPTACION_RIESGO', 'Aceptación Centrales de Riesgo'),
        ('ACEPTACION_DATOS', 'Aceptación Tratamiento de Datos'),
    ]

    solicitud = models.ForeignKey(
        Solicitud, 
        on_delete=models.CASCADE, 
        related_name='documentos'
    )
    tipo = models.CharField(max_length=20, choices=TIPO_DOCUMENTO_CHOICES)
    url_archivo = models.FileField(upload_to='documentos_vendedores/')
    fecha_carga = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_tipo_display()} - {self.solicitud.numero_solicitud}"

    class Meta:
        verbose_name = "Documento"
        verbose_name_plural = "Documentos"

# Modelo Vendedor 
class Vendedor(models.Model):
    ESTADO_SUSCRIPCION_CHOICES = [
        ('INACTIVA', 'Inactiva'),
        ('ACTIVA', 'Activa'),
        ('EN_MORA', 'En Mora'),
        ('CANCELADA', 'Cancelada'),
    ]

    persona = models.OneToOneField(
        Persona, 
        on_delete=models.CASCADE, 
        related_name='vendedor_profile'
    )
    estado_suscripcion = models.CharField(max_length=20, choices=ESTADO_SUSCRIPCION_CHOICES, default='INACTIVA')
    fecha_vencimiento = models.DateField(null=True, blank=True)
    calificacion_promedio = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)

    def __str__(self):
        return f"Vendedor: {self.persona}"

    class Meta:
        verbose_name = "Vendedor"
        verbose_name_plural = "Vendedores"




    


