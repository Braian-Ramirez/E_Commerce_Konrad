from django.db import models

class LogVisitaProducto(models.Model):
    """
    Registra cada vez que un usuario consulta la página de un producto.
    Es la fuente de datos para los KPIs de 'Categoría más consultada'
    y 'Productos con tendencia' del tablero BAM.
    """
    producto = models.ForeignKey(
        'products.Producto',
        on_delete=models.CASCADE,
        related_name='visitas'
    )
    fecha_visita = models.DateTimeField(auto_now_add=True)
    # Podemos guardar de dónde vino (opcional, para el análisis de redes sociales)
    origen = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="Ej: instagram, twitter, directo"
    )

    class Meta:
        verbose_name = "Log de Visita a Producto"
        verbose_name_plural = "Logs de Visitas a Productos"

    def __str__(self):
        return f"Visita a {self.producto.nombre} - {self.fecha_visita}"

