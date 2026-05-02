from django.urls import path
from .views import test_error_view, test_unhandled_error_view

urlpatterns = [
    path('test-error/', test_error_view, name='test_error'),
    path('test-500/', test_unhandled_error_view, name='test_500'),
]
