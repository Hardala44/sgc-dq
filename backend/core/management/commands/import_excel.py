from django.core.management.base import BaseCommand
from core.services.import_service import ImportService
import json

class Command(BaseCommand):
    help = 'Imports clinic data and expenses from an Excel file'

    def add_arguments(self, parser):
        parser.add_argument('file_path', type=str, help='Path to the .xlsx file')
        parser.add_argument('--force', action='store_true', help='Force re-import even if checksum matches')

    def handle(self, *args, **options):
        file_path = options['file_path']
        force = options['force']
        
        self.stdout.write(self.style.SUCCESS(f"Starting import from {file_path}..."))
        
        try:
            service = ImportService(file_path, force=force)
            stats, unresolved = service.run()
            
            self.stdout.write(self.style.SUCCESS("Import completed successfully!"))
            self.stdout.write(json.dumps(stats, indent=2))

            if unresolved:
                import pandas as pd
                report_path = "unresolved_aliases.csv"
                pd.DataFrame(unresolved).to_csv(report_path, index=False)
                self.stdout.write(self.style.WARNING(f"Generated unresolved aliases report: {report_path}"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Import failed: {str(e)}"))
            # Optionally print traceback
            import traceback
            traceback.print_exc()
