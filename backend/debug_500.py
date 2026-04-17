import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
django.setup()

from core.models import Usuario
from analytics.services import AnalyticsService
import traceback

u = Usuario.objects.get(email='nur_nam@hotmail.com')
try:
    data = AnalyticsService.get_dashboard_data(u.clinica, '2025-Q1')
    print("SUCCESS", data.keys())
except Exception as e:
    traceback.print_exc()
