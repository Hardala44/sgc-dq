import React from 'react';
import { Maximize2 } from 'lucide-react';

interface Product {
    id: number;
    nombre: string;
    descripcion: string;
    precio?: number;
    imagen?: string;
    proveedor_nombre?: string;
    proveedor_logo?: string;
}

interface OfertaFlyerCardProps {
    offer: Product;
    onClick: () => void;
    /** When true, renders a smaller card for dense grids (4-5 columns) */
    compact?: boolean;
}

const getImageUrl = (imagen?: string) => {
    if (!imagen) return 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=800&auto=format&fit=crop';
    if (imagen.startsWith('http')) return imagen;
    if (!imagen.startsWith('/media/')) return imagen;
    return `http://127.0.0.1:8000${imagen}`;
};

export const OfertaFlyerCard: React.FC<OfertaFlyerCardProps> = ({ offer, onClick, compact = false }) => {
    return (
        <div 
            onClick={onClick}
            className={`group relative bg-white overflow-hidden border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-zoom-in flex flex-col h-full ${
                compact ? 'rounded-xl' : 'rounded-2xl'
            }`}
        >
            {/* Flyer Image Container */}
            <div className={`relative w-full bg-slate-50 flex items-center justify-center ${
                compact ? 'aspect-[4/5] p-1.5' : 'aspect-[3/4] p-2'
            }`}>
                <img 
                    src={getImageUrl(offer.imagen)} 
                    alt={offer.nombre} 
                    className="w-full h-full object-contain mix-blend-multiply"
                    loading="lazy"
                />
                
                {/* Overlay on hover for visual feedback */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 flex items-center justify-center">
                    <div className={`bg-white/90 backdrop-blur-sm text-slate-800 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg scale-90 group-hover:scale-100 ${
                        compact ? 'p-2' : 'p-3'
                    }`}>
                        <Maximize2 className={compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} />
                    </div>
                </div>
                
                {/* Provider Badge (if any) */}
                {offer.proveedor_logo && (
                    <div className={`absolute bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-slate-100 ${
                        compact ? 'top-2 left-2 p-1' : 'top-4 left-4 p-1.5'
                    }`}>
                        <img 
                            src={offer.proveedor_logo.startsWith('http') ? offer.proveedor_logo : `http://127.0.0.1:8000${offer.proveedor_logo}`} 
                            alt={offer.proveedor_nombre} 
                            className={compact ? 'h-4 w-auto object-contain' : 'h-6 w-auto object-contain'}
                        />
                    </div>
                )}
            </div>

            {/* Flyer Details - Footer */}
            <div className={`border-t border-slate-100 bg-white ${
                compact ? 'px-2.5 py-2' : 'p-4'
            }`}>
                <p className={`font-bold uppercase tracking-widest text-klein-600 ${
                    compact ? 'text-[9px] mb-0.5' : 'text-xs mb-1'
                }`}>Oferta Exclusiva</p>
                <h3 className={`font-bold text-slate-900 line-clamp-2 leading-snug ${
                    compact ? 'text-xs' : 'text-sm'
                }`}>{offer.nombre}</h3>
                {offer.proveedor_nombre && (
                    <p className={`text-slate-500 line-clamp-1 ${
                        compact ? 'text-[10px] mt-0.5' : 'text-xs mt-1'
                    }`}>{offer.proveedor_nombre}</p>
                )}
            </div>
        </div>
    );
};
