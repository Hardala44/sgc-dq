import React from 'react';
import { Package, Tag, Building2, ChevronRight, CheckCircle2 } from 'lucide-react';
import type { ProductSearchResult, SupplierOffer } from '../types/marketplace';

export type { ProductSearchResult as ProductoMarketplace, SupplierOffer as ProveedorOferta }; // For backwards compatibility

interface MarketplaceProductCardProps {
  producto: ProductSearchResult;
  onClick: (producto: ProductSearchResult) => void;
}

const STOCK_LABELS: Record<SupplierOffer['stock_status'], { label: string; color: string }> = {
  in_stock: { label: 'En stock', color: 'text-emerald-400' },
  low_stock: { label: 'Stock bajo', color: 'text-amber-400' },
  out_of_stock: { label: 'Sin stock', color: 'text-red-400' },
  unknown: { label: 'Consultar', color: 'text-slate-400' },
};

export { STOCK_LABELS };

// Deterministic fallback image based on product id
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1628177142898-93e46e48d5f5?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&q=80&w=800',
  'https://images.unsplash.com/photo-1593491205049-7f032d28cf01?auto=format&fit=crop&q=80&w=800',
];

export const getFallbackImage = (id: number) => FALLBACK_IMAGES[id % FALLBACK_IMAGES.length];

const MarketplaceProductCard: React.FC<MarketplaceProductCardProps> = ({ producto, onClick }) => {
  const imageSrc = producto.imagen_url || getFallbackImage(producto.id);
  
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
      <div className="relative h-44 bg-slate-100 overflow-hidden flex-shrink-0">
        <img
          src={imageSrc}
          alt={producto.nombre}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 mix-blend-multiply"
          onError={(e) => {
            (e.target as HTMLImageElement).src = getFallbackImage(producto.id);
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-80" />

        {/* Brand / Identifier Tag */}
        {producto.marca && (
            <div className="absolute top-3 left-3 bg-white/95 backdrop-blur shadow-sm px-2.5 py-1 rounded-full border border-white/20 z-10 text-[10px] uppercase font-bold tracking-widest text-slate-800">
              {producto.marca}
            </div>
        )}

        {/* Suppliers Logos Stack */}
        <div className="absolute bottom-3 left-3 z-10 flex flex-col gap-1">
            <span className="text-[9px] font-bold text-white/90 uppercase tracking-widest ml-1 drop-shadow-md">Distribuidores ({proveedoresList.length})</span>
            <div className="flex -space-x-2.5">
              {visibleLogos.map((prov, i) => (
                <div 
                  key={prov.id} 
                  className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm relative z-10 ring-2 ring-white"
                  style={{ zIndex: 10 - i }}
                  title={prov.proveedor.nombre}
                >
                  {prov.proveedor.logo ? (
                     <img src={prov.proveedor.logo} alt={prov.proveedor.nombre} className="w-full h-full object-contain p-0.5" />
                  ) : (
                     <Building2 size={12} className="text-slate-400" />
                  )}
                </div>
              ))}
              {overflowLogos > 0 && (
                <div 
                  className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-slate-500 ring-2 ring-white"
                  style={{ zIndex: 0 }}
                >
                  +{overflowLogos}
                </div>
              )}
            </div>
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

        {/* Footer Conditions Block */}
        <div className="mt-auto pt-4 flex flex-col gap-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-klein-50 text-klein-600 flex items-center justify-center flex-shrink-0">
               <CheckCircle2 size={12} strokeWidth={3} />
            </div>
            <span className="text-[11px] font-bold text-klein-700 uppercase tracking-widest">
              Condiciones DQ Garantizadas
            </span>
          </div>
          
          <div className="flex items-center justify-between text-slate-500">
             <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                 <span className="text-xs font-semibold text-slate-600">Ver proveedores aprobados</span>
             </div>
             <div className="w-8 h-8 rounded-full flex items-center justify-center group-hover:bg-klein-50 group-hover:text-klein-600 transition-all duration-300 bg-slate-50 border border-slate-200 group-hover:border-klein-200 text-slate-400">
               <ChevronRight size={14} />
             </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default MarketplaceProductCard;
