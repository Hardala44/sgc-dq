from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/analytics/', include('analytics.urls')),
    path('api/', include('compras.urls')),
    path('api/core/', include('core.urls')),
    path('api/incentivos/', include('incentivos.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
