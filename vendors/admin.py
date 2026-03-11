from django.contrib import admin
from .models import Persona, Solicitud, Documento, Vendedor

admin.site.register(Persona)
admin.site.register(Solicitud)
admin.site.register(Documento)
admin.site.register(Vendedor)

# Register your models here.
