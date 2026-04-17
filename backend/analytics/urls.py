from django.urls import path
from .views import DashboardAnalyticsView, ClinicListView

urlpatterns = [
    path('dashboard/', DashboardAnalyticsView.as_view(), name='dashboard-analytics'),
    path('clinics/', ClinicListView.as_view(), name='analytics-clinic-list'),
]
