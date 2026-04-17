import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import MarketplaceProductCard from '../components/MarketplaceProductCard';
import ProductoComparacionPanel from '../components/ProductoComparacionPanel';
import type { ProductSearchResult } from '../types/marketplace';
import { Search, Loader2, PackageX, SlidersHorizontal, Sparkles } from 'lucide-react';

export const MarketplaceSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ProductSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);

  // Filters
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Extract categories dynamically from results
  const categories = useMemo(() => {
    const cats = new Set(results.map(r => r.categoria_nombre));
    return ['All', ...Array.from(cats)].filter(Boolean);
  }, [results]);

  const fetchResults = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/buscar/?q=${encodeURIComponent(searchQuery)}`);
      // Use standard pagination if applies or direct array
      const items = data.results || data; 
      
      // Filter out non-products if the global search returns mixed types
      // The backend /api/buscar/ specifically returns a grouped Product list exactly as needed,
      // but let's ensure it maps cleanly.
      const productItems = items.filter((item: any) => item.ofertas !== undefined);
      setResults(productItems);
    } catch (err) {
      console.error(err);
      setError('Error al realizar la búsqueda. Por favor verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  // Manual debounce implementation
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchResults(query);
      if (query) setSearchParams({ q: query }, { replace: true });
      else setSearchParams({}, { replace: true });
    }, 400);
    return () => clearTimeout(handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Handle initial fetch on mount if query existed
  useEffect(() => {
    if (initialQuery && results.length === 0 && !loading) {
      fetchResults(initialQuery);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter application
  const filteredResults = useMemo(() => {
    let final = results;
    if (selectedCategory !== 'All') {
      final = final.filter(p => p.categoria_nombre === selectedCategory);
    }
    if (inStockOnly) {
      final = final.filter(p => p.ofertas.some(o => o.stock_status === 'in_stock'));
    }
    return final;
  }, [results, selectedCategory, inStockOnly]);

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* ── Search Header ── */}
      <div className="bg-slate-900 pt-8 pb-10 px-6 sticky top-0 z-30 shadow-lg border-b border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="w-full md:w-1/3">
              <h1 className="text-3xl text-white font-serif tracking-tight">
                Marketplace <span className="text-amber-500 italic font-light">Search</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">Busca productos, compara proveedores, y ahorra dinero.</p>
            </div>
            
            <form 
              className="w-full md:w-2/3 relative"
              onSubmit={(e) => {
                e.preventDefault();
                // Clear any pending debounces if they exist by forcing immediate search
                if (query) setSearchParams({ q: query }, { replace: true });
                else setSearchParams({}, { replace: true });
              }}
            >
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ej. 'Guantes de nitrilo sin polvo'..."
                className="w-full bg-slate-800 text-white placeholder-slate-400 pl-11 pr-4 py-4 rounded-2xl border border-slate-700 outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow text-lg shadow-inner"
              />
              {loading && (
                <div className="absolute inset-y-0 right-4 flex items-center">
                  <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-8 flex flex-col lg:flex-row gap-8 relative items-start">
        {/* ── Sidebar Filters ── */}
        <aside className="w-full lg:w-64 flex-shrink-0 lg:sticky lg:top-40">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-900 border-b border-slate-100 pb-4 mb-4">
               <SlidersHorizontal size={14} className="text-amber-500" /> Filtrar Búsqueda
            </h2>

            {/* In Stock toggle */}
            <div className="mb-6">
               <label className="flex items-center gap-3 cursor-pointer group" onClick={() => setInStockOnly(!inStockOnly)}>
                  <div className={`relative w-10 h-5 transition-colors rounded-full ${inStockOnly ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                     <div className={`absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${inStockOnly ? 'translate-x-5' : ''}`} />
                  </div>
                  <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                     Con stock garantizado
                  </span>
               </label>
            </div>

            {/* Category Filter */}
            {categories.length > 1 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Categorías</h3>
                <div className="space-y-1">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedCategory === cat 
                         ? 'bg-slate-900 text-white font-medium' 
                         : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {cat === 'All' ? 'Todas las especialidades' : cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {query.length > 0 && results.length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="font-bold text-amber-900 text-xs uppercase tracking-widest">Consejo DQ</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Las etiquetas doradas significan que DentalQuality ya ha negociado un precio especial para ti.
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main Results Grid ── */}
        <main className="flex-1">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-medium text-sm flex items-center justify-center border border-red-100">
              {error}
            </div>
          )}

          {!query ? (
             <div className="flex flex-col items-center justify-center py-24 text-center">
                <Search size={48} className="text-slate-200 mb-6" />
                <h3 className="text-xl font-serif text-slate-500">Comienza a escribir para buscar</h3>
                <p className="text-slate-400 text-sm mt-2 max-w-sm">
                  Encuentra el mejor precio entre cientos de opciones en instrumentación y equipamiento clínico.
                </p>
             </div>
          ) : results.length === 0 && !loading ? (
             <div className="flex flex-col items-center justify-center py-24 text-center">
                <PackageX size={48} className="text-slate-200 mb-6" />
                <h3 className="text-xl font-serif text-slate-500">No hay resultados</h3>
                <p className="text-slate-400 text-sm mt-2">
                  No hemos encontrado productos que coincidan con "{query}".
                </p>
             </div>
          ) : (
            <>
               <div className="mb-6 flex items-center justify-between">
                 <h2 className="text-sm font-medium text-slate-500">
                    Mostrando <strong className="text-slate-900">{filteredResults.length}</strong> resultados para "{query}"
                 </h2>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                 {filteredResults.map(producto => (
                   <MarketplaceProductCard
                     key={producto.id}
                     producto={producto}
                     onClick={setSelectedProduct}
                   />
                 ))}
               </div>
            </>
          )}
        </main>
      </div>

      <ProductoComparacionPanel
         producto={selectedProduct}
         onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
};

export default MarketplaceSearch;
