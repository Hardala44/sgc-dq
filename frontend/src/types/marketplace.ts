export interface SupplierOffer {
    id: number;
    proveedor: {
        id: number;
        nombre: string;
        logo: string | null;
        contacto_nombre: string;
        contacto_email: string;
        contacto_telefono: string;
    };
    url_compra: string;
    stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unknown';
    ultima_actualizacion: string;
}

export interface ProductSearchResult {
    id: number;
    nombre: string;
    marca: string;
    categoria: number;
    categoria_nombre: string;
    descripcion: string;
    imagen_url: string;
    activo: boolean;
    fecha_creacion: string;
    supplier_count: number;
    suministros: SupplierOffer[];
}
