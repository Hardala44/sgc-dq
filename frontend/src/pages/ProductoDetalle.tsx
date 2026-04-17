import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, ShoppingCart } from 'lucide-react';

interface Product {
    id: number;
    nombre: string;
    descripcion: string;
    precio: number;
    imagen?: string;
    proveedor?: {
        id: number;
        nombre: string;
    };
    ahorro?: number;
}

const ProductoDetalle = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await api.get(`/productos/${id}/`);
                setProduct(response.data);
            } catch (err) {
                setError('Product not found');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    if (loading) return <div className="p-8 text-center">Loading...</div>;
    if (error || !product) return (
        <div className="p-8 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={() => navigate('/catalogo')} className="text-blue-600 hover:underline">Back to Catalog</button>
        </div>
    );

    return (
        <div className="container mx-auto p-6">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
                <ArrowLeft size={20} className="mr-2" /> Back
            </button>

            <div className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col md:flex-row">
                <div className="md:w-1/2 bg-gray-200 h-96 flex items-center justify-center">
                    {product.imagen ? (
                        <img src={product.imagen} alt={product.nombre} className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-gray-400 text-xl">No Image Available</span>
                    )}
                </div>
                <div className="p-8 md:w-1/2 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.nombre}</h1>
                            {product.ahorro && (
                                <span className="bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full text-sm">
                                    Save {product.ahorro}%
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 mb-6 uppercase tracking-wide">{product.proveedor?.nombre}</p>
                        <p className="text-gray-700 leading-relaxed mb-8">{product.descripcion}</p>
                    </div>

                    <div className="flex items-center justify-between border-t pt-6">
                        <span className="text-4xl font-bold text-gray-900">${product.precio}</span>
                        <button className="bg-blue-600 text-white px-8 py-3 rounded-full hover:bg-blue-700 transition flex items-center gap-2 font-semibold">
                            <ShoppingCart size={20} />
                            Add to Cart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductoDetalle;
