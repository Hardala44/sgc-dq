import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { ProductSearchResult, SupplierOffer, LiveProduct } from '../types/marketplace';

export type { ProductSearchResult as ProductoMarketplace, SupplierOffer as ProveedorOferta }; // For backwards compatibility

// ─── Standard DB product card props ───────────────────────────────────────────
interface StandardCardProps {
  producto: ProductSearchResult;
  onClick: (producto: ProductSearchResult) => void;
  productIndex?: number;
  isLive?: false;
  liveProduct?: never;
  onLiveClick?: never;
}

// ─── Live-scraped product card props ─────────────────────────────────────────
interface LiveCardProps {
  producto?: never;
  onClick?: never;
  productIndex?: number;
  isLive: true;
  liveProduct: LiveProduct;
  /** Called when user clicks live result — triggers DB persistence */
  onLiveClick: (liveProduct: LiveProduct) => void;
}

type MarketplaceProductCardProps = StandardCardProps | LiveCardProps;

const MarketplaceProductCard: React.FC<MarketplaceProductCardProps> = (props) => {

  // ── Live product card variant ──────────────────────────────────────────────
  if (props.isLive && props.liveProduct) {
    const { liveProduct, onLiveClick } = props;

    return (
      <article
        onClick={() => onLiveClick(liveProduct)}
        className="group relative bg-white border border-emerald-100/80 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all duration-300 cursor-pointer flex flex-col h-full gap-3"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onLiveClick(liveProduct)}
      >
        {/* Category & Badge */}
        <div className="flex items-start justify-end gap-2">
          <div className="flex items-center gap-1 bg-emerald-500 text-white text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded shadow-sm shrink-0">
            En Vivo
          </div>
        </div>

        {/* Name & Brand */}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors">
            {liveProduct.linea_producto}
          </h3>
          {liveProduct.marca && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1.5 block">
              {liveProduct.marca}
            </span>
          )}
        </div>

        {/* Footer: Price & Provider */}
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-100">
          {/* Prices */}
          {(liveProduct.precio_dq !== null || liveProduct.ahorro_pct > 0) && (
            <div>
              {liveProduct.precio_dq !== null ? (
                <div className="flex flex-col">
                  {liveProduct.precio_web != null && (
                    <span className="text-[10px] text-slate-400 line-through leading-none">
                      {liveProduct.precio_web.toFixed(2)}€
                    </span>
                  )}
                  <div className="text-sm font-bold text-emerald-600 leading-tight">
                    {liveProduct.precio_dq.toFixed(2)}€
                  </div>
                </div>
              ) : (
                <span className="text-[10px] font-medium text-slate-400">Consultar</span>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            {liveProduct.ahorro_pct > 0 && (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                -{liveProduct.ahorro_pct}%
              </span>
            )}
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 text-right max-w-[80px] truncate">
              {liveProduct.proveedor_nombre}
            </span>
          </div>
        </div>
      </article>
    );
  }

  // ── Standard DB product card ───────────────────────────────────────────────
  const { producto, onClick } = props as StandardCardProps;

  // Normalize suministros: backend may return flat objects (category-fallback)
  // or nested {proveedor: {...}} objects (ProveedorOferta). Normalise to flat.
  const rawList = (producto.suministros || producto.ofertas || []);
  const proveedoresList = rawList.map(s => {
    const isNested = s.proveedor && typeof s.proveedor === 'object';
    return {
      id: isNested ? s.proveedor.id : s.id,
      nombre: isNested ? s.proveedor.nombre : (s.nombre ?? ''),
      logo: isNested ? s.proveedor.logo : (s.logo ?? null),
      url_compra: s.url_compra || '',
      url_web: isNested ? s.proveedor.url_web : (s.url_web ?? ''),
      stock_status: s.stock_status,
      has_price: s.has_price ?? true,
    };
  });

  const MAX_LOGOS = 4;
  const visibleLogos = proveedoresList.slice(0, MAX_LOGOS);
  const overflowLogos = proveedoresList.length - MAX_LOGOS;

      {/* ── Typographic Hero Area ── */}
  return (
    <article
      onClick={() => onClick(producto)}
      className="group relative bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-klein-300 transition-all duration-300 cursor-pointer flex flex-col h-full gap-3"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(producto)}
      aria-label={`Consultar suministro para ${producto.nombre}`}
    >
      {/* Category & Brand Header */}
      <div className="flex items-start justify-end gap-2">
        {producto.marca && (
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 bg-white border border-slate-100 px-2 py-1 rounded shrink-0 max-w-[80px] truncate">
            {producto.marca}
          </span>
        )}
      </div>

      {/* Product Name */}
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-klein-600 transition-colors">
          {producto.nombre}
        </h3>
      </div>

      {/* Footer: Suppliers */}
      <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-100">
        <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {visibleLogos.map((prov, i) => (
                <div
                  key={prov.id}
                  className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm"
                  style={{ zIndex: 10 - i }}
                  title={prov.nombre}
                >
                  {prov.logo ? (
                    <img
                      src={prov.logo}
                      alt={prov.nombre}
                      className="w-full h-full object-contain p-[1px] bg-white"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-[7px] font-bold text-slate-600 leading-none select-none">
                      {prov.nombre.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
              ))}
              {overflowLogos > 0 && (
                <div
                  className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 text-[8px] font-bold text-slate-500"
                  style={{ zIndex: 0 }}
                >
                  +{overflowLogos}
                </div>
              )}
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
              {proveedoresList.length === 1 ? '1 distribuidor' : `${proveedoresList.length} prov.`}
            </span>
        </div>

        <div className="w-6 h-6 rounded-full flex items-center justify-center group-hover:bg-klein-50 group-hover:text-klein-600 transition-all duration-300 bg-white border border-slate-200 text-slate-400 shrink-0">
          <ChevronRight size={12} />
        </div>
      </div>
    </article>
  );
};

export default MarketplaceProductCard;
