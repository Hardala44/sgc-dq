import os
import django
from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Setup unified categories and map existing providers'

    def handle(self, *args, **kwargs):
        from compras.models import Categoria, Proveedor
        
        main_categories = [
            "Laboratorio",
            "Financieras",
            "Implantología",
            "Ortodoncia",
            "Servicios",
            "Depósitos Generalistas",
            "Depósitos Especialistas",
            "Financiación de Pacientes"
        ]

        servicios_subcategories = [
            "Gestión y Mkt Dental",
            "Software, Ciberseguridad y Telco",
            "Radiología UTPR y Dosimetría",
            "Gestoría, Seguros y Legal",
            "Otros"
        ]

        # 1. Create main categories
        created_mains = {}
        for idx, name in enumerate(main_categories):
            cat, created = Categoria.objects.get_or_create(nombre=name, defaults={'orden': idx})
            cat.parent = None
            cat.save()
            created_mains[name] = cat
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created main category: {name}"))

        # 2. Create subcategories
        servicios_cat = created_mains["Servicios"]
        created_subs = {}
        for idx, name in enumerate(servicios_subcategories):
            cat, created = Categoria.objects.get_or_create(nombre=name, defaults={'orden': idx})
            cat.parent = servicios_cat
            cat.save()
            created_subs[name] = cat
            if created:
                self.stdout.write(self.style.SUCCESS(f"Created subcategory: {name} under Servicios"))

        # Combine all valid categories
        valid_cats = list(created_mains.values()) + list(created_subs.values())

        # 3. Map existing providers
        for p in Proveedor.objects.all():
            current_categories = list(p.categorias.all())
            new_cats = []
            
            for cc in current_categories:
                # If they already have a valid category, keep it
                if cc in valid_cats:
                    new_cats.append(cc)
                # Naive mapping:
                elif "lab" in cc.nombre.lower():
                    new_cats.append(created_mains["Laboratorio"])
                elif "finan" in cc.nombre.lower() and "paciente" in cc.nombre.lower():
                    new_cats.append(created_mains["Financiación de Pacientes"])
                elif "finan" in cc.nombre.lower():
                    new_cats.append(created_mains["Financieras"])
                elif "implan" in cc.nombre.lower():
                    new_cats.append(created_mains["Implantología"])
                elif "ortod" in cc.nombre.lower():
                    new_cats.append(created_mains["Ortodoncia"])
                elif "dep" in cc.nombre.lower() and ("espe" in cc.nombre.lower() or "avanz" in cc.nombre.lower()):
                    new_cats.append(created_mains["Depósitos Especialistas"])
                elif "dep" in cc.nombre.lower() or "consu" in cc.nombre.lower():
                    new_cats.append(created_mains["Depósitos Generalistas"])
                elif "soft" in cc.nombre.lower() or "ciber" in cc.nombre.lower():
                    new_cats.append(created_subs["Software, Ciberseguridad y Telco"])
                elif "gest" in cc.nombre.lower() or "mkt" in cc.nombre.lower() or "market" in cc.nombre.lower():
                    new_cats.append(created_subs["Gestión y Mkt Dental"])
                elif "segur" in cc.nombre.lower() or "legal" in cc.nombre.lower():
                    new_cats.append(created_subs["Gestoría, Seguros y Legal"])
                elif "escán" in cc.nombre.lower() or "radio" in cc.nombre.lower():
                    new_cats.append(created_subs["Radiología UTPR y Dosimetría"])
                else:
                    new_cats.append(created_subs["Otros"])

            if not new_cats:
                # fallback
                new_cats.append(created_subs["Otros"])

            # Remove duplicates
            new_cats = list(set(new_cats))
            
            p.categorias.set(new_cats)
            p.save()
            self.stdout.write(f"Updated provider {p.nombre} to categories: {[c.nombre for c in new_cats]}")

        # 4. Clean up old categories
        valid_ids = [c.id for c in valid_cats]
        deleted_count, _ = Categoria.objects.exclude(id__in=valid_ids).delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted_count} old unused categories."))
        self.stdout.write(self.style.SUCCESS("Category seeding and mapping completed successfully!"))
