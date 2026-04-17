from django.urls import path
from .views import ClinicSettingsView

urlpatterns = [
    path('clinics/me/', ClinicSettingsView.as_view(), name='clinic-settings'),
]
