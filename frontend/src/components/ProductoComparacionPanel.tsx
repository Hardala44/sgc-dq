import React, { useEffect } from 'react';
import {
  X, ExternalLink, Tag, Building2,
  CheckCircle2, AlertTriangle, XCircle, HelpCircle,
  ShieldCheck, PhoneCall, Mail
} from 'lucide-react';
import type { ProductSearchResult } from '../types/marketplace';
import { getFallbackImage, STOCK_LABELS } from './MarketplaceProductCard';
import type { SupplierOffer } from '../types/marketplace';

interface ProductoComparacionPanelProps {
  producto: ProductSearchResult | null;
  onClose: () => void;
}

const StockIcon: React.FC<{ status: SupplierOffer['stock_status'] }> = ({ status }) => {
  const map = {
    in_stock: <CheckCircle2 size={14} className="text-emerald-500" />,
    low_stock: <AlertTriangle size={14} className="text-amber-500" />,
    out_of_stock: <XCircle size={14} className="text-red-500" />,
    unknown: <HelpCircle size={14} className="text-slate-400" />,
  };
  return map[status] ?? map.unknown;
};

const ProductoComparacionPanel: React.FC<ProductoComparacionPanelProps> = ({ producto, onClose }) => {
  // Lock body scroll while open
  useEffect(() => {
    if (producto) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [producto]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!producto) return null;

  const imageSrc = producto.imagen_url || getFallbackImage(producto.id);
  const suministros = producto.suministros || [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white border-l border-slate-200 z-50 flex flex-col shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={`Ver red de proveedores para ${producto.nombre}`}
        style={{ animation: 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)' }}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 relative bg-slate-50 border-b border-slate-200">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all z-20 shadow-sm"
            aria-label="Cerrar panel"
          >
            <X size={16} />
          </button>

          <div className="flex flex-col sm:flex-row gap-6 p-6">
              {/* Image Thumbnail */}
              <div className="w-32 h-32 rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm flex-shrink-0">
                <img
                  src={imageSrc}
                  alt={producto.nombre}
                  className="w-full h-full object-cover mix-blend-multiply"
                  onError={(e) => { (e.target as HTMLImageElement).src = getFallbackImage(producto.id); }}
                />
              </div>

              {/* Product identity block */}
              <div className="flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <Tag size={10} className="text-slate-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {producto.categoria_nombre}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                  {producto.nombre}
                </h2>
                {producto.marca && (
                  <p className="text-xs text-klein-600 uppercase tracking-widest mt-1.5 font-bold">
                    {producto.marca}
                  </p>
                )}
                {producto.descripcion && (
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">
                    {producto.descripcion}
                  </p>
                )}

                {/* Badge row */}
                <div className="flex items-center gap-3 mt-4">
                  <div className="inline-flex items-center gap-1.5 text-slate-600 text-xs bg-slate-200/50 px-2.5 py-1 rounded-md font-medium">
                    <Building2 size={12} />
                    <span>
                      <span className="font-bold">{suministros.length}</span>{' '}
                      {suministros.length === 1 ? 'proveedor' : 'proveedores'} en red
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-klein-700 text-xs bg-klein-50 px-2.5 py-1 rounded-md font-bold">
                    <ShieldCheck size={12} />
                    <span>Condiciones Garantizadas</span>
                  </div>
                </div>
              </div>
          </div>
        </div>

        {/* ── Table Header ── */}
        <div className="flex-shrink-0 border-b border-slate-100 bg-[#F7F7F7] px-6 py-3 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500">
            {suministros.length} {suministros.length === 1 ? 'distribuidor oficial' : 'distribuidores oficiales'}
          </span>
        </div>

        {/* ── Suppliers Directory ── */}
        <div className="flex-1 overflow-y-auto px-6 pb-8 bg-[#F7F7F7]">
          {suministros.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Building2 size={40} className="mb-4 opacity-30" />
              <p className="text-sm font-medium">Red de distribuidores en actualización.</p>
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              {suministros.map((oficial, idx) => {
                const stockInfo = STOCK_LABELS[oficial.stock_status] ?? STOCK_LABELS.unknown;

                return (
                  <div
                    key={oficial.id}
                    className="relative rounded-xl border border-slate-200 bg-white hover:border-klein-300 hover:shadow-md transition-all duration-300 p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between"
                  >
                    {/* Proveedor Base Info */}
                    <div className="flex items-center gap-4 flex-1">
                      {oficial.proveedor_logo ? (
                        <div className="w-12 h-12 rounded-full border border-slate-100 p-1 flex-shrink-0 relative">
                          <img
                            src={oficial.proveedor_logo}
                            alt={oficial.proveedor_nombre}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex-shrink-0 flex items-center justify-center border border-slate-100">
                          <Building2 size={16} className="text-slate-400" />
                        </div>
                      )}
                      
                      <div>
                        <h4 className="text-base font-bold text-slate-900 leading-none mb-1">
                           {oficial.proveedor_nombre}
                        </h4>
                        
                        <div className="flex items-center gap-3 mt-1.5">
                            {/* Stock status */}
                            <div className="flex items-center gap-1">
                              <StockIcon status={oficial.stock_status} />
                              <span className={`text-[9px] font-bold uppercase tracking-widest ${stockInfo.color}`}>
                                {stockInfo.label}
                              </span>
                            </div>
                            
                            {/* Contact Lead (if exists) */}
                            {oficial.contacto_nombre && (
                                <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                                   <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                                     Ref: <span className="text-slate-700">{oficial.contacto_nombre}</span>
                                   </span>
                                </div>
                            )}
                        </div>
                      </div>
                    </div>

                    {/* Actions B2B Flow */}
                    <div className="flex items-center gap-2.5 shrink-0 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                       
                       {/* E-Commerce fallback secondary */}
                       {oficial.url_compra && (
                           <a
                             href={oficial.url_compra}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-full transition-colors mr-2 border border-transparent hover:border-slate-200"
                             title="Ver en e-commerce"
                           >
                              <ExternalLink size={16} />
                           </a>
                       )}

                       {/* Direct Call */}
                       <a 
                          href={oficial.contacto_telefono ? `tel:${oficial.contacto_telefono}` : '#'}
                          className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-lg border transition-all ${
                            oficial.contacto_telefono 
                            ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                            : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                          onClick={(e) => !oficial.contacto_telefono && e.preventDefault()}
                       >
                          <PhoneCall size={14} /> Llamar
                       </a>

                       {/* Direct Mail (Primary) */}
                       <a 
                          href={oficial.contacto_email ? `mailto:${oficial.contacto_email}?subject=Asesoramiento sobre ${encodeURIComponent(producto.nombre)} (Red DentalQuality)` : '#'}
                          className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-sm ${
                            oficial.contacto_email 
                            ? 'bg-klein-600 text-white hover:bg-klein-700 shadow-klein-600/20'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                          onClick={(e) => !oficial.contacto_email && e.preventDefault()}
                       >
                          <Mail size={14} /> Contactar
                       </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Keyframe animation — injected inline since we're using vanilla CSS within Tailwind */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
};

export default ProductoComparacionPanel;
