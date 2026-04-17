from django.contrib import admin
from .models import Puntos, HistoricoPuntos

@admin.register(Puntos)
class PuntosAdmin(admin.ModelAdmin):
    list_display = ('clinica', 'puntos_acumulados', 'numeros_sorteo', 'posicion_ranking')
    search_fields = ('clinica__nombre',)

@admin.register(HistoricoPuntos)
class HistoricoPuntosAdmin(admin.ModelAdmin):
    list_display = ('clinica', 'tipo', 'puntos', 'fecha', 'pedido')
    list_filter = ('tipo', 'fecha')
    search_fields = ('clinica__nombre', 'descripcion')
