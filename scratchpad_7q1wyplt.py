import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecommerce_konrad.settings')
django.setup()

from vendors.models import Persona
from django.contrib.auth.models import User

print("--- USERS ---")
for u in User.objects.all():
    print(f"User: {u.username}, is_staff: {u.is_staff}, is_superuser: {u.is_superuser}")
    if hasattr(u, 'persona_profile'):
        print(f"   -> Persona Profile: {u.persona_profile.nombre} {u.persona_profile.apellido}")
    elif hasattr(u, 'persona'):
        print(f"   -> Persona: {u.persona.nombre} {u.persona.apellido}")
    else:
        print("   -> No Persona")

print("\n--- STAFF PERSONAS ---")
staff_personas = Persona.objects.filter(user__is_staff=True)
for p in staff_personas:
    print(f"Staff Persona: {p.nombre} {p.apellido}")
