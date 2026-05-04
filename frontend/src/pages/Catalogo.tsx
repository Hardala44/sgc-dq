import { useEffect, useState, useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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

interface CatalogNavigationState {
    openProductId?: number;
}

const Catalogo = () => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const navigate = useNavigate();
    const navigationState = (location.state as CatalogNavigationState | null) ?? null;

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

    // ── UI State ──────────────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<ViewMode>('catalog');
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [loadingContent, setLoadingContent] = useState(false);
    const [error, setError] = useState('');
    const [selectedProducto, setSelectedProducto] = useState<ProductoMarketplace | null>(null);

    // ── Global Tab (providers vs products) ───────────────────────────────────
    const [globalTab, setGlobalTab] = useState<ResultTab>('productos');

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

    useEffect(() => {
        const openProductId = navigationState?.openProductId;
        if (typeof openProductId !== 'number') {
            return;
        }

        const availableProducts = viewMode === 'search' ? searchProductos : categoryProductos;
        const matchedProduct = availableProducts.find((producto) => producto.id === openProductId);

        if (matchedProduct) {
            setSelectedProducto(matchedProduct);
            navigate(location.pathname + location.search, { replace: true, state: null });
            return;
        }

        if (!loadingContent) {
            navigate(location.pathname + location.search, { replace: true, state: null });
        }
    }, [categoryProductos, loadingContent, location.pathname, location.search, navigate, navigationState, searchProductos, viewMode]);

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
        } catch (err) {
            setError('Error al cargar contenido de la categoría.');
            console.error(err);
        } finally {
            setLoadingContent(false);
        }
    };

    // ── Search result handler ─────────────────────────────────────────────────
    const handleSearchResult = (type: 'categoria' | 'proveedor' | 'oferta' | 'producto', item: unknown) => {
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
            setGlobalTab('proveedores');
            setViewMode('search');
        } else if (type === 'oferta') {
            setSearchQuery(item.proveedor_nombre || 'Oferta');
            setSearchProveedores([]);
            setSearchProductos([]);
            setGlobalTab('proveedores');
            setViewMode('search');
        }
    };

    // ── Derived ───────────────────────────────────────────────────────────────
    const sortCategories = (a: Categoria, b: Categoria) => {
        const isADeposito = normalize(a.nombre).includes('deposito');
        const isBDeposito = normalize(b.nombre).includes('deposito');
        if (isADeposito && !isBDeposito) return -1;
        if (!isADeposito && isBDeposito) return 1;
        return a.nombre.localeCompare(b.nombre);
    };

    const mainCategories = categories.filter(c => c.parent === null).sort(sortCategories);

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
        const children = categories.filter(c => c.parent === cat.id).sort(sortCategories);
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
        <div className="bg-[#F7F7F7] min-h-screen pb-16 relative font-sans -mx-6 md:-mx-8 lg:-mx-10">
            {/* ── Compact Header ── */}
            <div className="pt-8 pb-6 px-6 md:px-8 lg:px-10 bg-white border-b border-slate-200 mb-6 sticky top-0 z-30 shadow-sm">
                <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4">
                    
                    <div className="flex-shrink-0">
                        <h1 className="text-2xl text-black font-bold tracking-tight">
                            Directorio <span className="font-light text-slate-500 italic">Odontológico</span>
                        </h1>
                    </div>

                    <div className="flex-1 flex flex-col sm:flex-row items-center gap-4 w-full md:max-w-3xl">
                        <div className="flex-1 w-full">
                            <GlobalSearch onSelectResult={handleSearchResult} />
                        </div>
                        
                        {/* ── Modern Toggle ── */}
                        <div className="flex-shrink-0 flex items-center bg-slate-100 rounded-full p-1 border border-slate-200">
                            <button
                                onClick={() => setGlobalTab('productos')}
                                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                                    globalTab === 'productos'
                                        ? 'bg-white text-black shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Package size={16} />
                                Explorar Productos
                            </button>
                            <button
                                onClick={() => setGlobalTab('proveedores')}
                                className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                                    globalTab === 'proveedores'
                                        ? 'bg-white text-black shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Building2 size={16} />
                                Proveedores DQ
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Layout (Sidebar + Content) ── */}
            <div className="w-full px-6 md:px-8 lg:px-10">
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
                                    <div className="mb-8">
                                        <h2 className="text-3xl font-bold text-black tracking-tight">
                                            {selectedCategory.nombre}
                                        </h2>
                                        {selectedCategory.parent && (
                                            <p className="text-klein-600 text-[10px] tracking-widest font-bold uppercase mt-2">Subcategoría de Servicios</p>
                                        )}
                                    </div>

                                    {loadingContent ? (
                                        <div className="flex justify-center items-center py-32">
                                            <Loader2 className="w-8 h-8 animate-spin text-klein-300" />
                                        </div>
                                    ) : globalTab === 'proveedores' ? (
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
                                                {categoryProductos.map((producto, index) => (
                                                    <MarketplaceProductCard
                                                        key={producto.id}
                                                        producto={producto}
                                                        onClick={setSelectedProducto}
                                                        productIndex={index}
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
                                    <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
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

                                    {globalTab === 'productos' ? (
                                        filteredSearchProductos.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                {filteredSearchProductos.map((producto, index) => (
                                                    <MarketplaceProductCard
                                                        key={producto.id}
                                                        producto={producto}
                                                        onClick={setSelectedProducto}
                                                        productIndex={index}
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
