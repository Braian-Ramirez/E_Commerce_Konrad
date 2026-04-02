from django.db import models
from django.contrib.auth.models import User
from vendors.models import Persona

# modelo director comercial
class DirectorComercial(models.Model):
    
    persona = models.OneToOneField(Persona, on_delete=models.CASCADE, related_name='director_profile')
    
    # Campos que solo tiene el Director
    cargo = models.CharField(max_length=100, default="Director Comercial")
    dependencia = models.CharField(max_length=100, default="Gerencia de Ventas")
    telefono_corporativo = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"{self.persona.nombre} {self.persona.apellido} - {self.cargo}"

    


