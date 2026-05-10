from django.db import models
from core.models import Clinica
from compras.models import Pedido


class Puntos(models.Model):
    clinica = models.OneToOneField(Clinica, on_delete=models.CASCADE)
    puntos_acumulados = models.IntegerField(default=0)
    numeros_sorteo = models.IntegerField(default=0)
    posicion_ranking = models.IntegerField(null=True, blank=True)
    fecha_ultima_actualizacion = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Puntos {self.clinica}"


class HistoricoPuntos(models.Model):
    TIPO_CHOICES = (
        ('compra', 'Compra'),
        ('bonus_proveedor', 'Bonus Proveedor'),
        ('ajuste_manual', 'Ajuste Manual'),
    )

    clinica = models.ForeignKey(Clinica, on_delete=models.CASCADE)
    pedido = models.ForeignKey(Pedido, on_delete=models.SET_NULL, null=True, blank=True)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    puntos = models.IntegerField()  # Can be negative
    descripcion = models.TextField()
    fecha = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tipo} - {self.puntos} pts"


class Premio(models.Model):
    """
    Loyalty reward catalog — DQ Coins redemption.
    Managed by admin_dq via the Admin Hub.
    """
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(
        blank=True,
        help_text="Describe qué incluye el premio (ej. 'Kit de limpieza premium' o '5% dto. en próxima compra')."
    )
    coste_puntos = models.PositiveIntegerField(
        help_text="Número de DQ Coins necesarios para canjear este premio."
    )
    imagen_url = models.URLField(
        blank=True,
        help_text="URL de imagen representativa del premio."
    )
    imagen = models.ImageField(
        upload_to='premios/',
        blank=True,
        null=True,
        help_text="Imagen subida al servidor."
    )
    activo = models.BooleanField(default=True)
    orden = models.PositiveIntegerField(default=0, help_text="Orden de aparición en el catálogo.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['orden', 'coste_puntos']
        verbose_name = "Premio"
        verbose_name_plural = "Premios"

    def __str__(self):
        return f"{self.nombre} ({self.coste_puntos} pts)"
