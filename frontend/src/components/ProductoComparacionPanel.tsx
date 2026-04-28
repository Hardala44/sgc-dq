import React, { useEffect } from 'react';
import {
  X, ExternalLink, Tag, Building2,
  CheckCircle2, AlertTriangle, XCircle, HelpCircle,
  ShieldCheck, PhoneCall, Mail
} from 'lucide-react';
import type { ProductSearchResult, SupplierOffer } from '../types/marketplace';
import { STOCK_LABELS, isPlaceholderUrl } from '../utils/marketplace';
import CategoryIcon from './CategoryIcon';

/**
 * Resolves the best URL for the "Ir al Suministro" button.
 *
 * Strategy:
 *  1. If `url_compra` resolves to a page with a non-trivial path (i.e. it's
 *     an actual product page, not just the homepage), use it as-is.
 *  2. Otherwise build a search URL from the provider's base URL:
 *       <origin>/search?q=<linea_producto>
 *  3. If neither is available, return null (button will be disabled).
 */
function resolveSupplyUrl(
  oferta: SupplierOffer,
  linea_producto: string,
): string | null {
  const tryParse = (raw: string): URL | null => {
    try { return new URL(raw); } catch { return null; }
  };

  // 1. Valid product URL: non-empty url_compra with a meaningful path
  if (oferta.url_compra) {
    const parsed = tryParse(oferta.url_compra);
    if (parsed && parsed.pathname.replace(/\//g, '').length > 0) {
      return oferta.url_compra;
    }
  }

  // 2. Fallback: search URL built from the provider's base web URL
  const baseRaw = oferta.proveedor.url_web;
  if (baseRaw) {
    const base = tryParse(baseRaw.startsWith('http') ? baseRaw : `https://${baseRaw}`);
    if (base) {
      const searchTerm = linea_producto || oferta.proveedor.nombre;
      return `${base.origin}/search?q=${encodeURIComponent(searchTerm)}`;
    }
  }

  return null;
}

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

  const isPlaceholder = isPlaceholderUrl(producto.imagen_url);
  const suministros = producto.suministros || [];
  const lineaProducto = producto.linea_producto || producto.nombre;

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
              <div className="w-32 h-32 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden shadow-sm flex-shrink-0 flex items-center justify-center">
                {isPlaceholder ? (
                  <CategoryIcon categoryName={producto.categoria_nombre} size={40} />
                ) : (
                  <img
                    src={producto.imagen_url!}
                    alt={producto.nombre}
                    className="w-full h-full object-cover mix-blend-multiply"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                )}
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
              {suministros.map((oficial) => {
                const stockInfo = STOCK_LABELS[oficial.stock_status] ?? STOCK_LABELS.unknown;
                const prov = oficial.proveedor;
                const supplyUrl = resolveSupplyUrl(oficial, lineaProducto);
                const telHref = prov.contacto_telefono ? `tel:${prov.contacto_telefono}` : null;
                const mailHref = prov.contacto_email
                  ? `mailto:${prov.contacto_email}?subject=${encodeURIComponent(`Interés en producto: ${producto.nombre}`)}`
                  : null;

                return (
                  <div
                    key={oficial.id}
                    className="relative rounded-xl border border-slate-200 bg-white hover:border-klein-300 hover:shadow-md transition-all duration-300 p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between"
                  >
                    {/* Proveedor Base Info */}
                    <div className="flex items-center gap-4 flex-1">
                      {prov.logo ? (
                        <div className="w-12 h-12 rounded-full border border-slate-100 p-1 flex-shrink-0 relative">
                          <img
                            src={prov.logo}
                            alt={prov.nombre}
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
                           {prov.nombre}
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
                            {prov.contacto_nombre && (
                                <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                                   <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                                     Ref: <span className="text-slate-700">{prov.contacto_nombre}</span>
                                   </span>
                                </div>
                            )}
                        </div>
                      </div>
                    </div>

                    {/* Actions B2B Flow */}
                    <div className="flex items-center gap-2.5 shrink-0 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0">
                       {/* Direct Call */}
                       <a 
                          href={telHref ?? '#'}
                          className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-lg border transition-all ${
                            telHref
                            ? 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
                            : 'bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed'
                          }`}
                          onClick={(e) => !telHref && e.preventDefault()}
                          {...(telHref ? {} : { 'aria-disabled': true })}
                       >
                          <PhoneCall size={14} /> Llamar
                       </a>

                       {/* Direct Mail (Primary) */}
                       <a 
                          href={mailHref ?? '#'}
                          className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-sm ${
                            mailHref
                            ? 'bg-klein-600 text-white hover:bg-klein-700 shadow-klein-600/20'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          }`}
                          onClick={(e) => !mailHref && e.preventDefault()}
                          {...(mailHref ? {} : { 'aria-disabled': true })}
                       >
                          <Mail size={14} /> Contactar
                       </a>

                       {/* E-Commerce / search fallback */}
                       <a
                           href={supplyUrl ?? '#'}
                           target={supplyUrl ? '_blank' : undefined}
                           rel="noopener noreferrer"
                           title={supplyUrl ? 'Ver suministro en origen' : 'Sin enlace disponible'}
                           className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ml-1 border ${
                               supplyUrl
                               ? 'text-slate-400 hover:text-slate-700 hover:bg-slate-50 border-transparent hover:border-slate-200'
                               : 'text-slate-300 bg-slate-50 border-slate-100 cursor-not-allowed'
                           }`}
                           onClick={(e) => !supplyUrl && e.preventDefault()}
                           {...(supplyUrl ? {} : { 'aria-disabled': true })}
                       >
                          <ExternalLink size={16} />
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
