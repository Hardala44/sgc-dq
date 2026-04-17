from django.apps import AppConfig

class IncentivosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'incentivos'

    def ready(self):
        import incentivos.signals
