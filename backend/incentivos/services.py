from .models import Puntos, HistoricoPuntos
from compras.models import Pedido
from django.db import transaction

class PuntosService:
    @staticmethod
    def calcular_puntos_pedido(pedido):
        """
        Reglas exactas:
        - 10 puntos por cada 1.000€ COMPLETOS del total
        - +100 puntos si proveedor.es_estrategico = True
        - 999€ = 0 puntos base, 1000€ = 10 puntos base
        """
        # Ensure total is treated as a number, though it should be Decimal from model
        total = pedido.total
        puntos_base = (int(total) // 1000) * 10
        
        bonus = 0
        if pedido.proveedor.es_estrategico:
            bonus = 100
            
        return puntos_base + bonus
    
    @staticmethod
    @transaction.atomic
    def acumular_puntos(clinica, pedido):
        """
        1. Calcular puntos del pedido
        2. Sumar a Puntos.puntos_acumulados
        3. Actualizar Puntos.numeros_sorteo = puntos_acumulados // 100
        4. Crear registro en HistoricoPuntos
        """
        puntos_ganados = PuntosService.calcular_puntos_pedido(pedido)
        
        # Get or create Puntos record for the clinica
        puntos_obj, _ = Puntos.objects.get_or_create(clinica=clinica)
        
        puntos_obj.puntos_acumulados += puntos_ganados
        puntos_obj.numeros_sorteo = puntos_obj.puntos_acumulados // 100
        puntos_obj.save()
        
        # Record history
        HistoricoPuntos.objects.create(
            clinica=clinica,
            pedido=pedido,
            tipo='compra',
            puntos=puntos_ganados,
            descripcion=f"Puntos por pedido {pedido.numero_pedido}"
        )
        
        return puntos_ganados
