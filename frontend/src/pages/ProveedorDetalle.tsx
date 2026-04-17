
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Phone, Mail, Building2, ExternalLink, FileText, Star } from 'lucide-react';

interface ProveedorDetail {
    id: number;
    nombre: string;
    descripcion_larga: string;
    condiciones_especiales: string;
    contacto_nombre: string;
    contacto_email: string;
    contacto_telefono: string;
    categorias: string[];
    es_estrategico: boolean;
    logo: string | null;
    url_web: string;
}

const ProveedorDetalle = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [proveedor, setProveedor] = useState<ProveedorDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const response = await api.get(`/proveedores/${id}/`);
                setProveedor(response.data);
            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };
        if (id) fetchDetail();
    }, [id]);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (!proveedor) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
            <h2 className="text-2xl font-bold">Proveedor no encontrado</h2>
            <button onClick={() => navigate('/proveedores')} className="text-blue-600 hover:underline">
                Volver a la lista
            </button>
        </div>
    );

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Header / Hero */}
            <div className="bg-white border-b border-gray-200">
                <div className="container mx-auto px-6 py-12">
                    <button
                        onClick={() => navigate('/proveedores')}
                        className="flex items-center gap-2 text-gray-500 hover:text-black mb-8 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        Volver a proveedores
                    </button>

                    <div className="flex flex-col md:flex-row items-start gap-8">
                        <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl flex items-center justify-center shrink-0">
                            {proveedor.logo ? (
                                <img src={proveedor.logo} alt={proveedor.nombre} className="w-16 h-16 object-contain" />
                            ) : (
                                <span className="text-3xl font-bold text-blue-600">
                                    {proveedor.nombre.substring(0, 2).toUpperCase()}
                                </span>
                            )}
                        </div>

                        <div className="flex-1">
                            <div className="flex items-center gap-4 mb-2">
                                <h1 className="text-4xl font-bold text-black">{proveedor.nombre}</h1>
                                {proveedor.es_estrategico && (
                                    <span className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                                        <Star size={12} fill="currentColor" />
                                        Estratégico
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 text-gray-600 mb-6">
                                {proveedor.categorias.map((cat, idx) => (
                                    <span key={idx} className="bg-gray-100 px-3 py-1 rounded-lg text-sm">
                                        {cat}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-12">

                        {/* Description */}
                        <section className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <FileText className="text-blue-600" size={24} />
                                Descripción
                            </h2>
                            <div className="prose prose-blue max-w-none text-gray-600 leading-relaxed whitespace-pre-line">
                                {proveedor.descripcion_larga || "No hay descripción disponible para este proveedor."}
                            </div>
                        </section>

                        {/* Conditions */}
                        <section className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Building2 className="text-blue-600" size={24} />
                                Condiciones Especiales
                            </h2>
                            <div className="bg-blue-50 rounded-2xl p-6 text-blue-900 leading-relaxed whitespace-pre-line border border-blue-100">
                                {proveedor.condiciones_especiales || "No se han especificado condiciones especiales."}
                            </div>
                        </section>

                    </div>

                    {/* Sidebar / Contact */}
                    <div className="space-y-8">
                        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm sticky top-8">
                            <h3 className="text-lg font-bold mb-6">Información de Contacto</h3>

                            <div className="space-y-6">
                                {proveedor.contacto_nombre && (
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Contacto Comercial</p>
                                        <p className="font-medium text-black">{proveedor.contacto_nombre}</p>
                                    </div>
                                )}

                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Teléfono</p>
                                    <a href={`tel:${proveedor.contacto_telefono}`} className="flex items-center gap-3 text-lg font-semibold text-blue-600 hover:underline">
                                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                                            <Phone size={20} />
                                        </div>
                                        {proveedor.contacto_telefono}
                                    </a>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2">Email Pedidos</p>
                                    <a href={`mailto:${proveedor.contacto_email}`} className="flex items-center gap-3 text-lg font-semibold text-blue-600 hover:underline break-all">
                                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
                                            <Mail size={20} />
                                        </div>
                                        {proveedor.contacto_email}
                                    </a>
                                </div>

                                {proveedor.url_web && (
                                    <div className="pt-6 border-t border-gray-100">
                                        <a
                                            href={proveedor.url_web}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full flex items-center justify-center gap-2 bg-black text-white px-4 py-3 rounded-xl hover:bg-gray-800 transition-colors font-semibold"
                                        >
                                            <ExternalLink size={18} />
                                            Visitar Web
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ProveedorDetalle;
