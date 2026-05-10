from django.urls import path
from .views import DashboardAnalyticsView, ClinicListView, HomeHighlightsView, AvailablePeriodsView

urlpatterns = [
    path('dashboard/', DashboardAnalyticsView.as_view(), name='dashboard-analytics'),
    path('clinics/', ClinicListView.as_view(), name='analytics-clinic-list'),
    path('home-highlights/', HomeHighlightsView.as_view(), name='home-highlights'),
    path('available-periods/', AvailablePeriodsView.as_view(), name='analytics-available-periods'),
]
