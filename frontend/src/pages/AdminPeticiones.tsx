import { useState, useEffect } from 'react';
import { ClipboardList, Search, Eye, X, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface Peticion {
    id: number;
    clinica: number;
    usuario: number;
    clinica_nombre?: string;
    usuario_nombre?: string;
    usuario_email?: string;
    producto_valorado: string;
    marca_referencia: string;
    plazo_entrega: string;
    forma_pago: string;
    precio_referencia: string;
    fecha_creacion: string;
    estado: 'Pendiente' | 'En Gestión' | 'Finalizado';
}

const AdminPeticiones = () => {
    const [peticiones, setPeticiones] = useState<Peticion[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPeticion, setSelectedPeticion] = useState<Peticion | null>(null);

    const fetchPeticiones = async () => {
        try {
            setLoading(true);
            const response = await api.get('/compras/peticiones-presupuesto/');
            setPeticiones(response.data);
        } catch (error) {
            console.error('Error fetching peticiones:', error);
            toast.error('Error al cargar las peticiones');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPeticiones();
    }, []);

    const handleStatusChange = async (id: number, currentStatus: string) => {
        const nextStatus = currentStatus === 'Pendiente' ? 'En Gestión' : 'Finalizado';
        if (currentStatus === 'Finalizado') return;

        try {
            await api.patch(`/compras/peticiones-presupuesto/${id}/`, { estado: nextStatus });
            toast.success(`Estado actualizado a ${nextStatus}`);
            // Update local state and selected modal state
            setPeticiones(prev => prev.map(p => p.id === id ? { ...p, estado: nextStatus as any } : p));
            if (selectedPeticion?.id === id) {
                setSelectedPeticion(prev => prev ? { ...prev, estado: nextStatus as any } : null);
            }
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Error al actualizar el estado');
        }
    };

    const filteredPeticiones = peticiones.filter(p =>
        p.producto_valorado.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.marca_referencia?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Pendiente': return <Clock className="w-4 h-4 text-amber-500" />;
            case 'En Gestión': return <AlertCircle className="w-4 h-4 text-blue-500" />;
            case 'Finalizado': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            default: return null;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'Pendiente': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'En Gestión': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Finalizado': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-[#00a7e1]" />
                        Consultoría de Compras
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Gestiona las solicitudes de presupuesto de las clínicas.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por producto o marca..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00a7e1]/20 focus:border-[#00a7e1] transition-all"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-slate-50/50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700">ID Clínica</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Producto</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Fecha</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Plazo</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Estado</th>
                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-[#00a7e1] border-t-transparent rounded-full animate-spin"></div>
                                            Cargando peticiones...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPeticiones.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                                        No hay peticiones que coincidan con la búsqueda.
                                    </td>
                                </tr>
                            ) : (
                                filteredPeticiones.map((peticion) => (
                                    <tr key={peticion.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedPeticion(peticion)}>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{peticion.clinica_nombre || `Clínica #${peticion.clinica}`}</div>
                                            <div className="text-xs text-slate-500">{peticion.usuario_nombre || `Usuario #${peticion.usuario}`}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900 truncate max-w-[200px]">{peticion.producto_valorado}</div>
                                            {peticion.marca_referencia && (
                                                <div className="text-xs text-slate-500">Marca: {peticion.marca_referencia}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {new Date(peticion.fecha_creacion).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                {peticion.plazo_entrega}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyle(peticion.estado)}`}>
                                                {getStatusIcon(peticion.estado)}
                                                {peticion.estado}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedPeticion(peticion);
                                                }}
                                                className="p-2 text-slate-400 hover:text-[#00a7e1] hover:bg-[#00a7e1]/10 rounded-lg transition-colors"
                                                title="Ver Detalle"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedPeticion && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setSelectedPeticion(null)}
                    />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-[#00a7e1]" />
                                Detalle de Petición #{selectedPeticion.id}
                            </h3>
                            <button
                                onClick={() => setSelectedPeticion(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Clínica</p>
                                    <p className="text-slate-900 font-medium">{selectedPeticion.clinica_nombre || `Clínica #${selectedPeticion.clinica}`}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Fecha de Solicitud</p>
                                    <p className="text-slate-900 font-medium">{new Date(selectedPeticion.fecha_creacion).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Solicitante</p>
                                    <p className="text-slate-900 font-medium">{selectedPeticion.usuario_nombre || `Usuario #${selectedPeticion.usuario}`}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Email</p>
                                    <p className="text-slate-900 font-medium break-all">{selectedPeticion.usuario_email || 'No disponible'}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Producto Valorado</p>
                                <p className="text-slate-900 font-medium text-lg">{selectedPeticion.producto_valorado}</p>
                                {selectedPeticion.marca_referencia && (
                                    <p className="text-slate-600 mt-1">Marca deseada: {selectedPeticion.marca_referencia}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Plazo de Entrega</p>
                                    <span className="inline-flex px-2.5 py-1 rounded-md text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                        {selectedPeticion.plazo_entrega}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Forma de Pago</p>
                                    <span className="inline-flex px-2.5 py-1 rounded-md text-sm font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                        {selectedPeticion.forma_pago}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    Referencia de Precio Actual
                                </p>
                                <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 text-amber-900 whitespace-pre-wrap">
                                    {selectedPeticion.precio_referencia || 'No se ha indicado un precio de referencia.'}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusStyle(selectedPeticion.estado)}`}>
                                {getStatusIcon(selectedPeticion.estado)}
                                Estado actual: {selectedPeticion.estado}
                            </div>
                            
                            {selectedPeticion.estado !== 'Finalizado' && (
                                <button
                                    onClick={() => handleStatusChange(selectedPeticion.id, selectedPeticion.estado)}
                                    className="px-4 py-2 bg-[#00a7e1] text-white font-medium rounded-xl hover:bg-[#008fbf] hover:shadow-md hover:shadow-[#00a7e1]/20 transition-all active:scale-95"
                                >
                                    Mover a {selectedPeticion.estado === 'Pendiente' ? 'En Gestión' : 'Finalizado'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPeticiones;
