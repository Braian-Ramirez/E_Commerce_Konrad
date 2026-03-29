from django.db import models
from django.contrib.auth.models import User

# modelo director comercial
class DirectorComercial(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='director_comercial_profile')

    departamento = models.CharField(max_length=100, default="Comercial")

    telefono = models.CharField(max_length=20, blank=True, null=True)
    


