import { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, SlidersHorizontal, Building2 } from 'lucide-react';
import ProviderCard from '../components/ProviderCard';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Categoria {
    id: number;
    nombre: string;
    parent: number | null;
}

interface Proveedor {
    id: number;
    nombre: string;
    descripcion_larga: string;
    categorias: string[];
    categoria_principal: string | null;
    ahorro_estimado: string | null;
    num_lineas_producto: number;
    logo: string | null;
    logo_url: string;
    url_catalogo: string;
    codigo_descuento: string;
    tipo_interaccion: 'link' | 'lead_form';
    contacto_nombre?: string;
    contacto_telefono?: string;
    contacto_email?: string;
    url_web?: string;
    condiciones_especiales?: string;
}

// ── Page Component ────────────────────────────────────────────────────────────

const Proveedores = () => {
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm]         = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [provRes, catRes] = await Promise.all([
                    api.get('/proveedores/', { params: { search: searchTerm } }),
                    api.get('/categorias/'),
                ]);

                let data: Proveedor[] = provRes.data;

                // Handle DRF pagination wrapper
                if (data && typeof data === 'object' && 'results' in data) {
                    data = (data as { results: Proveedor[] }).results;
                }
                if (!Array.isArray(data)) data = [];

                // Client-side category filter
                if (selectedCategory) {
                    data = data.filter((p) => p.categorias.includes(selectedCategory));
                }

                setProveedores(data);

                // Only keep root-level categories for the filter dropdown
                const cats: Categoria[] = Array.isArray(catRes.data) ? catRes.data : catRes.data.results ?? [];
                setCategorias(cats.filter((c) => c.parent === null));
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [searchTerm, selectedCategory]);

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div className="bg-slate-50 min-h-screen">
            <div className="max-w-screen-xl mx-auto px-6 py-10">

                {/* ── Page Header ───────────────────────────────────────── */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-klein-600 shadow-md">
                            <Building2 size={18} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            Red de Proveedores DQ
                        </h1>
                    </div>
                    <p className="text-slate-500 text-sm ml-12">
                        {proveedores.length} proveedores verificados con acuerdos de compra negociados
                    </p>
                </div>

                {/* ── Filters ────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            size={18}
                        />
                        <input
                            type="text"
                            placeholder="Buscar proveedor..."
                            className="
                                w-full h-11 pl-11 pr-4 text-sm
                                bg-white border border-slate-200 rounded-xl
                                focus:outline-none focus:ring-2 focus:ring-klein-500/20 focus:border-klein-500
                                transition-all placeholder-slate-400
                            "
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Category filter */}
                    <div className="relative w-full sm:w-56">
                        <SlidersHorizontal
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                            size={16}
                        />
                        <select
                            className="
                                w-full h-11 pl-11 pr-4 text-sm appearance-none
                                bg-white border border-slate-200 rounded-xl
                                focus:outline-none focus:ring-2 focus:ring-klein-500/20 focus:border-klein-500
                                transition-all text-slate-700
                            "
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                        >
                            <option value="">Todas las categorías</option>
                            {categorias.map((cat) => (
                                <option key={cat.id} value={cat.nombre}>
                                    {cat.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ── Grid ──────────────────────────────────────────────── */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-72 rounded-2xl bg-white border border-slate-200 animate-pulse"
                            />
                        ))}
                    </div>
                ) : proveedores.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <Building2 size={48} className="mb-4 opacity-30" />
                        <p className="text-lg font-semibold">No se encontraron proveedores</p>
                        <p className="text-sm">Prueba con otros filtros o términos de búsqueda</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {proveedores.map((proveedor) => (
                            <div key={proveedor.id} className="h-full">
                                <ProviderCard
                                    proveedor={{
                                        id:                    proveedor.id,
                                        nombre:                proveedor.nombre,
                                        descripcion_larga:     proveedor.descripcion_larga,
                                        url_catalogo:          proveedor.url_catalogo,
                                        codigo_descuento:      proveedor.codigo_descuento,
                                        tipo_interaccion:      proveedor.tipo_interaccion,
                                        categorias:            proveedor.categorias,
                                        categoria_principal:   proveedor.categoria_principal,
                                        ahorro_estimado:       proveedor.ahorro_estimado,
                                        num_lineas_producto:   proveedor.num_lineas_producto,
                                        logo_url:              proveedor.logo_url,
                                        contacto_nombre:       proveedor.contacto_nombre,
                                        contacto_telefono:     proveedor.contacto_telefono,
                                        contacto_email:        proveedor.contacto_email,
                                        url_web:               proveedor.url_web,
                                        condiciones_especiales: proveedor.condiciones_especiales,
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Proveedores;
