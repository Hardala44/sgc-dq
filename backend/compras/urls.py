from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import (
    ProductoViewSet, ProveedorViewSet, CategoriaViewSet, OfertaViewSet,
    LeadSolicitudViewSet, SmartSearchView,
    ProductoMarketplaceViewSet, ProveedorOfertaViewSet, IngestaProductosView,
    PeticionPresupuestoViewSet, OfertaDestacadaViewSet,
    # AI-Powered Smart Search V2
    SmartSearchV2View, LiveSearchStartView, LiveSearchStatusView, PersistLiveProductView,
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
router.register('peticiones-presupuesto', PeticionPresupuestoViewSet, basename='peticion-presupuesto')
router.register('ofertas-destacadas', OfertaDestacadaViewSet, basename='oferta-destacada')

urlpatterns = [
    # ── Original search (GlobalSearch.tsx — do not change) ──────────────────
    path('directory/search/', SmartSearchView.as_view(), name='smart-search'),
    path('buscar/', SmartSearchView.as_view(), name='buscar'),

    # ── AI-Powered Smart Search V2 (MarketplaceSearch.tsx) ──────────────────
    path('smart-search/', SmartSearchV2View.as_view(), name='smart-search-v2'),
    path('live-search/', LiveSearchStartView.as_view(), name='live-search-start'),
    path('live-search-status/', LiveSearchStatusView.as_view(), name='live-search-status'),
    path('persist-live-product/', PersistLiveProductView.as_view(), name='persist-live-product'),

    # ── Ingestion gateway ────────────────────────────────────────────────────
    path('ingesta-productos/', IngestaProductosView.as_view(), name='ingesta-productos'),

    # ── Router-registered endpoints ──────────────────────────────────────────
    path('', include(router.urls)),
]

