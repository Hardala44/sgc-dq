# State of the Union - SGC DentalQuality

## 1. Frontend Structure (`frontend/src`)

A clean tree structure of the React frontend, highlighting the main pages, components, and layout blocks.

```text
frontend/src/
├── App.css
├── App.tsx
├── index.css
├── main.tsx
├── assets/
│   ├── logo-dq.png
│   └── react.svg
├── components/
│   ├── GlobalSearch.tsx
│   ├── Header.tsx
│   ├── Layout.tsx
│   ├── LeadRequestModal.tsx
│   ├── Navbar.tsx
│   ├── ProductCard.tsx
│   ├── ProtectedRoute.tsx
│   ├── ProviderCard.tsx
│   ├── SearchBar.tsx
│   └── Sidebar.tsx
├── context/
│   └── AuthContext.tsx
├── hooks/
│   └── useAuth.ts
├── pages/
│   ├── Catalogo.tsx
│   ├── CuadroMando.tsx
│   ├── DashboardAnalytics.tsx
│   ├── Home.tsx
│   ├── Login.tsx
│   ├── MisPuntos.tsx
│   ├── ProductoDetalle.tsx
│   ├── ProveedorDetalle.tsx
│   └── Proveedores.tsx
└── services/
    └── api.ts
```

## 2. Active Django Models

Below are the active models from our main apps, listing their class names and underlying data fields.

### App: `compras/models.py`
- **Categoria**: `nombre`, `descripcion`, `parent`, `bloque`, `orden`
- **Proveedor**: `nombre`, `descripcion_larga`, `logo`, `categorias`, `es_estrategico`, `condiciones_especiales`, `contacto_nombre`, `contacto_email`, `contacto_telefono`, `url_web`, `url_catalogo`, `codigo_descuento`, `tipo_interaccion`, `pdf_tarifas`, `modo_pedido`, `activo`
- **Producto**: `proveedor`, `categoria`, `nombre`, `descripcion`, `codigo_producto`, `imagen`, `precio_mercado`, `precio_dq`, `stock_disponible`, `activo`, `fecha_creacion`
- **Oferta**: `producto`, `titulo`, `descripcion`, `descuento_porcentaje`, `precio_oferta`, `fecha_inicio`, `fecha_fin`, `destacada`, `enviar_notificacion`, `activa`
- **CompraAgrupada**: `producto`, `titulo`, `descripcion`, `precio_objetivo`, `cantidad_minima`, `cantidad_actual`, `fecha_inicio`, `fecha_fin`, `activa`
- **Pedido**: `id`, `clinica`, `proveedor`, `numero_pedido`, `fecha`, `estado`, `tipo_gestion`, `url_seguimiento`, `subtotal`, `descuentos`, `total`, `notas`
- **LineaPedido**: `pedido`, `producto`, `cantidad`, `precio_unitario`, `subtotal_linea`
- **ProductoEstrella**: `proveedor`, `nombre`, `descripcion`, `precio_mercado`, `precio_dq`, `imagen`
- **LeadSolicitud**: `clinica`, `proveedor`, `usuario_solicitante`, `mensaje_interes`, `estado`, `fecha_creacion`

### App: `core/models.py`
- **Clinica**: `id`, `nombre`, `nombre_norm`, `activa`, `num_boxes`, `fecha_alta`
- **ClinicLegalEntity**: `id`, `clinic`, `cif`, `reg_sanitario`, `nombre_fiscal`, `direccion`, `poblacion`, `provincia`, `telefono`, `email_preferred`, `created_at`, `updated_at`
- **ClinicAlias**: `id`, `alias_raw`, `alias_norm`, `clinic`, `method`, `confidence`, `ignore`, `created_at`, `updated_at`
- **ImportBatch**: `id`, `original_filename`, `checksum`, `imported_at`, `stats`
- **ExpenseCategory**: `nombre`, `nombre_norm`
- **Gasto** (Expense): `id`, `clinic`, `year`, `quarter`, `category`, `amount`, `source_sheet`, `source_row`, `last_import_batch`, `created_at`, `updated_at`
- **Usuario** (AbstractUser): `clinica`, `legal_entity`, `rol`, `telefono`, `must_change_password` (and all built-in Django User fields: `username`, `password`, `email`, `first_name`, `last_name`, etc.)

## 3. Active API Endpoints

The project uses `Django REST Framework` with nested routers pointing from `sgc_dq/urls.py` into their respective module URLs.

- `POST /api/token/` (JWT Authentication: TokenObtainPairView)
- `GET/POST /api/directory/search/` (Smart Search via Django REST)
- `GET/POST /api/analytics/dashboard/` (Dashboard Analytics)
- `GET/POST /api/analytics/clinics/` (Clinic List for Analytics)
- `CRUD /api/productos/` (ViewSet operations for Producto)
- `CRUD /api/proveedores/` (ViewSet operations for Proveedor)
- `CRUD /api/categorias/` (ViewSet operations for Categoria)
- `CRUD /api/ofertas/` (ViewSet operations for Oferta)
- `CRUD /api/leads/` (ViewSet operations for LeadSolicitud)

## 4. Authentication Strategy

**Method:** `JWT` (JSON Web Tokens)  
**Implementation:** Currently configured using `rest_framework_simplejwt`.  
- Handled at `TokenObtainPairView` under path `api/token/`.  
- Requires exchanging user credentials (username, password) defined in the custom `core.Usuario` model to obtain long-running tokens (which are then sent by the frontend in Authorization headers for protected API requests).  
- Context and Hooks (`useAuth.ts`, `AuthContext.tsx`) are configured in the frontend (`frontend/src/context` and `frontend/src/hooks`) indicating a token-based flow is actively mirrored in React state.
