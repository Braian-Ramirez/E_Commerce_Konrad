from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .utils import registrar_evento_auditoria

# Lista extendida de modelos clave para auditar
MODELS_TO_AUDIT = [
    # Productos
    'products.Producto',
    'products.Categoria',
    'products.Subcategoria',
    
    # Órdenes
    'orders.Orden',
    'orders.DetalleOrden',
    
    # Usuarios y Perfiles
    'vendors.Persona',
    'vendors.Vendedor',
    'buyers.Comprador',
    'directors.DirectorComercial',
    
    # Solicitudes de vendedores
    'vendors.Solicitud',
]

def generic_audit_save(sender, instance, created, **kwargs):
    # Evitar recursividad
    if sender.__name__ in ['RegistroAuditoria', 'LogError']:
        return

    app_label = sender._meta.app_label
    model_name = sender.__name__
    full_path = f"{app_label}.{model_name}"

    if full_path in MODELS_TO_AUDIT:
        accion = "CREACIÓN" if created else "ACTUALIZACIÓN"
        registrar_evento_auditoria(instance, f"{accion} de {model_name}")

def generic_audit_delete(sender, instance, **kwargs):
    if sender.__name__ in ['RegistroAuditoria', 'LogError']:
        return

    app_label = sender._meta.app_label
    model_name = sender.__name__
    full_path = f"{app_label}.{model_name}"

    if full_path in MODELS_TO_AUDIT:
        registrar_evento_auditoria(instance, f"ELIMINACIÓN de {model_name}", severidad='WARNING')

# Conexión dinámica
from django.apps import apps

def connect_audit_signals():
    for model_path in MODELS_TO_AUDIT:
        try:
            app_label, model_name = model_path.split('.')
            model = apps.get_model(app_label, model_name)
            if model:
                post_save.connect(generic_audit_save, sender=model, dispatch_uid=f"audit_save_{model_path}")
                post_delete.connect(generic_audit_delete, sender=model, dispatch_uid=f"audit_delete_{model_path}")
        except Exception as e:
            # Silencioso en producción, pero útil para depuración inicial
            pass
