from django.core.management.base import BaseCommand
from decimal import Decimal
from compras.models import Proveedor

class Command(BaseCommand):
    help = "Actualiza los porcentajes de descuento_dq para los 5 proveedores clave del marketplace."

    def handle(self, *args, **options):
        # Data mapping: (Nombre, Descuento Decimal)
        # Henry Schein: 47%
        # Proclinic: 40%
        # DVD Dental: 15%
        # ZimVie: 53%
        # Straumann: 15%
        
        provider_data = [
            ("Henry Schein", Decimal("0.47")),
            ("Proclinic", Decimal("0.40")),
            ("DVD Dental", Decimal("0.15")),
            ("ZimVie", Decimal("0.53")),
            ("Straumann", Decimal("0.15")),
        ]

        self.stdout.write(self.style.WARNING("\nActualizando descuentos de proveedores...\n"))

        for nombre, descuento in provider_data:
            # Use filter().first() to avoid MultipleObjectsReturned
            # In a production environment, you might want to deduplicate these.
            proveedor = Proveedor.objects.filter(nombre__iexact=nombre).first()
            
            if not proveedor:
                proveedor = Proveedor.objects.create(
                    nombre=nombre,
                    activo=True,
                    contacto_nombre="Pendiente",
                    contacto_email="info@placeholder.com",
                    contacto_telefono="000000000"
                )
                created = True
            else:
                created = False
            
            old_discount = proveedor.descuento_dq
            proveedor.descuento_dq = descuento
            proveedor.descuento_dq = descuento
            # Ensure it is active for the marketplace
            proveedor.activo = True
            proveedor.save()

            status = "NUEVO" if created else "ACTUALIZADO"
            msg = f"- {nombre:15s} [{status:10s}]: {old_discount*100:5.1f}% -> {descuento*100:5.1f}%"
            self.stdout.write(self.style.SUCCESS(msg))

        self.stdout.write(self.style.SUCCESS("\nPROCESO COMPLETADO CON EXITO.\n"))
