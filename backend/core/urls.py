from django.urls import path
from .views import ClinicSettingsView, ChangePasswordView
from .admin_views import (
    MeView,
    AdminClinicListView,
    AdminUserListView,
    AdminUserDetailView,
    AdminResetPasswordView,
    AdminGlobalStatsView,
    AdminClinicManageView,
    AdminClinicDetailView,
    AdminClinicCoinsView,
)

urlpatterns = [
    # ── Authenticated user ────────────────────────────────────────────────────
    path('me/', MeView.as_view(), name='me'),
    path('clinics/me/', ClinicSettingsView.as_view(), name='clinic-settings'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),

    # ── Admin-only ────────────────────────────────────────────────────────────
    path('admin/clinics/', AdminClinicListView.as_view(), name='admin-clinic-list'),
    path('admin/clinics/manage/', AdminClinicManageView.as_view(), name='admin-clinic-manage'),
    path('admin/clinics/manage/<str:pk>/', AdminClinicDetailView.as_view(), name='admin-clinic-detail'),
    path('admin/clinics/coins/', AdminClinicCoinsView.as_view(), name='admin-clinic-coins'),
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('admin/users/<int:pk>/reset-password/', AdminResetPasswordView.as_view(), name='admin-reset-password'),
    path('admin/global-stats/', AdminGlobalStatsView.as_view(), name='admin-global-stats'),
]
