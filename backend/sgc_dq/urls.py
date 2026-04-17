from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/analytics/', include('analytics.urls')),
    path('api/', include('compras.urls')),
    path('api/core/', include('core.urls')),
]
