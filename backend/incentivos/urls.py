from django.urls import path
from .views import PremioListView, PremioDetailView, LoyaltyProgressView

urlpatterns = [
    path('premios/', PremioListView.as_view(), name='premio-list'),
    path('premios/<int:pk>/', PremioDetailView.as_view(), name='premio-detail'),
    path('progress/', LoyaltyProgressView.as_view(), name='loyalty-progress'),
]
