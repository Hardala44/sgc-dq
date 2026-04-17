from django.contrib import admin
from .models import CompraHistorica

@admin.register(CompraHistorica)
class CompraHistoricaAdmin(admin.ModelAdmin):
    list_display = ('clinica', 'proveedor', 'categoria', 'anio', 'trimestre', 'importe')
    list_filter = ('anio', 'trimestre', 'categoria')
    search_fields = ('clinica__nombre', 'proveedor__nombre')
