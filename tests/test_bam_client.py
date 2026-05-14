import os
import sys
import django

# Añadir la raíz del proyecto al PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecommerce_konrad.settings')
django.setup()

from django.test import Client
from django.contrib.auth.models import User
# pyrefly: ignore [missing-import]
from rest_framework_simplejwt.tokens import RefreshToken

user = User.objects.filter(is_superuser=True).first()
token = RefreshToken.for_user(user).access_token
c = Client(HTTP_AUTHORIZATION=f'Bearer {token}')
response = c.get('/api/v1/bam/kpi/vendedor-estrella/?fecha_desde=2026-04-01&fecha_hasta=2026-05-30')

print(response.status_code)
try:
    print(response.json())
except Exception:
    import re
    m = re.search(r'<title>(.*?)</title>', response.content.decode('utf-8'))
    if m:
        print("ERROR TITLE:", m.group(1))
    
    m2 = re.search(r'Exception Value:.*?(<pre>.*?</pre>)', response.content.decode('utf-8'), re.DOTALL | re.IGNORECASE)
    if m2:
        print("EXCEPTION:", m2.group(1))
    else:
        print("NO EXCEPTION DETAILS FOUND.")
