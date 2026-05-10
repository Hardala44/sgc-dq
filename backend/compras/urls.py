from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import (
    ProductoViewSet, ProveedorViewSet, CategoriaViewSet, OfertaViewSet,
    LeadSolicitudViewSet, SmartSearchView,
    ProductoMarketplaceViewSet, ProveedorOfertaViewSet, IngestaProductosView,
)

router = DefaultRouter()
# Legacy routes
router.register('productos', ProductoViewSet, basename='producto-legado')
router.register('proveedores', ProveedorViewSet, basename='proveedor')
router.register('categorias', CategoriaViewSet)
router.register('ofertas', OfertaViewSet, basename='oferta')
router.register('leads', LeadSolicitudViewSet)
# Marketplace routes
router.register('catalogo', ProductoMarketplaceViewSet, basename='catalogo')
router.register('catalogo-ofertas', ProveedorOfertaViewSet, basename='catalogo-oferta')

urlpatterns = [
    # Search (directory and buscar alias)
    path('directory/search/', SmartSearchView.as_view(), name='smart-search'),
    path('buscar/', SmartSearchView.as_view(), name='buscar'),
    # Ingestion gateway
    path('ingesta-productos/', IngestaProductosView.as_view(), name='ingesta-productos'),
    # Router-registered endpoints
    path('', include(router.urls)),
]
