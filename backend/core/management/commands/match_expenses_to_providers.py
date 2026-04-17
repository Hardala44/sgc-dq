import sys
from django.core.management.base import BaseCommand
from core.models import Gasto
from compras.models import Proveedor
from django.db.models import Count

class Command(BaseCommand):
    help = 'Matches existing Gastos to Proveedores based on source_sheet or category heuristics'

    def handle(self, *args, **options):
        # We only try to match Gastos that don't have a proveedor yet
        gastos_unmatched = Gasto.objects.filter(proveedor__isnull=True)
        total_unmatched = gastos_unmatched.count()
        self.stdout.write(self.style.WARNING(f'Found {total_unmatched} unmatched Gastos.'))

        matched_count = 0

        # We will try matching by doing simple substring checks.
        all_proveedores = Proveedor.objects.all()

        # Optimize dictionary building
        proveedor_names = {p: p.nombre.lower() for p in all_proveedores}

        for gasto in gastos_unmatched:
            # First trick: source_sheet usually contains the Vendor Name in real life if parsed from a bank statement
            sheet_name = gasto.source_sheet.lower()
            category_name = gasto.category.nombre.lower()

            best_match = None
            
            for p, p_name in proveedor_names.items():
                if p_name in sheet_name:
                    best_match = p
                    break
            
            if not best_match:
                # Fallback: maybe category name loosely maps to a strategic provider if we have a strict mapping?
                # Usually, we match by text. Let's just do exact/substring on source_sheet for now.
                pass

            if best_match:
                gasto.proveedor = best_match
                gasto.save(update_fields=['proveedor', 'updated_at'])
                matched_count += 1
                self.stdout.write(self.style.SUCCESS(f'Matched Gasto {gasto.id} -> {best_match.nombre}'))

        self.stdout.write(self.style.SUCCESS(f'Successfully matched {matched_count} out of {total_unmatched} Gastos.'))
