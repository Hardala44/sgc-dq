// import React from 'react';

interface Product {
    id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    imagen?: string;
    proveedor?: {
        nombre: string;
    };
    ahorro?: number;
}

interface ProductCardProps {
    product: Product;
    onAddToCart?: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
    // Mock market price for demo purposes (Price * 1.2)
    const marketPrice = (product.precio * 1.2).toFixed(2);

    return (
        <article className="bg-white border border-slate-100 rounded-[1.5rem] p-5 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] hover:border-klein-500/20 transition-all duration-300 flex flex-col h-full group relative overflow-hidden">
            {/* Discount Badge */}
            {product.ahorro && (
                <div className="absolute top-0 right-0 bg-klein-500 text-white text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-bl-xl z-10 shadow-sm">
                    AHORRA {product.ahorro}%
                </div>
            )}

            <div className="flex-1 space-y-4">
                {/* Image */}
                <div className="h-32 bg-[#F7F7F7] rounded-xl overflow-hidden relative flex-shrink-0 group-hover:bg-klein-50/50 transition-colors duration-300">
                    {product.imagen ? (
                        <img
                            src={product.imagen}
                            alt={product.nombre}
                            loading="lazy"
                            className="w-full h-full object-contain p-3 mix-blend-multiply group-hover:scale-105 transition-transform duration-500"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-[10px] font-bold tracking-widest uppercase">Sin imagen</div>
                    )}
                </div>

                {/* Content */}
                <div>
                    <h3 className="text-sm font-bold text-black leading-tight line-clamp-2 min-h-[2.5rem] group-hover:text-klein-600 transition-colors duration-300">
                        {product.nombre}
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 truncate uppercase tracking-widest font-bold">
                        {product.proveedor?.nombre || 'Proveedor Directo'}
                    </p>
                </div>
            </div>

            {/* Price Action */}
            <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-400 line-through decoration-slate-300 font-medium">
                            {marketPrice}€
                        </span>
                        <span className="text-lg font-bold text-klein-600 leading-none mt-0.5">
                            {product.precio}€
                        </span>
                    </div>
                    <button
                        onClick={() => onAddToCart && onAddToCart(product)}
                        className="bg-klein-500 text-white text-[10px] uppercase tracking-widest font-bold px-4 py-2 rounded-lg hover:bg-klein-600 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                    >
                        Comprar
                    </button>
                </div>
            </div>
        </article>
    );
};

export default ProductCard;
