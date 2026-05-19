import React, { useEffect } from 'react';
import {
  X, Globe, Tag, Building2,
  CheckCircle2, AlertTriangle, XCircle,
  PhoneCall, Mail
} from 'lucide-react';
import type { ProductSearchResult, SupplierOffer } from '../types/marketplace';
import { STOCK_LABELS } from '../utils/marketplace';

interface ProductoComparacionPanelProps {
  producto: ProductSearchResult | null;
  onClose: () => void;
}

const StockIcon: React.FC<{ status: SupplierOffer['stock_status'] }> = ({ status }) => {
  const map = {
    in_stock: <CheckCircle2 size={14} className="text-emerald-500" />,
    low_stock: <AlertTriangle size={14} className="text-amber-500" />,
    out_of_stock: <XCircle size={14} className="text-red-500" />,
    unknown: null,
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
              {suministros.map((oficial) => {
                const stockInfo = STOCK_LABELS[oficial.stock_status] ?? STOCK_LABELS.unknown;
                
                // Normalization: Check if it's a nested ProveedorOferta or a flat category-fallback object
                const isNested = oficial.proveedor && typeof oficial.proveedor === 'object';
                const provId = isNested ? oficial.proveedor.id : oficial.id;
                const provNombre = isNested ? oficial.proveedor.nombre : (oficial.nombre ?? '');
                const provLogo = isNested ? oficial.proveedor.logo : (oficial.logo ?? null);
                const provTel = isNested ? oficial.proveedor.contacto_telefono : (oficial.contacto_telefono ?? null);
                const provEmail = isNested ? oficial.proveedor.contacto_email : (oficial.contacto_email ?? null);
                const provContacto = isNested ? oficial.proveedor.contacto_nombre : (oficial.contacto_nombre ?? null);
                const provCondiciones = isNested ? oficial.proveedor.condiciones_especiales : (oficial.condiciones_especiales ?? null);
                
                // For web URL, backend might have `url_web` or frontend handles alternatives
                const sourceForWeb = isNested ? oficial.proveedor : oficial;
                const rawProviderWeb = (sourceForWeb as any).sitio_web || (sourceForWeb as any).website || (sourceForWeb as any).url || (sourceForWeb as any).url_web;

                const telHref = provTel ? `tel:${provTel}` : null;
                const mailHref = provEmail
                  ? `mailto:${provEmail}?subject=${encodeURIComponent(`Consulta desde DentalQuality: ${producto.nombre}`)}`
                  : null;
                const providerWebUrl = rawProviderWeb
                  ? (rawProviderWeb.startsWith('http') ? rawProviderWeb : `https://${rawProviderWeb}`)
                  : null;

                return (
                  <div
                    key={provId}
                    className="relative rounded-xl border border-slate-200 bg-white hover:border-klein-300 hover:shadow-md transition-all duration-300 p-5 flex flex-col sm:flex-row gap-4 sm:items-start justify-between"
                  >
                    {/* Proveedor Base Info */}
                    <div className="flex items-start gap-4 flex-1">
                      {provLogo ? (
                        <div className="w-12 h-12 mt-1 rounded-full border border-slate-100 p-1 flex-shrink-0 relative bg-white">
                          <img
                            src={provLogo}
                            alt={provNombre}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 mt-1 rounded-full bg-slate-50 flex-shrink-0 flex items-center justify-center border border-slate-100">
                          <Building2 size={16} className="text-slate-400" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-slate-900 leading-none mb-1">
                           {provNombre}
                        </h4>
                        
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                            {/* Stock status */}
                            <div className="flex items-center gap-1">
                              <StockIcon status={oficial.stock_status} />
                              <span className={`text-[9px] font-bold uppercase tracking-widest ${stockInfo.color}`}>
                                {stockInfo.label}
                              </span>
                            </div>
                            
                            {/* Contact Lead (if exists) */}
                            {provContacto && (
                                <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                                   <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                                     Ref: <span className="text-slate-700">{provContacto}</span>
                                   </span>
                                </div>
                            )}
                        </div>

                        {/* Condiciones Especiales */}
                        {provCondiciones && (
                          <div className="mt-3">
                            <div className="flex flex-col gap-1 text-[11px] text-slate-700 font-medium">
                              {provCondiciones.split('\n').map((line, i) => {
                                const trimmed = line.trim();
                                if (!trimmed) return null;
                                
                                const isBullet = /^[-•*]/.test(trimmed);
                                const cleanText = trimmed.replace(/^[-•*]\s*/, '').trim();
                                
                                if (!cleanText) return null;
                                
                                return (
                                  <div key={i} className={`flex items-start gap-1.5 ${isBullet ? 'pl-2' : 'mt-1'}`}>
                                    {isBullet && <div className="w-1 h-1 rounded-full bg-slate-400 shrink-0 mt-1.5" />}
                                    <span className={isBullet ? 'text-slate-600' : 'text-slate-800 font-bold'}>{cleanText}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions B2B Flow */}
                    <div className="flex flex-col gap-2 shrink-0 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 w-full sm:w-[140px]">
                       {/* Direct Call */}
                       <a 
                          href={telHref ?? '#'}
                          className={`flex items-center justify-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-lg border transition-all ${
                            telHref
                            ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                            : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                          }`}
                          onClick={(e) => !telHref && e.preventDefault()}
                          {...(telHref ? {} : { 'aria-disabled': true })}
                       >
                          <PhoneCall size={14} /> Llamar
                       </a>

                       {/* Direct Mail (Primary) */}
                       <a 
                          href={mailHref ?? '#'}
                          className={`flex items-center justify-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-sm ${
                            mailHref
                            ? 'bg-klein-600 text-white hover:bg-klein-700 shadow-klein-600/20'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
                          }`}
                          onClick={(e) => !mailHref && e.preventDefault()}
                          {...(mailHref ? {} : { 'aria-disabled': true })}
                       >
                          <Mail size={14} /> Contactar
                       </a>

                       {/* E-Commerce / search fallback */}
                       <a
                           href={providerWebUrl ?? '#'}
                           target={providerWebUrl ? '_blank' : undefined}
                           rel={providerWebUrl ? 'noopener noreferrer' : undefined}
                           title={providerWebUrl ? 'Abrir web del proveedor' : 'Sin web disponible'}
                           className={`flex items-center justify-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all border ${
                             providerWebUrl
                               ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                             : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                           }`}
                           onClick={(e) => !providerWebUrl && e.preventDefault()}
                           {...(providerWebUrl ? {} : { 'aria-disabled': true })}
                       >
                          <Globe size={14} /> Web
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
