from django.db.models.signals import post_save
from django.dispatch import receiver
from compras.models import Pedido
from .services import PuntosService

@receiver(post_save, sender=Pedido)
def acumular_puntos_automatico(sender, instance, created, **kwargs):
    """
    Cuando pedido.estado cambia a 'enviado' o 'entregado',
    llamar a PuntosService.acumular_puntos
    """
    if instance.estado in ['enviado', 'entregado']:
        # We need to ensure we don't accumulate points multiple times for same order status change?
        # The prompt implies simple signal logic. 
        # Ideally we should check if points were already awarded. 
        # But let's follow the prompt. 
        # PuntosService.acumular_puntos creates a HistoricoPuntos record.
        # If we save multiple times, we might add points multiple times.
        # A robust solution would check if points for this order already exist in HistoricoPuntos.
        
        # Let's add a check:
        # PuntosService doesn't check duplication.
        # But HistoricoPuntos has 'pedido' field.
        # We can check if HistoricoPuntos with type='compra' and this pedido exists.
        
        from .models import HistoricoPuntos
        if not HistoricoPuntos.objects.filter(pedido=instance, tipo='compra').exists():
             PuntosService.acumular_puntos(instance.clinica, instance)
