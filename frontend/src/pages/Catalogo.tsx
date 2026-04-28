import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import ProviderCard from '../components/ProviderCard';
import GlobalSearch from '../components/GlobalSearch';
import MarketplaceProductCard from '../components/MarketplaceProductCard';
import ProductoComparacionPanel from '../components/ProductoComparacionPanel';
import type { ProductoMarketplace } from '../components/MarketplaceProductCard';
import { normalize } from '../utils/marketplace';
import { Loader2, Package, LayoutGrid, Building2, ChevronRight, ChevronDown, Box, Stethoscope, Zap, FlaskConical, CreditCard, AlignCenter, Layers } from 'lucide-react';

interface Categoria {
    id: number;
    nombre: string;
    descripcion: string;
    parent: number | null;
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
    contacto_telefono?: string;
    contacto_email?: string;
    url_web?: string;
    condiciones_especiales?: string;
}

type ViewMode = 'catalog' | 'search';
type ResultTab = 'productos' | 'proveedores';

const Catalogo = () => {
    const [searchParams] = useSearchParams();

    // ── Data ──────────────────────────────────────────────────────────────────
    const [categories, setCategories] = useState<Categoria[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<Categoria | null>(null);
    const [expandedParents, setExpandedParents] = useState<number[]>([]);
    const [categoryProviders, setCategoryProviders] = useState<Proveedor[]>([]);
    const [categoryProductos, setCategoryProductos] = useState<ProductoMarketplace[]>([]);

    // ── Search state ──────────────────────────────────────────────────────────
    const [searchQuery, setSearchQuery] = useState('');
    const [searchProductos, setSearchProductos] = useState<ProductoMarketplace[]>([]);
    const [searchProveedores, setSearchProveedores] = useState<Proveedor[]>([]);
    const [activeResultTab, setActiveResultTab] = useState<ResultTab>('productos');

    // ── UI State ──────────────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<ViewMode>('catalog');
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [loadingContent, setLoadingContent] = useState(false);
    const [error, setError] = useState('');
    const [selectedProducto, setSelectedProducto] = useState<ProductoMarketplace | null>(null);

    // ── Category tab (providers vs products) ─────────────────────────────────
    const [categoryTab, setCategoryTab] = useState<ResultTab>('proveedores');

    // ─────────────────────────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            const data = await fetchCategories();
            const catParam = searchParams.get('categoria');
            if (catParam && data) {
                const targetCat = data.find((c: Categoria) => c.id.toString() === catParam);
                if (targetCat) handleCategoryClick(targetCat, data);
            } else if (data && data.length > 0) {
                // Select first root category by default
                const rootCats = data.filter((c: Categoria) => c.parent === null).sort((a: Categoria, b: Categoria) => a.id - b.id);
                if (rootCats.length > 0) {
                    handleCategoryClick(rootCats[0], data);
                }
            }
        };
        init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchCategories = async () => {
        try {
            setLoadingCategories(true);
            const response = await api.get('/categorias/');
            const data = response.data.results ?? response.data;
            setCategories(data);
            return data;
        } catch (err) {
            setError('Failed to load categories');
            console.error(err);
            return null;
        } finally {
            setLoadingCategories(false);
        }
    };

    const fetchCategoryProviders = useCallback(async (categoryId: number) => {
        const response = await api.get(`/proveedores/?categorias=${categoryId}`);
        return response.data.results ?? response.data;
    }, []);

    const fetchCategoryProductos = useCallback(async (categoryId: number) => {
        const response = await api.get(`/catalogo/?categoria=${categoryId}`);
        return response.data.results ?? response.data;
    }, []);

    // ── Category navigation ───────────────────────────────────────────────────
    const handleCategoryClick = async (category: Categoria, allCats?: Categoria[]) => {
        const cats = allCats ?? categories;
        const children = cats.filter(c => c.parent === category.id);

        if (children.length > 0) {
            // Toggle accordion if it has children
            setExpandedParents(prev => 
                prev.includes(category.id) 
                ? prev.filter(id => id !== category.id) 
                : [...prev, category.id]
            );
            return;
        }

        // Leaf category → View its content
        setLoadingContent(true);
        setError('');
        setSelectedCategory(category);
        setViewMode('catalog');
        setCategoryTab('proveedores'); // default tab
        
        // Ensure its parent is expanded if it has one
        if (category.parent) {
             setExpandedParents(prev => 
                prev.includes(category.parent!) ? prev : [...prev, category.parent!]
            );
        }

        try {
            const [providers, productos] = await Promise.all([
                fetchCategoryProviders(category.id),
                fetchCategoryProductos(category.id),
            ]);
            setCategoryProviders(providers);
            setCategoryProductos(productos);
            // Auto-switch tab to products if there are no providers but products exist
            if (providers.length === 0 && productos.length > 0) {
                setCategoryTab('productos');
            }
        } catch (err) {
            setError('Error al cargar contenido de la categoría.');
            console.error(err);
        } finally {
            setLoadingContent(false);
        }
    };

    // ── Search result handler ─────────────────────────────────────────────────
    const handleSearchResult = (type: 'categoria' | 'proveedor' | 'oferta' | 'producto', item: any) => {
        if (type === 'categoria') {
            handleCategoryClick(item as Categoria);
        } else if (type === 'producto') {
            // Show product in comparison panel directly
            setSelectedProducto(item as ProductoMarketplace);
        } else if (type === 'proveedor') {
            // Show a search result view with just this provider
            setSearchQuery(item.nombre);
            setSearchProveedores([item as Proveedor]);
            setSearchProductos([]);
            setActiveResultTab('proveedores');
            setViewMode('search');
        } else if (type === 'oferta') {
            setSearchQuery(item.proveedor_nombre || 'Oferta');
            setSearchProveedores([]);
            setSearchProductos([]);
            setActiveResultTab('proveedores');
            setViewMode('search');
        }
    };

    // ── Derived ───────────────────────────────────────────────────────────────
    const mainCategories = categories.filter(c => c.parent === null).sort((a,b)=>a.id-b.id);

    // Accent-insensitive client filter applied on top of API search results
    const normalizedQuery = normalize(searchQuery);
    const filteredSearchProductos = normalizedQuery.length > 1
        ? searchProductos.filter(p => normalize(p.nombre).includes(normalizedQuery) || normalize(p.categoria_nombre ?? '').includes(normalizedQuery))
        : searchProductos;
    const filteredSearchProveedores = normalizedQuery.length > 1
        ? searchProveedores.filter(p => normalize(p.nombre).includes(normalizedQuery))
        : searchProveedores;

    // ── Category icon mapping ─────────────────────────────────────────────────
    const getCategoryIcon = (name: string, isSelected: boolean) => {
        const cls = `shrink-0 ${isSelected ? 'text-klein-600' : 'text-slate-400'}`;
        const n = normalize(name);
        if (n.includes('deposito') || n.includes('aparatolog')) return <Box size={18} className={cls} />;
        if (n.includes('servicio'))                              return <Stethoscope size={18} className={cls} />;
        if (n.includes('implantolog'))                           return <Zap size={18} className={cls} />;
        if (n.includes('laboratorio'))                           return <FlaskConical size={18} className={cls} />;
        if (n.includes('financier'))                             return <CreditCard size={18} className={cls} />;
        if (n.includes('ortodoncia'))                            return <AlignCenter size={18} className={cls} />;
        return <Layers size={18} className={cls} />;
    };

    // ── Sidebar Renderer ──────────────────────────────────────────────────────
    const renderSidebarCategory = (cat: Categoria) => {
        const isSelected = selectedCategory?.id === cat.id;
        const children = categories.filter(c => c.parent === cat.id).sort((a,b)=>a.id-b.id);
        const hasChildren = children.length > 0;
        const isExpanded = expandedParents.includes(cat.id);

        return (
            <div key={cat.id} className="mb-2">
                <button
                    onClick={() => handleCategoryClick(cat)}
                    className={`w-full flex flex-row items-center px-4 py-3 rounded-xl transition-all ${
                        isSelected 
                            ? 'bg-klein-50 text-klein-700 font-bold shadow-[0_2px_10px_-4px_rgba(0,43,255,0.2)]' 
                            : 'text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm'
                    }`}
                >
                    <div className="flex-shrink-0 flex items-center justify-center w-6 h-6">
                        {getCategoryIcon(cat.nombre, isSelected)}
                    </div>
                    <div className="flex items-center justify-between flex-1 overflow-hidden ml-3">
                        <span className="truncate whitespace-nowrap text-sm tracking-tight">{cat.nombre}</span>
                        {hasChildren && (
                             isExpanded ? <ChevronDown size={14} className="text-slate-400 flex-shrink-0 ml-2" /> : <ChevronRight size={14} className="text-slate-400 flex-shrink-0 ml-2" />
                        )}
                    </div>
                </button>
                
                {hasChildren && isExpanded && (
                    <div className="mt-2 ml-[34px] pl-3 border-l text-slate-500 flex flex-col gap-[2px] overflow-hidden">
                        {children.map(child => {
                            const isChildSelected = selectedCategory?.id === child.id;
                            return (
                                <button
                                    key={child.id}
                                    onClick={() => handleCategoryClick(child)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                                        isChildSelected
                                            ? 'bg-klein-500 text-white shadow-sm'
                                            : 'text-slate-500 hover:bg-white hover:text-slate-900'
                                    }`}
                                >
                                    {child.nombre}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="bg-[#F7F7F7] min-h-screen pb-16 relative font-sans">
            {/* ── Hero Banner ── */}
            <div className="pt-10 pb-12 px-6 md:px-12 mb-8 bg-[#F7F7F7]">
                <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center justify-center text-center space-y-6">
                    <div className="space-y-2 mt-4">
                        <h1 className="text-3xl md:text-5xl text-black font-bold tracking-tight">
                            Directorio <span className="font-light text-slate-500 italic">Odontológico</span>
                        </h1>
                        <p className="text-slate-500 text-sm max-w-xl mx-auto font-medium tracking-tight">
                            Encuentra a los mejores proveedores homologados, descubre ofertas exclusivas y optimiza tus compras clínicas.
                        </p>
                    </div>

                    <div className="relative w-full max-w-2xl mx-auto mt-6 px-2">
                        <GlobalSearch onSelectResult={handleSearchResult} />
                    </div>
                </div>
            </div>

            {/* ── Main Layout (Sidebar + Content) ── */}
            <div className="max-w-[1400px] mx-auto px-6">
                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-8 font-medium text-center">
                        {error}
                    </div>
                )}

                {loadingCategories ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-klein-500" />
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        
                        {/* ── Sidebar Navigation ── */}
                        <div className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-[#F7F7F7] border-0 border-r border-slate-200 sticky top-24 self-start overflow-hidden">
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-4 mb-4 whitespace-nowrap">
                                Especialidades
                            </h3>
                            <nav className="flex flex-col pr-4">
                                {mainCategories.map(cat => renderSidebarCategory(cat))}
                            </nav>
                        </div>

                        {/* Mobile Sidebar (simplified for small screens) */}
                        <div className="lg:hidden w-full bg-white rounded-2xl p-4 shadow-[0_2px_24px_-12px_rgba(0,0,0,0.05)] border border-slate-100 flex-shrink-0">
                             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">Especialidades</h3>
                             <nav className="flex flex-col">
                                {mainCategories.map(cat => (
                                      <div key={cat.id} className="mb-2">
                                          <button
                                              onClick={() => handleCategoryClick(cat)}
                                              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                                          >
                                              <span className="font-semibold">{cat.nombre}</span>
                                          </button>
                                          {expandedParents.includes(cat.id) && categories.filter(c => c.parent === cat.id).map(child => (
                                              <button key={child.id} onClick={() => handleCategoryClick(child)} className="w-full text-left pl-6 pr-3 py-2 text-sm text-slate-500 hover:text-black">
                                                  {child.nombre}
                                              </button>
                                          ))}
                                      </div>
                                ))}
                             </nav>
                        </div>

                        {/* ── Page Content ── */}
                        <div className="flex-1 w-full min-w-0">
                            {viewMode === 'catalog' && selectedCategory ? (
                                /* ───────────── VIEW: Catalog Details ───────────── */
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white rounded-[2rem] p-6 sm:p-10 shadow-[0_4px_32px_-12px_rgba(0,0,0,0.05)] border border-slate-100 min-h-[600px]">
                                    <div className="mb-10">
                                        <h2 className="text-3xl font-bold text-black tracking-tight">
                                            {selectedCategory.nombre}
                                        </h2>
                                        {selectedCategory.parent && (
                                            <p className="text-klein-600 text-[10px] tracking-widest font-bold uppercase mt-2">Subcategoría de Servicios</p>
                                        )}
                                    </div>

                                    {/* ── Tabs ── */}
                                    <div className="flex items-center gap-4 mb-10 border-b border-slate-100 pb-px">
                                        <TabButton
                                            id="tab-proveedores"
                                            active={categoryTab === 'proveedores'}
                                            onClick={() => setCategoryTab('proveedores')}
                                            icon={<Building2 size={16} />}
                                            label="Proveedores Verificados"
                                            count={categoryProviders.length}
                                        />
                                        <TabButton
                                            id="tab-productos"
                                            active={categoryTab === 'productos'}
                                            onClick={() => setCategoryTab('productos')}
                                            icon={<Package size={16} />}
                                            label="Catálogo"
                                            count={categoryProductos.length}
                                        />
                                    </div>

                                    {loadingContent ? (
                                        <div className="flex justify-center items-center py-32">
                                            <Loader2 className="w-8 h-8 animate-spin text-klein-300" />
                                        </div>
                                    ) : categoryTab === 'proveedores' ? (
                                        /* Providers grid */
                                        categoryProviders.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                                {categoryProviders.map(proveedor => (
                                                    <ProviderCard key={proveedor.id} proveedor={proveedor} />
                                                ))}
                                            </div>
                                        ) : (
                                            <EmptyState icon={<Building2 className="w-10 h-10 text-slate-300" />} title="Sin proveedores" description="Aún no hay proveedores asignados a esta categoría." />
                                        )
                                    ) : (
                                        /* Marketplace products grid */
                                        categoryProductos.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                {categoryProductos.map(producto => (
                                                    <MarketplaceProductCard
                                                        key={producto.id}
                                                        producto={producto}
                                                        onClick={setSelectedProducto}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <EmptyState icon={<Package className="w-10 h-10 text-slate-300" />} title="Sin productos" description="Aún no hay productos disponibles para esta categoría." />
                                        )
                                    )}
                                </div>

                            ) : viewMode === 'search' ? (
                                /* ───────────── VIEW: Search Results ───────────── */
                                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white rounded-[2rem] p-6 sm:p-10 shadow-[0_4px_32px_-12px_rgba(0,0,0,0.05)] border border-slate-100 min-h-[600px]">
                                    <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-100">
                                        <div>
                                            <h2 className="text-3xl font-bold text-black tracking-tight">
                                                Resultados de búsqueda
                                            </h2>
                                            <p className="text-slate-500 mt-2 font-medium">Mostrando resultados para <strong className="text-black">"{searchQuery}"</strong></p>
                                        </div>
                                        <button 
                                             onClick={() => {
                                                 setSearchQuery('');
                                                 setViewMode('catalog');
                                                 if (!selectedCategory && categories.length > 0) {
                                                     const rootCats = categories.filter((c: Categoria) => c.parent === null).sort((a,b)=>a.id-b.id);
                                                     if (rootCats.length > 0) handleCategoryClick(rootCats[0], categories);
                                                 }
                                             }}
                                             className="text-slate-600 text-sm font-semibold hover:bg-slate-50 px-5 py-2.5 rounded-xl transition-all border border-slate-200 hover:border-slate-300"
                                        >
                                            Limpiar Búsqueda
                                        </button>
                                    </div>

                                    {/* Tabs */}
                                    <div className="flex items-center gap-4 mb-10 border-b border-slate-100">
                                        <TabButton
                                            id="search-tab-productos"
                                            active={activeResultTab === 'productos'}
                                            onClick={() => setActiveResultTab('productos')}
                                            icon={<Package size={16} />}
                                            label="Productos"
                                            count={searchProductos.length}
                                        />
                                        <TabButton
                                            id="search-tab-proveedores"
                                            active={activeResultTab === 'proveedores'}
                                            onClick={() => setActiveResultTab('proveedores')}
                                            icon={<Building2 size={16} />}
                                            label="Proveedores"
                                            count={searchProveedores.length}
                                        />
                                    </div>

                                    {activeResultTab === 'productos' ? (
                                        filteredSearchProductos.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                {filteredSearchProductos.map(producto => (
                                                    <MarketplaceProductCard
                                                        key={producto.id}
                                                        producto={producto}
                                                        onClick={setSelectedProducto}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <EmptyState icon={<LayoutGrid className="w-10 h-10 text-slate-300" />} title="Sin productos" description="No se encontraron productos para esta búsqueda." />
                                        )
                                    ) : (
                                        filteredSearchProveedores.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                                {filteredSearchProveedores.map(proveedor => (
                                                    <ProviderCard key={proveedor.id} proveedor={proveedor} />
                                                ))}
                                            </div>
                                        ) : (
                                            <EmptyState icon={<Building2 className="w-10 h-10 text-slate-300" />} title="Sin proveedores" description="No se encontraron proveedores para esta búsqueda." />
                                        )
                                    )}
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Comparison Panel (global, portal-like) ── */}
            <ProductoComparacionPanel
                producto={selectedProducto}
                onClose={() => setSelectedProducto(null)}
            />
        </div>
    );
};

// ─── Small shared sub-components ──────────────────────────────────────────────

const TabButton: React.FC<{
    id: string;
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    count: number;
}> = ({ id, active, onClick, icon, label, count }) => (
    <button
        id={id}
        onClick={onClick}
        className={`flex items-center gap-2.5 px-4 py-3 text-[13px] font-bold border-b-2 transition-all -mb-px ${
            active
                ? 'border-klein-600 text-klein-600'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
        }`}
    >
        {icon}
        <span className="uppercase tracking-widest">{label}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums ml-1 transition-colors ${
            active ? 'bg-klein-50 text-klein-600' : 'bg-slate-100 text-slate-500'
        }`}>
            {count}
        </span>
    </button>
);

const EmptyState: React.FC<{ icon: React.ReactNode; title: string; description: string }> = ({ icon, title, description }) => (
    <div className="text-center py-24 w-full flex flex-col items-center justify-center">
        <div className="w-20 h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center mb-6 border border-slate-100">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2 tracking-tight">{title}</h3>
        <p className="text-slate-500 text-sm max-w-xs font-medium">{description}</p>
    </div>
);

export default Catalogo;
