
import { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, SlidersHorizontal } from 'lucide-react';
import ProviderCard from '../components/ProviderCard';

interface Categoria {
    id: number;
    nombre: string;
}

interface Proveedor {
    id: number;
    nombre: string;
    descripcion_larga: string;
    categorias: string[];
    logo: string | null;
    url_catalogo: string;
    codigo_descuento: string;
    tipo_interaccion: 'link' | 'lead_form';
    contacto_nombre?: string;
    contacto_telefono?: string;
    contacto_email?: string;
    url_web?: string;
    condiciones_especiales?: string;
}

const Proveedores = () => {
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('');

    useEffect(() => {
        fetchData();
    }, [searchTerm, selectedCategory]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Build query params
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            // Note: filtering by category name might depend on backend filter config. 
            // Standard DjangoFilterBackend with 'categorias' usually expects ID.
            // But if I want to use standard filter, I need category IDs.
            // For now, let's fetch all and filter client side OR fetch categories first.

            // Let's assume we fetch all for now or basic search. 
            // Ideally backend filter should support category ID. 
            // But let's check if the user wants server side or client side. 
            // Given "search web" isn't feasible for backend debug easily, I'll try basic API call.

            const [provRes, catRes] = await Promise.all([
                api.get('/proveedores/', { params: { search: searchTerm } }),
                api.get('/categorias/')
            ]);

            console.log('API Response (Proveedores):', provRes.data); // Debug log

            let data = provRes.data;

            // Handle pagination if present (though we disabled it in backend, good for safety)
            if (data.results && Array.isArray(data.results)) {
                data = data.results;
            } else if (data.results) {
                // specific case where results might not be array? Unlikely with DRF standard pagination
                console.warn('API returned .results but it is not an array:', data.results);
                data = [];
            } else if (!Array.isArray(data)) {
                console.warn('API response is not an array and has no .results:', data);
                data = [];
            }

            // Client-side category filtering 
            if (selectedCategory) {
                data = data.filter((p: Proveedor) => p.categorias.includes(selectedCategory));
            }

            setProveedores(data);
            setCategorias(catRes.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen py-12">
            <div className="container mx-auto px-6">

                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-4xl font-bold text-black mb-8">Nuestros Proveedores</h1>

                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={24} />
                            <input
                                type="text"
                                placeholder="Buscar proveedor..."
                                className="w-full h-14 pl-12 rounded-3xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Category Filter */}
                        <div className="relative w-full md:w-64">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                <SlidersHorizontal className="text-gray-400" size={24} />
                            </div>
                            <select
                                className="w-full h-14 pl-12 pr-4 rounded-3xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none appearance-none bg-white transition-all"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <option value="">Todas las categorías</option>
                                {categorias.map(cat => (
                                    <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {proveedores.map((proveedor) => (
                            <div key={proveedor.id} className="h-full">
                                <ProviderCard proveedor={{
                                    id: proveedor.id.toString(),
                                    nombre: proveedor.nombre,
                                    descripcion_larga: proveedor.descripcion_larga,
                                    logo: proveedor.logo || undefined,
                                    url_catalogo: proveedor.url_catalogo,
                                    codigo_descuento: proveedor.codigo_descuento,
                                    tipo_interaccion: proveedor.tipo_interaccion,
                                    categorias: proveedor.categorias,
                                    contacto_nombre: proveedor.contacto_nombre,
                                    contacto_telefono: proveedor.contacto_telefono,
                                    contacto_email: proveedor.contacto_email,
                                    url_web: proveedor.url_web,
                                    condiciones_especiales: proveedor.condiciones_especiales,
                                }} />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && proveedores.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                        No se encontraron proveedores
                    </div>
                )}
            </div>
        </div>
    );
};

export default Proveedores;
