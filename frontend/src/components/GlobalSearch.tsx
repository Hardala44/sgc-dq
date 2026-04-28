import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Folder, Building2, Star, Package } from 'lucide-react';
import api from '../services/api';
import { normalize } from '../utils/marketplace';

export type SearchResults = {
    categorias: any[];
    proveedores: any[];
    ofertas_destacadas: any[];
    productos: any[];
};

interface GlobalSearchProps {
    onSelectResult?: (type: 'categoria' | 'proveedor' | 'oferta' | 'producto', item: any) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ onSelectResult }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Click-Outside Hook
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Debounce Logic & API Fetching
    useEffect(() => {
        if (query.trim().length <= 2) {
            setResults(null);
            setIsLoading(false);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsLoading(true);
            try {
                // Ensure the endpoint hits exactly what's required: /api/directory/search/?q=[query]
                const response = await api.get(`/directory/search/?q=${encodeURIComponent(query)}`);
                // Client-side accent-insensitive partial filter as a second pass
                const q = normalize(query);
                const filterItems = (items: any[]) =>
                    (items ?? []).filter(item =>
                        normalize(String(item.nombre ?? item.titulo ?? '')).includes(q)
                    );
                setResults({
                    categorias:         filterItems(response.data.categorias),
                    proveedores:        filterItems(response.data.proveedores),
                    ofertas_destacadas: filterItems(response.data.ofertas_destacadas),
                    productos:          filterItems(response.data.productos),
                });
                setIsOpen(true);
            } catch (error) {
                console.error("Error fetching search results:", error);
                setResults({ categorias: [], proveedores: [], ofertas_destacadas: [], productos: [] });
            } finally {
                setIsLoading(false);
            }
        }, 300); // 300ms Debounce

        return () => clearTimeout(delayDebounceFn);
    }, [query]);

    const handleSelect = (type: 'categoria' | 'proveedor' | 'oferta' | 'producto', item: any) => {
        setIsOpen(false);
        setQuery(item.nombre || query);
        if (onSelectResult) {
            onSelectResult(type, item);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            setIsOpen(false);
            // Optionally dispatch a global search action or navigation
        }
    };

    const hasNoResults = results && 
        results.categorias?.length === 0 && 
        results.proveedores?.length === 0 && 
        results.ofertas_destacadas?.length === 0 &&
        results.productos?.length === 0;

    return (
        <div ref={wrapperRef} className="relative w-full max-w-4xl mx-auto">
            {/* The Input Wrapper */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => {
                        if (query.length > 2) setIsOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Busca categorías, proveedores o productos..."
                    className="w-full h-12 pl-12 pr-4 text-sm bg-white text-black placeholder-slate-400 border border-slate-200 rounded-[1.5rem] shadow-sm focus:outline-none focus:ring-2 focus:ring-klein-500/20 focus:border-klein-500 transition-all font-medium"
                />
            </div>

            {/* The Dropdown (Floating Box) */}
            {isOpen && query.length > 2 && (
                <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-2xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.15)] border border-slate-100 z-50 overflow-hidden max-h-[400px] overflow-y-auto">
                    {/* Loading State */}
                    {isLoading ? (
                        <div className="flex items-center justify-center p-6 text-slate-500">
                            <Loader2 className="w-5 h-5 animate-spin text-klein-600" />
                            <span className="ml-2 text-sm font-medium tracking-tight">Buscando resultados...</span>
                        </div>
                    ) : hasNoResults ? (
                        /* Empty State */
                        <div className="p-8 text-center text-slate-500 font-medium text-sm">
                            No se encontraron resultados para "{query}"
                        </div>
                    ) : results && (
                        /* Populated State */
                        <div className="py-2">
                            
                            {/* Section 1: Categorías */}
                            {results.categorias && results.categorias.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/80 sticky top-0 backdrop-blur-sm z-10">
                                        Categorías
                                    </div>
                                    {results.categorias.map((cat, idx) => (
                                        <div 
                                            key={`cat-${cat.id || idx}`}
                                            onClick={() => handleSelect('categoria', cat)}
                                            className="hover:bg-slate-50 cursor-pointer px-4 py-2.5 flex items-center gap-3 border-b border-slate-50 last:border-0 transition-colors group"
                                        >
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-100 group-hover:bg-klein-50 transition-colors">
                                                <Folder className="w-4 h-4 text-slate-400 group-hover:text-klein-500" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm tracking-tight text-slate-900 leading-none group-hover:text-klein-700">{cat.nombre}</div>
                                                {cat.parent && (
                                                    <div className="text-[10px] text-slate-500 mt-1 font-medium">Subcategoría</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Section 2: Proveedores */}
                            {results.proveedores && results.proveedores.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/80 sticky top-0 backdrop-blur-sm z-10">
                                        Proveedores
                                    </div>
                                    {results.proveedores.map((prov, idx) => (
                                        <div 
                                            key={`prov-${prov.id || idx}`}
                                            onClick={() => handleSelect('proveedor', prov)}
                                            className="hover:bg-slate-50 cursor-pointer px-4 py-2.5 flex items-center gap-3 border-b border-slate-50 last:border-0 transition-colors group"
                                        >
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-100 group-hover:bg-klein-50 transition-colors">
                                                <Building2 className="w-4 h-4 text-slate-400 group-hover:text-klein-500" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-sm tracking-tight text-slate-900 leading-none group-hover:text-klein-700">{prov.nombre}</div>
                                                <div className="text-[10px] text-klein-600 font-bold mt-1 uppercase tracking-widest">
                                                    {prov.tipo_interaccion === 'link' ? 'Venta Directa' : 'Presupuesto'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Section 3: Ofertas Destacadas */}
                            {results.ofertas_destacadas && results.ofertas_destacadas.length > 0 && (
                                <div className="mb-2">
                                    <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/80 sticky top-0 backdrop-blur-sm z-10">
                                        Ofertas Destacadas
                                    </div>
                                    {results.ofertas_destacadas.map((oferta, idx) => (
                                        <div 
                                            key={`oferta-${oferta.id || idx}`}
                                            onClick={() => handleSelect('oferta', oferta)}
                                            className="hover:bg-slate-50 cursor-pointer px-4 py-2.5 flex items-center gap-3 border-b border-slate-50 last:border-0 transition-colors group"
                                        >
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-klein-50">
                                                <Star className="w-4 h-4 text-klein-500 fill-klein-500" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-semibold text-sm tracking-tight text-slate-900 leading-none group-hover:text-klein-700">{oferta.nombre}</div>
                                                {oferta.proveedor_nombre && (
                                                    <div className="text-[10px] text-slate-500 mt-1 font-medium tracking-tight">Por {oferta.proveedor_nombre}</div>
                                                )}
                                            </div>
                                            {oferta.precio_dq && (
                                                <div className="font-bold text-sm text-klein-600 bg-klein-50 px-2 py-0.5 rounded-md">
                                                    {oferta.precio_dq}€
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Section 4: Productos Marketplace */}
                            {results.productos && results.productos.length > 0 && (
                                <div className="mb-0">
                                    <div className="px-4 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/80 sticky top-0 backdrop-blur-sm z-10">
                                        Catálogo
                                    </div>
                                    {results.productos.map((producto: any, idx: number) => (
                                        <div 
                                            key={`producto-${producto.id || idx}`}
                                            onClick={() => handleSelect('producto', producto)}
                                            className="hover:bg-slate-50 cursor-pointer px-4 py-2.5 flex items-center gap-3 border-b border-slate-50 last:border-0 transition-colors group"
                                        >
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-slate-100 group-hover:bg-klein-50 transition-colors">
                                                <Package className="w-4 h-4 text-slate-400 group-hover:text-klein-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm tracking-tight text-slate-900 leading-none truncate group-hover:text-klein-700">{producto.nombre}</div>
                                                <div className="text-[10px] text-slate-500 mt-1 font-medium tracking-tight truncate">
                                                    {producto.marca && <span className="text-slate-400 font-bold">{producto.marca} · </span>}
                                                    <span>{producto.supplier_count ?? 0} {(producto.supplier_count ?? 0) === 1 ? 'proveedor' : 'proveedores'}</span>
                                                </div>
                                            </div>
                                            {producto.min_price && (
                                                <div className="flex-shrink-0 text-right">
                                                    <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">desde</div>
                                                    <div className="font-bold text-sm text-slate-900 tabular-nums">
                                                        {parseFloat(producto.min_price).toFixed(2)}€
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
