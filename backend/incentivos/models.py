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
    puntos = models.IntegerField() # Puede ser negativo
    descripcion = models.TextField()
    fecha = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.tipo} - {self.puntos} pts"
