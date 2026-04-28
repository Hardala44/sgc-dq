import React from 'react';
import { Tag, ChevronRight } from 'lucide-react';
import type { ProductSearchResult, SupplierOffer } from '../types/marketplace';
import { isPlaceholderUrl } from '../utils/marketplace';
import CategoryIcon from './CategoryIcon';

export type { ProductSearchResult as ProductoMarketplace, SupplierOffer as ProveedorOferta }; // For backwards compatibility

interface MarketplaceProductCardProps {
  producto: ProductSearchResult;
  onClick: (producto: ProductSearchResult) => void;
}

const MarketplaceProductCard: React.FC<MarketplaceProductCardProps> = ({ producto, onClick }) => {
  const isPlaceholder = isPlaceholderUrl(producto.imagen_url);

  // Safe default fallback for suministros if undefined
  const proveedoresList = producto.suministros || [];
  const MAX_LOGOS = 4;
  const visibleLogos = proveedoresList.slice(0, MAX_LOGOS);
  const overflowLogos = proveedoresList.length - MAX_LOGOS;

  return (
    <article
      onClick={() => onClick(producto)}
      className="group relative bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-slate-300 transition-all duration-300 cursor-pointer flex flex-col h-full"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(producto)}
      aria-label={`Consultar suministro para ${producto.nombre}`}
    >
      {/* ── Image Area ── */}
      <div className="relative h-44 bg-slate-50 overflow-hidden flex-shrink-0">
        {isPlaceholder ? (
          /* Icon fills the whole area; sits below the logo stack (z-0) */
          <div className="absolute inset-0 z-0 flex h-full w-full items-center justify-center bg-slate-50">
            <CategoryIcon categoryName={producto.categoria_nombre} size={48} />
          </div>
        ) : (
          <>
            <img
              src={producto.imagen_url!}
              alt={producto.nombre}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            {/* Dark scrim only on real photos so supplier logos stay legible */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80" />
          </>
        )}

        {/* Brand / Identifier Tag */}
        {producto.marca && (
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur shadow-sm px-2.5 py-1 rounded-full border border-white/20 z-10 text-[10px] uppercase font-bold tracking-widest text-slate-800">
              {producto.marca}
            </div>
        )}

        {/* Suppliers Logos Stack */}
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2">
            {/* Avatar stack */}
            <div className="flex -space-x-2">
              {visibleLogos.map((prov, i) => (
                <div
                  key={prov.id}
                  className="w-6 h-6 rounded-full bg-white border border-white flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm"
                  style={{ zIndex: 10 - i }}
                  title={prov.proveedor.nombre}
                >
                  {prov.proveedor.logo ? (
                    <img
                      src={prov.proveedor.logo}
                      alt={prov.proveedor.nombre}
                      className="w-full h-full object-contain p-0.5"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-[8px] font-bold text-slate-600 leading-none select-none">
                      {prov.proveedor.nombre.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
              ))}
              {overflowLogos > 0 && (
                <div
                  className="w-6 h-6 rounded-full bg-slate-100 border border-white flex items-center justify-center flex-shrink-0 text-[9px] font-bold text-slate-500"
                  style={{ zIndex: 0 }}
                >
                  +{overflowLogos}
                </div>
              )}
            </div>
            {/* Distribuidor count */}
            <span className={`text-[9px] font-bold uppercase tracking-widest drop-shadow-sm ${
              isPlaceholder ? 'text-slate-500' : 'text-white/90 drop-shadow-md'
            }`}>
              {proveedoresList.length === 1 ? '1 distribuidor' : `${proveedoresList.length} distribuidores`}
            </span>
        </div>

        {/* Hover overlay action */}
        <div className="absolute inset-0 bg-klein-900/0 group-hover:bg-klein-900/10 transition-colors duration-300 flex items-center justify-center z-20">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white text-slate-900 text-[11px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-full flex items-center gap-1.5 shadow-xl">
            Consultar Suministros <ChevronRight size={14} />
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex flex-col flex-1 p-5 gap-2.5">
        <div className="flex items-center gap-1.5">
          <Tag size={10} className="text-slate-400 flex-shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 truncate">
            {producto.categoria_nombre}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-klein-600 transition-colors">
          {producto.nombre}
        </h3>

        {/* Footer ── minimal: just a directional cue */}
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Ver proveedores
          </span>
          <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-klein-50 group-hover:text-klein-600 transition-all duration-300 bg-slate-50 border border-slate-200 group-hover:border-klein-200 text-slate-400">
            <ChevronRight size={14} />
          </div>
        </div>
      </div>
    </article>
  );
};

export default MarketplaceProductCard;
