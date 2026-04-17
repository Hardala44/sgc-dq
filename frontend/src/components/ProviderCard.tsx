import React, { useState, useEffect } from 'react';
import { Copy, Check, PhoneCall, Mail, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProviderCardProps {
  proveedor: {
    id: string | number;
    nombre: string;
    descripcion_larga: string;
    url_catalogo: string;
    codigo_descuento: string;
    tipo_interaccion: 'link' | 'lead_form';
    categorias: string[];
    contacto_nombre?: string;
    contacto_telefono?: string;
    contacto_email?: string;
    url_web?: string;
    condiciones_especiales?: string;
  };
}

const ProviderCard: React.FC<ProviderCardProps> = ({ proveedor }) => {

  // Get domain for Clearbit logo
  const getDomain = () => {
    if (proveedor.contacto_email && proveedor.contacto_email.includes('@')) {
      return proveedor.contacto_email.split('@')[1];
    }
    if (proveedor.url_web) {
      return proveedor.url_web.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    }
    return '';
  };

  const domain = getDomain();
  
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [logoErrorLevel, setLogoErrorLevel] = useState<number>(0);

  useEffect(() => {
    if (domain) {
      setLogoSrc(`https://logo.clearbit.com/${domain}`);
      setLogoErrorLevel(0);
    } else {
      setLogoSrc(null);
    }
  }, [domain]);

  const handleLogoError = () => {
    if (logoErrorLevel === 0 && domain) {
      // Clearbit failed, try Google Favicon
      setLogoSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
      setLogoErrorLevel(1);
    } else {
      // Both failed, fallback to text avatar
      setLogoSrc(null);
    }
  };

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-slate-200 flex flex-col h-full group">
      
      {/* Header section with Centered Logo */}
      <div className="flex flex-col items-center justify-center mb-4 h-24 w-full">
        {logoSrc ? (
          <img 
            src={logoSrc} 
            alt={`Logo de ${proveedor.nombre}`} 
            loading="lazy" 
            className="max-h-16 max-w-[80%] object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
            onError={handleLogoError}
          />
        ) : (
          <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold text-2xl shadow-inner">
            {proveedor.nombre.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      <div className="flex-grow flex flex-col items-center text-center">
        <h3 className="text-lg font-bold text-slate-800 tracking-tight leading-tight mb-2">{proveedor.nombre}</h3>
        
        <p className="text-slate-600 text-sm font-light tracking-tight leading-relaxed line-clamp-3 mb-5">
          {proveedor.descripcion_larga || 'Experiencia y profesionalidad garantizada en The Dental Quality Network.'}
        </p>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-100 w-full">
        <div className="flex flex-col gap-2.5">
          
          {proveedor.condiciones_especiales && (
            <div className="flex flex-col bg-sky-50 px-3 py-2.5 rounded-lg border border-sky-100 mb-2 items-center text-center">
              <span className="text-[10px] text-sky-600/80 font-bold tracking-wider uppercase mb-0.5">Condiciones Dental Quality</span>
              <span className="text-xs font-semibold text-sky-900 leading-tight">
                {proveedor.condiciones_especiales}
              </span>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex flex-col gap-2 w-full">
            {proveedor.contacto_telefono && (
              <a
                href={`tel:${proveedor.contacto_telefono.replace(/ /g, '')}`}
                className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                <PhoneCall size={14} className="text-slate-400" /> Llamar: {proveedor.contacto_telefono}
              </a>
            )}
            
            {proveedor.contacto_email && (
              <a
                href={`mailto:${proveedor.contacto_email}`}
                className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                <Mail size={14} className="text-slate-400" /> Correo: {proveedor.contacto_email}
              </a>
            )}

            {proveedor.url_web && (
              <a
                href={proveedor.url_web}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 hover:bg-slate-50 border border-transparent text-slate-500 hover:text-slate-700 text-[11px] uppercase tracking-widest font-bold rounded-lg transition-colors mt-1"
              >
                <Globe size={12} /> Visitar sitio web
              </a>
            )}
          </div>
          
          {!proveedor.contacto_telefono && !proveedor.contacto_email && !proveedor.url_web && (
               <div className="text-center text-slate-400 text-[10px] uppercase tracking-widest font-bold py-3 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                   Perfil Verificado
               </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

export default ProviderCard;
