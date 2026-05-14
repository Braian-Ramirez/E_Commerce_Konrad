import os
import sys
import django

# Añadir la raíz del proyecto al PYTHONPATH
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ecommerce_konrad.settings')
django.setup()

from django.test import Client

c = Client(SERVER_NAME='127.0.0.1')

# TEST 1: get_ingresos_totales
soap_body_ingresos = """<?xml version="1.0" encoding="utf-8"?>
<soap11env:Envelope xmlns:soap11env="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="comercial.konrad.bam.soap">
  <soap11env:Body>
    <tns:get_ingresos_totales>
      <tns:dias>30</tns:dias>
    </tns:get_ingresos_totales>
  </soap11env:Body>
</soap11env:Envelope>
"""

response_ingresos = c.post('/api/v1/bam/soap/', data=soap_body_ingresos, content_type='text/xml', HTTP_X_API_KEY='KONRAD-ERP-SECRET-2026')
print("=== get_ingresos_totales ===")
print("Status Code:", response_ingresos.status_code)
print(response_ingresos.content.decode('utf-8'))
print("="*40)

# TEST 2: get_tasa_conversion_vendedores
soap_body_conversion = """<?xml version="1.0" encoding="utf-8"?>
<soap11env:Envelope xmlns:soap11env="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="comercial.konrad.bam.soap">
  <soap11env:Body>
    <tns:get_tasa_conversion_vendedores />
  </soap11env:Body>
</soap11env:Envelope>
"""

response_conversion = c.post('/api/v1/bam/soap/', data=soap_body_conversion, content_type='text/xml', HTTP_X_API_KEY='KONRAD-ERP-SECRET-2026')
print("=== get_tasa_conversion_vendedores ===")
print("Status Code:", response_conversion.status_code)
print(response_conversion.content.decode('utf-8'))
print("="*40)
