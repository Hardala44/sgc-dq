from django.db import models
from core.models import Clinica
from compras.models import Proveedor, Categoria

class CompraHistorica(models.Model):
    clinica = models.ForeignKey(Clinica, on_delete=models.CASCADE)
    proveedor = models.ForeignKey(Proveedor, on_delete=models.SET_NULL, null=True, blank=True)
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT)
    anio = models.IntegerField()
    trimestre = models.IntegerField() # 1-4
    importe = models.DecimalField(max_digits=10, decimal_places=2)
    fecha_importacion = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.clinica} - {self.anio} Q{self.trimestre}"
