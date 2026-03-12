from django.urls import path
from . import views

urlpatterns = [
    # Ej: http://127.0.0.1:8000/mocks/cifin/123456789/
    path('cifin/<str:identificacion>/', views.mock_centrales_riesgo, name='mock_cifin'),
    
    # Ej: http://127.0.0.1:8000/mocks/policia/123456789/
    path('policia/<str:identificacion>/', views.mock_antecedentes_judiciales, name='mock_policia'),
    
    # Ej: http://127.0.0.1:8000/mocks/pagos/
    path('pagos/', views.mock_pasarela_pagos, name='mock_pagos'),
]
