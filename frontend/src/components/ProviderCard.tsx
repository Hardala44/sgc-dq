import React, { useState } from 'react';
import { PhoneCall, Mail, Globe, Package } from 'lucide-react';

interface ProviderCardProps {
  proveedor: {
    id: string | number;
    nombre: string;
    descripcion_larga: string;
    url_catalogo: string;
    codigo_descuento: string;
    tipo_interaccion: 'link' | 'lead_form';
    /** Categorías maestras (strings) — internal Excel tags hidden from UI */
    categorias: string[];
    /** Categoría principal visible (from financial Excel sync) */
    categoria_principal?: string | null;
    /** Savings ratio, e.g. 0.15 means 15% */
    ahorro_estimado?: number | string | null;
    /** Count of distinct marketplace product lines */
    num_lineas_producto?: number;
    contacto_nombre?: string;
    contacto_telefono?: string;
    contacto_email?: string;
    url_web?: string;
    logo_url?: string;
    condiciones_especiales?: string;
  };
  onVerCatalogo?: (id: string | number) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formats a savings ratio (0.15) → "15%"
 */
function formatSavings(raw: number | string | null | undefined): string | null {
  if (raw == null || raw === '') return null;
  const n = typeof raw === 'string' ? parseFloat(raw) : raw;
  if (isNaN(n) || n <= 0) return null;
  // If stored as 0-1 range convert; if > 1 assume already a percentage
  const pct = n <= 1 ? n * 100 : n;
  return `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1)}%`;
}

// ── Component ─────────────────────────────────────────────────────────────────

const ProviderCard: React.FC<ProviderCardProps> = ({ proveedor }) => {

  // ── Logo resolution with 2-level fallback ──────────────────────────────────
  const getDomain = () => {
    if (proveedor.contacto_email?.includes('@')) {
      return proveedor.contacto_email.split('@')[1];
    }
    if (proveedor.url_web) {
      return proveedor.url_web.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    }
    return '';
  };

  const domain = getDomain();
  const [logoErrorLevel, setLogoErrorLevel] = useState(0);
  const [lastDomain, setLastDomain] = useState(domain);

  if (domain !== lastDomain) {
    setLastDomain(domain);
    setLogoErrorLevel(0);
  }

  const externalLogo = proveedor.logo_url || null;
  const logoSrc = externalLogo
    ? externalLogo
    : domain
    ? logoErrorLevel === 0
      ? `https://logo.clearbit.com/${domain}`
      : logoErrorLevel === 1
      ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
      : null
    : null;

  const handleLogoError = () => setLogoErrorLevel((l) => Math.min(l + 1, 2));

  // ── Derived values ─────────────────────────────────────────────────────────
  const savingsLabel = formatSavings(proveedor.ahorro_estimado);
  const numLineas    = proveedor.num_lineas_producto ?? 0;
  const initial      = proveedor.nombre.charAt(0).toUpperCase();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="
      relative bg-white rounded-2xl overflow-hidden border border-slate-200/80
      shadow-sm hover:shadow-xl hover:-translate-y-1
      transition-all duration-300 flex flex-col h-full group
    ">

      {/* ── Savings Badge ──────────────────────────────────────────────── */}
      {savingsLabel && (
        <div className="absolute top-3 right-3 z-10">
          <span className="
            inline-flex items-center gap-1 px-2.5 py-1
            bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest
            rounded-full shadow-md shadow-emerald-200
          ">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
              <path d="M4 0L5.5 2.5H8L5.75 4.25L6.5 7L4 5.5L1.5 7L2.25 4.25L0 2.5H2.5L4 0Z"/>
            </svg>
            Acuerdo DQ: {savingsLabel} Dto.
          </span>
        </div>
      )}

      {/* ── Logo area ──────────────────────────────────────────────────── */}
      <div className="
        flex items-center justify-center h-32 px-6 pt-6 pb-4
        bg-gradient-to-b from-slate-50 to-white
      ">
        {logoSrc && logoErrorLevel < 2 ? (
          <img
            src={logoSrc}
            alt={`Logo de ${proveedor.nombre}`}
            loading="lazy"
            className="max-h-16 max-w-[75%] object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
            onError={handleLogoError}
          />
        ) : (
          <div className="
            h-16 w-16 rounded-2xl
            bg-gradient-to-br from-klein-100 to-slate-100
            flex items-center justify-center
            text-2xl font-black text-klein-600 shadow-inner
          ">
            {initial}
          </div>
        )}
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex-grow flex flex-col px-5 pb-4">

        {/* Name */}
        <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug text-center mb-1">
          {proveedor.nombre}
        </h3>

        {/* Product lines counter — replaces the internal Excel category tag */}
        {numLineas > 0 && (
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <Package size={12} className="text-klein-500 flex-shrink-0" />
            <span className="text-[11px] font-semibold text-klein-600 tracking-tight">
              {numLineas} {numLineas === 1 ? 'línea de producto disponible' : 'líneas de producto disponibles'}
            </span>
          </div>
        )}

        {/* Description */}
        <p className="text-slate-500 text-xs leading-relaxed line-clamp-3 text-center mb-4 flex-grow">
          {proveedor.descripcion_larga || 'Proveedor verificado en la Red DentalQuality.'}
        </p>

        {/* Conditions List */}
        {proveedor.condiciones_especiales && (
          <div className="mt-4 border-t border-slate-100 pt-3 w-full text-left">
            <div className="flex flex-col gap-1.5 text-[11px] text-slate-700 font-medium">
              {proveedor.condiciones_especiales.split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return null;
                
                const isBullet = /^[-•*]/.test(trimmed);
                const cleanText = trimmed.replace(/^[-•*]\s*/, '').trim();
                
                if (!cleanText) return null;
                
                return (
                  <div key={i} className={`flex items-start gap-2 ${isBullet ? 'pl-2' : 'mt-1'}`}>
                    {isBullet && <div className="w-1 h-1 rounded-full bg-slate-400 shrink-0 mt-[5px]" />}
                    <span className={isBullet ? 'text-slate-600 leading-tight' : 'text-slate-800 font-bold leading-snug'}>
                      {cleanText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer / Contactos ─────────────────────────────────────────── */}
      <div className="px-5 pb-5 pt-3 border-t border-slate-100 mt-auto">

        {/* Contact row */}
        <div className="flex items-center justify-center gap-3 mt-3">
          {proveedor.contacto_telefono && (
            <a
              href={`tel:${proveedor.contacto_telefono.replace(/ /g, '')}`}
              title={`Llamar: ${proveedor.contacto_telefono}`}
              className="
                flex items-center justify-center w-8 h-8 rounded-lg
                bg-slate-100 hover:bg-slate-200 text-slate-500
                transition-colors
              "
            >
              <PhoneCall size={14} />
            </a>
          )}
          {proveedor.contacto_email && (
            <a
              href={`mailto:${proveedor.contacto_email}`}
              title={proveedor.contacto_email}
              className="
                flex items-center justify-center w-8 h-8 rounded-lg
                bg-slate-100 hover:bg-slate-200 text-slate-500
                transition-colors
              "
            >
              <Mail size={14} />
            </a>
          )}
          {proveedor.url_web && (
            <a
              href={proveedor.url_web}
              target="_blank"
              rel="noopener noreferrer"
              title="Visitar sitio web"
              className="
                flex items-center justify-center w-8 h-8 rounded-lg
                bg-slate-100 hover:bg-slate-200 text-slate-500
                transition-colors
              "
            >
              <Globe size={14} />
            </a>
          )}
          {!proveedor.contacto_telefono && !proveedor.contacto_email && !proveedor.url_web && (
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              Perfil Verificado
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderCard;
