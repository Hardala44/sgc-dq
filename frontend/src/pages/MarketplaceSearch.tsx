import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import MarketplaceProductCard from '../components/MarketplaceProductCard';
import ProductoComparacionPanel from '../components/ProductoComparacionPanel';
import LiveSearchBanner from '../components/LiveSearchBanner';
import type {
  ProductSearchResult,
  SmartSearchResponse,
  LiveProduct,
  LiveSearchStatus,
  AIMeta,
} from '../types/marketplace';
import {
  Search, Loader2, PackageX, Brain, HeadphonesIcon, ArrowRight,
} from 'lucide-react';
import LeadRequestModal from '../components/LeadRequestModal';

// ─── Constants ────────────────────────────────────────────────────────────────
const POLL_INTERVAL_MS = 3000;
const POLL_TIMEOUT_MS = 60000;

// ─── Default AI meta (before first search) ────────────────────────────────────
const EMPTY_AI_META: AIMeta = {
  ai_enriched: false,
  related_terms: [],
  scraper_terms: [],
  categoria_sugerida: '',
  proveedores_sugeridos: [],
  contexto: '',
};

export const MarketplaceSearch = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [localResults, setLocalResults] = useState<ProductSearchResult[]>([]);
  const [liveResults, setLiveResults] = useState<LiveProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductSearchResult | null>(null);
  const [aiMeta, setAiMeta] = useState<AIMeta>(EMPTY_AI_META);

  // Live search state
  const [liveStatus, setLiveStatus] = useState<'idle' | 'searching' | 'done' | 'no_results'>('idle');
  const [providersSearched, setProvidersSearched] = useState<string[]>([]);

  // Polling ref (to cancel on new search / unmount)
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isAdvisoryOpen, setIsAdvisoryOpen] = useState(false);

  // ── Stop any active polling ──────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  // ── Start polling for live search results ────────────────────────────────────
  const startPolling = useCallback((sid: string) => {
    stopPolling();

    pollIntervalRef.current = setInterval(async () => {
      try {
        const { data } = await api.get<LiveSearchStatus>(
          `/live-search-status/?session_id=${sid}`
        );

        if (data.status === 'done') {
          stopPolling();
          setLiveResults(data.results);
          setProvidersSearched(data.providers_searched);
          setLiveStatus(data.results.length > 0 ? 'done' : 'no_results');
        } else if (data.status === 'error' || data.status === 'not_found') {
          stopPolling();
          setLiveStatus('no_results');
        }
      } catch {
        // keep trying until timeout
      }
    }, POLL_INTERVAL_MS);

    pollTimeoutRef.current = setTimeout(() => {
      stopPolling();
      setLiveStatus(liveResults.length > 0 ? 'done' : 'no_results');
    }, POLL_TIMEOUT_MS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopPolling]);

  // ── Main search function ─────────────────────────────────────────────────────
  const fetchResults = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setLocalResults([]);
      setLiveResults([]);
      setLiveStatus('idle');
      setAiMeta(EMPTY_AI_META);
      stopPolling();
      return;
    }

    setLoading(true);
    setError('');
    setLiveResults([]);
    setLiveStatus('idle');
    setProvidersSearched([]);
    stopPolling();

    try {
      const { data } = await api.get<SmartSearchResponse>(
        `/smart-search/?q=${encodeURIComponent(searchQuery)}`
      );

      setLocalResults(data.productos || []);
      setAiMeta(data.ai_meta || EMPTY_AI_META);

      if (data.is_searching_live && data.session_id) {
        setLiveStatus('searching');
        startPolling(data.session_id);
      }
    } catch (err) {
      console.error(err);
      setError('Error al realizar la búsqueda. Por favor verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startPolling, stopPolling]);

  // ── Debounced query effect ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchResults(query);
      if (query) setSearchParams({ q: query }, { replace: true });
      else setSearchParams({}, { replace: true });
    }, 400);
    return () => clearTimeout(handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Initial fetch on mount or URL param change
  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    if (urlQuery && urlQuery !== query) {
      setQuery(urlQuery);
    } else if (urlQuery && localResults.length === 0 && !loading) {
      fetchResults(urlQuery);
    }
    return () => stopPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── Persist live product and open detail ──────────────────────────────────────
  const handleLiveProductClick = useCallback(async (lp: LiveProduct) => {
    try {
      await api.post('/persist-live-product/', {
        linea_producto: lp.linea_producto,
        marca: lp.marca,
        proveedor_nombre: lp.proveedor_nombre,
        categoria_name: lp.categoria_name,
        url_compra: lp.url_compra,
        precio_web: lp.precio_web,
        precio_dq: lp.precio_dq,
      });
    } catch {
      // non-critical
    }
    if (lp.url_compra) {
      window.open(lp.url_compra, '_blank', 'noopener');
    }
  }, []);

  const filteredLocal = localResults;
  const totalResults = filteredLocal.length + liveResults.length;
  const hasResults = totalResults > 0;
  const showLiveBanner = query && liveStatus !== 'idle';
  const showNoResults = !loading && !hasResults && liveStatus !== 'searching' && !!query;

  return (
    <div className="bg-[#F8FAFC] min-h-screen pb-16">

      {/* ── Search Header — matches home aesthetic ── */}
      <div className="bg-white border-b border-slate-100 pt-6 pb-8 px-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-5">

            {/* Title */}
            <div className="shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-[3px] h-6 bg-navy-800 rounded-full" />
                <h1 className="text-xl font-bold text-navy-800 uppercase tracking-[0.12em]">
                  Marketplace Search
                </h1>
                {aiMeta.ai_enriched && (
                  <span className="inline-flex items-center gap-1 text-[9px] bg-gold-500/10 text-gold-600 px-2 py-0.5 rounded-full border border-gold-500/20 font-bold uppercase tracking-widest">
                    <Brain size={8} />
                    IA
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 ml-3">
                {aiMeta.ai_enriched && aiMeta.contexto
                  ? aiMeta.contexto
                  : 'Busca productos, compara proveedores y ahorra dinero.'}
              </p>
            </div>

            {/* Search input */}
            <form
              className="flex-1 relative"
              onSubmit={(e) => {
                e.preventDefault();
                if (query) setSearchParams({ q: query }, { replace: true });
              }}
            >
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ej. babero dental, implante Straumann, guantes nitrilo…"
                className="w-full bg-slate-50 text-slate-900 placeholder-slate-400 pl-10 pr-10 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-2 focus:ring-navy-800/20 focus:border-navy-800/40 transition-all text-sm shadow-inner"
              />
              {loading && (
                <div className="absolute inset-y-0 right-4 flex items-center">
                  <Loader2 className="h-4 w-4 text-navy-800 animate-spin" />
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-6 relative">
        <main>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 font-medium text-sm flex items-center justify-center border border-red-100">
              {error}
            </div>
          )}

          {/* ── Empty state (no query yet) ── */}
          {!query && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
                <Search size={28} className="text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-700">Comienza a escribir para buscar</h3>
              <p className="text-slate-400 text-sm mt-2 max-w-sm">
                El buscador inteligente de DQ localiza el producto en nuestro catálogo
                o lo busca en tiempo real entre todos nuestros distribuidores.
              </p>
            </div>
          )}

          {query && (
            <>
              {/* ── Results count ── */}
              {hasResults && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    <span className="text-navy-800">{filteredLocal.length}</span> resultado{filteredLocal.length !== 1 ? 's' : ''}
                    {liveResults.length > 0 && (
                      <> · <span className="text-emerald-600">{liveResults.length} en vivo</span></>
                    )}
                    {' '}para "{query}"
                  </p>
                </div>
              )}

              {/* ── Local DB Results ── */}
              {filteredLocal.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
                  {filteredLocal.map((producto, index) => (
                    <MarketplaceProductCard
                      key={producto.id}
                      producto={producto}
                      onClick={setSelectedProduct}
                      productIndex={index}
                    />
                  ))}
                </div>
              )}

              {/* ── Live Search Banner ── */}
              {showLiveBanner && (
                <LiveSearchBanner
                  query={query}
                  aiMeta={aiMeta}
                  status={liveStatus}
                  providersSearched={providersSearched}
                  resultCount={liveResults.length}
                />
              )}

              {/* ── Live Results ── */}
              {liveResults.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 my-5">
                    <div className="h-px flex-1 bg-emerald-100" />
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 px-3">
                      Ofertas en Vivo · Fuente externa
                    </span>
                    <div className="h-px flex-1 bg-emerald-100" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {liveResults.map((lp, index) => (
                      <MarketplaceProductCard
                        key={`live-${lp.proveedor_nombre}-${lp.linea_producto}-${index}`}
                        isLive={true}
                        liveProduct={lp}
                        onLiveClick={handleLiveProductClick}
                        productIndex={index}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── No results state ── */}
              {showNoResults && (
                <div className="max-w-md mx-auto pt-8">

                  {/* Advisory CTA — first and most prominent */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-navy-800/5 text-navy-800 flex items-center justify-center shrink-0">
                        <HeadphonesIcon size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em]">Consultoría de compras</p>
                        <p className="text-sm font-semibold text-slate-900">¿No encuentras lo que necesitas?</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      Nuestro equipo lo buscará y negociará las mejores condiciones para tu clínica con cualquiera de nuestros proveedores.
                    </p>
                    <button
                      onClick={() => setIsAdvisoryOpen(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-white text-xs font-bold uppercase tracking-widest shadow-sm transition-colors duration-200"
                    >
                      <HeadphonesIcon size={13} />
                      Pedir Asesoría
                      <ArrowRight size={13} />
                    </button>
                  </div>

                  {/* No results message */}
                  <div className="text-center py-2">
                    <PackageX size={36} className="text-slate-200 mx-auto mb-3" />
                    <h3 className="text-sm font-semibold text-slate-500">No hay resultados para "{query}"</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      No encontramos nada en nuestro catálogo ni entre los distribuidores del grupo.
                    </p>
                    {aiMeta.scraper_terms.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 mt-4">
                        <span className="text-xs text-slate-400 w-full">Prueba también:</span>
                        {aiMeta.scraper_terms.map(t => (
                          <button
                            key={t}
                            onClick={() => setQuery(t)}
                            className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:border-navy-800/30 hover:text-navy-800 transition-colors"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Detail Panel ── */}
      <ProductoComparacionPanel
        producto={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />

      {/* ── Advisory Modal ── */}
      <LeadRequestModal
        isOpen={isAdvisoryOpen}
        onClose={() => setIsAdvisoryOpen(false)}
        proveedor={null}
      />
    </div>
  );
};

export default MarketplaceSearch;

