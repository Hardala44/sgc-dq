export interface SupplierOffer {
    id: number;
    proveedor: {
        id: number;
        nombre: string;
        logo: string | null;
        contacto_nombre: string;
        contacto_email: string;
        contacto_telefono: string;
        url_web: string;
        condiciones_especiales?: string;
    };
    url_compra: string;
    url_web?: string;
    stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';
    ultima_actualizacion: string;
    has_price?: boolean;
    // New flat fields from category-fallback serializer
    nombre?: string;
    logo?: string | null;
    contacto_nombre?: string;
    contacto_email?: string;
    contacto_telefono?: string;
    condiciones_especiales?: string;
}

export interface ProductSearchResult {
    id: number;
    nombre: string;
    marca: string;
    linea_producto: string;
    categoria: number;
    categoria_nombre: string;
    descripcion: string;
    imagen_url: string;
    activo: boolean;
    fecha_creacion: string;
    supplier_count: number;
    ofertas: SupplierOffer[];
    suministros: SupplierOffer[];
}

// ─── AI Smart Search V2 types ─────────────────────────────────────────────────

export interface AIMeta {
    ai_enriched: boolean;
    related_terms: string[];
    scraper_terms: string[];
    categoria_sugerida: string;
    proveedores_sugeridos: string[];
    contexto: string;
}

export interface SmartSearchResponse {
    productos: ProductSearchResult[];
    is_searching_live: boolean;
    session_id: string | null;
    ai_meta: AIMeta;
}

/** A product returned by the live scraper (not yet in DB) */
export interface LiveProduct {
    linea_producto: string;
    marca: string;
    url_compra: string;
    proveedor_nombre: string;
    categoria_name: string;
    precio_web: number | null;
    /** DQ group price after applying ahorro_estimado */
    precio_dq: number | null;
    ahorro_euros: number | null;
    /** Percentage savings e.g. 12.0 */
    ahorro_pct: number;
    is_live: true;
}

export interface LiveSearchStatus {
    session_id: string;
    status: 'pending' | 'running' | 'done' | 'error' | 'timeout' | 'not_found';
    results: LiveProduct[];
    providers_searched: string[];
    error: string | null;
    duration_s: number | null;
}

