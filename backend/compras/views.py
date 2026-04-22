from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Min, Count
from rest_framework.viewsets import ModelViewSet
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
import logging
import hmac
from django.conf import settings

from .models import (
    Categoria, Proveedor, ProductoLegado, Oferta,
    ProductoEstrella, LeadSolicitud, Producto, ProveedorOferta,
)
from .serializers import (
    CategoriaSerializer, ProveedorSerializer, ProductoSerializer,
    OfertaSerializer, ProductoEstrellaSerializer, LeadSolicitudSerializer,
    ProductoMarketplaceSerializer, ProveedorOfertaSerializer,
)

# Dedicated logger — writes to console + ingestion.log (see settings.py LOGGING)
ingestion_log = logging.getLogger('compras.ingestion')


# ─── Legacy ViewSets (backward compatibility) ─────────────────────────────────

class CategoriaViewSet(ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer


class ProveedorViewSet(ModelViewSet):
    queryset = Proveedor.objects.filter(activo=True).prefetch_related('categorias')
    serializer_class = ProveedorSerializer
    pagination_class = None
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['categorias']
    search_fields = ['nombre']


class ProductoViewSet(ModelViewSet):
    queryset = ProductoLegado.objects.filter(activo=True)
    serializer_class = ProductoSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['categoria', 'proveedor']
    search_fields = ['nombre']


class OfertaViewSet(ModelViewSet):
    queryset = Oferta.objects.filter(activa=True)
    serializer_class = OfertaSerializer


class LeadSolicitudViewSet(ModelViewSet):
    queryset = LeadSolicitud.objects.all()
    serializer_class = LeadSolicitudSerializer

    def perform_create(self, serializer):
        user = self.request.user
        original_mensaje = serializer.validated_data.get('mensaje_interes', '')
        prefix = f"[SOLICITUD VIA DENTALQUALITY] - Clinica: {user.clinica.nombre} - CIF: {user.clinica.cif} -- Mensaje: "

        serializer.save(
            usuario_solicitante=user,
            clinica=user.clinica,
            mensaje_interes=f"{prefix}{original_mensaje}"
        )


# ─── Marketplace ViewSet ──────────────────────────────────────────────────────

class ProductoMarketplaceViewSet(ModelViewSet):
    """
    Read/write for Marketplace Productos, annotated with supplier_count (prices removed).
    """
    serializer_class = ProductoMarketplaceSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['categoria', 'activo']
    search_fields = ['nombre', 'marca', 'descripcion']
    ordering_fields = ['nombre', 'supplier_count']
    ordering = ['nombre']

    def get_queryset(self):
        return (
            Producto.objects.filter(activo=True)
            .prefetch_related('ofertas__proveedor')
            .annotate(
                supplier_count=Count('ofertas__proveedor', distinct=True),
            )
        )


class ProveedorOfertaViewSet(ModelViewSet):
    queryset = ProveedorOferta.objects.select_related('producto', 'proveedor')
    serializer_class = ProveedorOfertaSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['producto', 'proveedor', 'stock_status']
    ordering_fields = ['ultima_actualizacion']


# ─── Ingestion Helpers ────────────────────────────────────────────────────────

# Fuzzy alias map: terms n8n / scrapers typically send -> canonical Categoria.nombre
# Keys are lowercase, accent-stripped. Values must match exactly a Categoria.nombre in DB.
CATEGORY_ALIAS_MAP = {
    # Consumibles / Lab
    'consumibles': 'Laboratorio',
    'consumible': 'Laboratorio',
    'material de consumo': 'Laboratorio',
    'consumo': 'Laboratorio',
    'material clinico': 'Laboratorio',
    'laboratorio': 'Laboratorio',
    'lab': 'Laboratorio',
    # Implantologia
    'implantologia': 'Implantologia',
    'implantes': 'Implantologia',
    'implante': 'Implantologia',
    'cirugia': 'Implantologia',
    'implant': 'Implantologia',
    # Ortodoncia
    'ortodoncia': 'Ortodoncia',
    'ortodontica': 'Ortodoncia',
    'brackets': 'Ortodoncia',
    # Depositos
    'deposito generalista': 'Depositos Generalistas',
    'depositos generalistas': 'Depositos Generalistas',
    'deposito especialista': 'Depositos Especialistas',
    'depositos especialistas': 'Depositos Especialistas',
    # Financieras
    'financieras': 'Financieras',
    'financiacion': 'Financiacion de Pacientes',
    'financiacion pacientes': 'Financiacion de Pacientes',
    # Servicios
    'servicios': 'Servicios',
    'software': 'Software, Ciberseguridad y Telco',
    'ciberseguridad': 'Software, Ciberseguridad y Telco',
    'gestion': 'Gestion y Mkt Dental',
    'marketing dental': 'Gestion y Mkt Dental',
    'radiologia': 'Radiologia UTPR y Dosimetria',
    'gestoria': 'Gestoria, Seguros y Legal',
    'seguros': 'Gestoria, Seguros y Legal',
}


def _strip_accents(s: str) -> str:
    return (s.lower()
            .replace('\u00f3', 'o').replace('\u00e1', 'a').replace('\u00e9', 'e')
            .replace('\u00ed', 'i').replace('\u00fa', 'u').replace('\u00f1', 'n')
            .replace('\u00f2', 'o').replace('\u00e0', 'a').replace('\u00e8', 'e')
            .strip())


def _resolve_categoria(item: dict):
    """
    Resolves a Categoria from an ingestion payload item.
    Strategy order:
      1. categoria_id  (integer PK - fastest)
      2. categoria_name / categoria_nombre  exact iexact DB lookup
      3. Alias map  (normalised key -> canonical name -> DB lookup)
      4. Partial icontains DB fallback
    Returns a Categoria instance or None.
    """
    # 1. By PK
    cat_id = item.get('categoria_id')
    if cat_id:
        try:
            return Categoria.objects.get(pk=cat_id)
        except Categoria.DoesNotExist:
            ingestion_log.warning('categoria_id=%s not found, trying name fallback.', cat_id)

    # 2–4: By name
    raw = (item.get('categoria_name') or item.get('categoria_nombre') or '').strip()
    if not raw:
        return None

    # 2. Exact iexact
    qs = Categoria.objects.filter(nombre__iexact=raw)
    if qs.exists():
        return qs.first()

    # 3. Alias map (normalise first)
    key = _strip_accents(raw)
    alias_target = CATEGORY_ALIAS_MAP.get(key)
    if alias_target:
        qs2 = Categoria.objects.filter(nombre__iexact=alias_target)
        if qs2.exists():
            cat = qs2.first()
            ingestion_log.info('Alias match: "%s" -> "%s" (id=%s)', raw, cat.nombre, cat.id)
            return cat
        # Try stripping accents from DB values too
        qs3 = Categoria.objects.all()
        for c in qs3:
            if _strip_accents(c.nombre) == _strip_accents(alias_target):
                ingestion_log.info('Accent-stripped alias: "%s" -> DB "%s"', raw, c.nombre)
                return c

    # 4. Partial icontains fallback
    qs4 = Categoria.objects.filter(nombre__icontains=raw)
    if qs4.exists():
        cat = qs4.first()
        ingestion_log.info('Fuzzy partial match: "%s" -> "%s" (id=%s)', raw, cat.nombre, cat.id)
        return cat

    # Try partial with normalised key
    qs5 = Categoria.objects.all()
    for c in qs5:
        if key in _strip_accents(c.nombre) or _strip_accents(c.nombre) in key:
            ingestion_log.info('Accent-fuzzy match: "%s" -> DB "%s"', raw, c.nombre)
            return c

    ingestion_log.warning('Could not resolve category from "%s".', raw)
    return None


def _resolve_proveedor(item: dict):
    """
    Resolves a Proveedor by PK, then by exact name, then partial icontains.
    Returns a Proveedor instance or None.
    """
    prov_id = item.get('proveedor_id')
    if prov_id:
        try:
            return Proveedor.objects.get(pk=prov_id)
        except Proveedor.DoesNotExist:
            ingestion_log.warning('proveedor_id=%s not found, trying name fallback.', prov_id)

    raw = (item.get('proveedor_nombre') or item.get('proveedor_name') or '').strip()
    if not raw:
        return None

    # Exact iexact (active only)
    qs = Proveedor.objects.filter(nombre__iexact=raw, activo=True)
    if qs.exists():
        return qs.first()

    # Partial icontains
    qs2 = Proveedor.objects.filter(nombre__icontains=raw, activo=True)
    if qs2.exists():
        p = qs2.first()
        ingestion_log.info('Fuzzy proveedor: "%s" -> "%s" (id=%s)', raw, p.nombre, p.id)
        return p

    ingestion_log.warning('Could not resolve proveedor from "%s".', raw)
    return None


# ─── Ingestion API ────────────────────────────────────────────────────────────

class IngestaProductosView(APIView):
    """
    POST /api/compras/ingesta-productos/

    Secure ingestion gateway for n8n / scraper pipelines.

    Authentication:
        Header:  X-Api-Key: <INGESTION_API_KEY>
        (bypasses JWT — bots don't have user sessions)

    Category resolution order:
        1. categoria_id  (integer PK)
        2. categoria_name / categoria_nombre  (exact iexact)
        3. Alias map  (e.g. 'Consumibles' -> 'Laboratorio')
        4. Partial icontains fallback

    Proveedor resolution order:
        1. proveedor_id  (integer PK)
        2. proveedor_nombre / proveedor_name  (exact / partial)

    Payload — list of objects:
    [
      {
        "linea_producto":   "Guantes de Nitrilo",
        "marca":            "Medicaline",
        "categoria_name":   "Consumibles",
        "proveedor_nombre": "Henry Schein",
        "url_compra_especifica": "https://tienda.proveedor.es/producto/123"
      }
    ]

    Responses:
        200 OK            all items processed successfully
        207 Multi-Status  partial success (some items failed)
        400 Bad Request   payload is not a list
        401 Unauthorized  missing or invalid API key
    """
    permission_classes = []    # No JWT — handled by API key below
    authentication_classes = []

    def _check_api_key(self, request) -> bool:
        """Constant-time comparison to prevent timing attacks."""
        provided = request.headers.get('X-Api-Key', '')
        expected = getattr(settings, 'INGESTION_API_KEY', '')
        return hmac.compare_digest(provided, expected)

    def post(self, request, *args, **kwargs):
        # ── 1. API Key gate ──────────────────────────────────────────────────
        if not self._check_api_key(request):
            ingestion_log.warning(
                'UNAUTHORIZED ingestion attempt IP=%s UA="%s"',
                request.META.get('REMOTE_ADDR', '?'),
                request.META.get('HTTP_USER_AGENT', '?')[:120],
            )
            return Response(
                {'error': 'API key invalida o ausente. Incluye el header X-Api-Key.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # ── 2. Validate payload shape ────────────────────────────────────────
        items = request.data
        if not isinstance(items, list):
            ingestion_log.error('Payload is not a list: %s', type(items).__name__)
            return Response(
                {'error': 'Se esperaba una lista JSON de productos.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        source_ip = request.META.get('REMOTE_ADDR', '?')
        ingestion_log.info('Ingestion batch START: %d items from IP=%s', len(items), source_ip)

        created_count = 0
        updated_count = 0
        errors = []
        results = []

        # ── 3. Process each item ─────────────────────────────────────────────
        for idx, item in enumerate(items):
            pfx = '[idx=%d]' % (idx)
            try:
                # Proveedor
                proveedor = _resolve_proveedor(item)
                if not proveedor:
                    msg = 'No se pudo resolver el Proveedor (proporciona proveedor_id o proveedor_nombre).'
                    ingestion_log.warning('%s SKIP — %s', pfx, msg)
                    errors.append({'index': idx, 'error': msg})
                    continue

                # Categoria
                categoria = _resolve_categoria(item)
                if not categoria:
                    msg = 'No se pudo resolver la Categoria (proporciona categoria_id o categoria_name).'
                    ingestion_log.warning('%s SKIP — %s', pfx, msg)
                    errors.append({'index': idx, 'error': msg})
                    continue

                # Required fields
                nombre_linea = (item.get('linea_producto') or item.get('nombre_linea') or item.get('nombre') or '').strip()
                if not nombre_linea:
                    msg = "Falta el campo 'linea_producto', 'nombre_linea' o 'nombre'."
                    ingestion_log.warning('%s SKIP — %s', pfx, msg)
                    errors.append({'index': idx, 'error': msg})
                    continue

                marca = item.get('marca', '').strip()
                url_compra = item.get('url_compra_especifica', item.get('url_compra', '')).strip()

                # Parent Producto (Unified Line)
                producto, prod_created = Producto.objects.get_or_create(
                    nombre=nombre_linea,
                    marca=marca,
                    defaults={
                        'categoria': categoria,
                        'linea_producto': nombre_linea,
                        'descripcion': item.get('descripcion', ''),
                        'imagen_url': item.get('imagen_url', ''),
                    },
                )

                if producto.categoria_id != categoria.pk:
                    producto.categoria = categoria
                    producto.save(update_fields=['categoria'])

                if prod_created:
                    ingestion_log.info(
                        '%s NEW Linea Producto id=%s "%s" [%s] cat="%s"',
                        pfx, producto.id, nombre_linea, marca, categoria.nombre,
                    )

                # ProveedorOferta (B2B Supply Point)
                # Since we stripped SKUs logically, we generate a unique pseudo-sku or identifier for the supplier's supply of this product
                pseudo_sku = f"DQ-LINE-{proveedor.id}-{producto.id}"
                
                oferta, was_created = ProveedorOferta.objects.update_or_create(
                    proveedor=proveedor,
                    producto=producto,  # Ensure we only have one offer per supplier per product line
                    defaults={
                        'sku': pseudo_sku,
                        'precio': 0, # Neutral
                        'url_compra': url_compra,
                        'stock_status': item.get('stock_status', 'in_stock'),
                    },
                )

                action = 'CREATED' if was_created else 'UPDATED'
                ingestion_log.info(
                    '%s %s Supply Point id=%s proveedor="%s"',
                    pfx, action, oferta.id, proveedor.nombre,
                )

                if was_created:
                    created_count += 1
                else:
                    updated_count += 1

                results.append({
                    'index': idx,
                    'producto_id': producto.id,
                    'oferta_id': oferta.id,
                    'action': action.lower(),
                    'proveedor': proveedor.nombre,
                    'categoria': categoria.nombre,
                })

            except Exception as exc:
                ingestion_log.exception('%s UNEXPECTED ERROR: %s', pfx, exc)
                errors.append({'index': idx, 'error': str(exc)})

        # ── 4. Summary ───────────────────────────────────────────────────────
        ingestion_log.info(
            'Ingestion batch END: created=%d updated=%d errors=%d total=%d IP=%s',
            created_count, updated_count, len(errors), len(items), source_ip,
        )

        return Response(
            {
                'created': created_count,
                'updated': updated_count,
                'errors': errors,
                'results': results,
                'total_processed': len(items),
            },
            status=status.HTTP_200_OK if not errors else status.HTTP_207_MULTI_STATUS,
        )


# ─── Smart Search ─────────────────────────────────────────────────────────────

class SmartSearchView(APIView):
    """
    GET /api/compras/directory/search/?q=<query>
    Returns categorias, proveedores, productos (Marketplace), ofertas_destacadas (legacy).
    """

    def get(self, request):
        from django.db.models import Case, When, Value, IntegerField

        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({
                "categorias": [],
                "proveedores": [],
                "ofertas_destacadas": [],
                "productos": [],
            })

        tokens = query.split()
        
        # Basic Singularize helper (Guantes -> Guante, Especiales -> Especial)
        def singular(t):
            t_low = t.lower()
            if len(t_low) > 4 and t_low.endswith('es'):
                return t_low[:-2]
            elif len(t_low) > 3 and t_low.endswith('s'):
                return t_low[:-1]
            return t_low

        base_tokens = [singular(t) for t in tokens]

        # Categorias: match any token
        cat_q = Q()
        for token, base in zip(tokens, base_tokens):
            cat_q |= Q(nombre__icontains=token) | Q(nombre__icontains=base)
        categorias = Categoria.objects.filter(cat_q)

        # Proveedores: match any token
        prov_q = Q()
        for token, base in zip(tokens, base_tokens):
            prov_q |= Q(nombre__icontains=token) | Q(descripcion_larga__icontains=token) | \
                      Q(nombre__icontains=base) | Q(descripcion_larga__icontains=base)
        proveedores = Proveedor.objects.filter(prov_q, activo=True)

        # Ofertas Destacadas (Legacy): match any token
        of_q = Q()
        for token, base in zip(tokens, base_tokens):
            of_q |= Q(nombre__icontains=token) | Q(descripcion__icontains=token) | \
                    Q(nombre__icontains=base) | Q(descripcion__icontains=base)
        ofertas = ProductoEstrella.objects.filter(of_q)

        # Marketplace Productos (Padres): must match ALL base tokens across fields
        productos_qs = Producto.objects.filter(activo=True)
        all_tokens_in_name = Q()
        brand_match = Q()

        for original, base in zip(tokens, base_tokens):
            productos_qs = productos_qs.filter(
                Q(nombre__icontains=original) | Q(nombre__icontains=base) |
                Q(linea_producto__icontains=original) | Q(linea_producto__icontains=base) |
                Q(marca__icontains=original) | Q(marca__icontains=base) |
                Q(descripcion__icontains=original) | Q(descripcion__icontains=base)
            )
            all_tokens_in_name &= (
                Q(nombre__icontains=original) | Q(nombre__icontains=base) |
                Q(linea_producto__icontains=original) | Q(linea_producto__icontains=base)
            )
            brand_match |= (Q(marca__icontains=original) | Q(marca__icontains=base))
            
        exact_match = Q(nombre__icontains=query) | Q(nombre__icontains=singular(query)) | \
                      Q(linea_producto__icontains=query) | Q(linea_producto__icontains=singular(query))

        # Apply basic SQLite-compatible ordering rank -> Prioritizing Brand Matches
        productos_qs = (
            productos_qs
            .annotate(
                rank_score=Case(
                    When(brand_match, then=Value(30)), # Max priority for brand
                    When(exact_match, then=Value(20)),
                    When(all_tokens_in_name, then=Value(10)),
                    default=Value(0),
                    output_field=IntegerField()
                )
            )
            .prefetch_related('ofertas__proveedor')
            .annotate(
                supplier_count=Count('ofertas__proveedor', distinct=True),
            )
            .order_by('-rank_score', 'nombre')
        )

        return Response({
            "categorias": CategoriaSerializer(categorias, many=True).data,
            "proveedores": ProveedorSerializer(proveedores, many=True).data,
            "ofertas_destacadas": ProductoEstrellaSerializer(ofertas, many=True).data,
            "productos": ProductoMarketplaceSerializer(
                productos_qs, many=True, context={'request': request}
            ).data,
        })
