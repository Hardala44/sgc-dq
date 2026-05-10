from django.urls import path
from .views import PremioListView, PremioDetailView

urlpatterns = [
    path('premios/', PremioListView.as_view(), name='premio-list'),
    path('premios/<int:pk>/', PremioDetailView.as_view(), name='premio-detail'),
]
