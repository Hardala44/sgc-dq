import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { ShoppingCart, Send, Loader2, CheckCircle2, ChevronDown } from 'lucide-react';

interface SolicitudPresupuestoCardProps {
    onCloseModal?: () => void;
    isModal?: boolean;
}

const SolicitudPresupuestoCard: React.FC<SolicitudPresupuestoCardProps> = ({ onCloseModal, isModal }) => {
    const [formData, setFormData] = useState({
        producto: '',
        marca_referencia: '',
        plazo_entrega: 'Lo antes posible',
        forma_pago: 'Indiferente',
        referencia_precio: '',
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/compras/peticiones-presupuesto/', formData);
            setSuccess(true);
            toast.success('Solicitud enviada, nos pondremos en contacto contigo en breve');
            setFormData({
                producto: '',
                marca_referencia: '',
                plazo_entrega: 'Lo antes posible',
                forma_pago: 'Indiferente',
                referencia_precio: '',
            });
            setTimeout(() => {
                setSuccess(false);
                if (onCloseModal) onCloseModal();
            }, 8000);
        } catch {
            toast.error('Hubo un error al enviar la solicitud');
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className={`bg-white ${isModal ? 'rounded-[2rem] shadow-2xl border border-slate-200/80' : 'rounded-[1.75rem] shadow-sm border border-slate-200'} p-6 md:p-8`}>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-klein-50 text-klein-600 flex items-center justify-center shrink-0">
                    <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">¿Pensando en una nueva compra?</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Cuéntanos qué necesitas y negociaremos las mejores condiciones para tu clínica
                    </p>
                </div>
            </div>

            {success ? (
                <div className="bg-emerald-50 rounded-2xl p-8 border border-emerald-100 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-300">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
                    <h3 className="text-lg font-bold text-emerald-900 mb-2">Solicitud enviada con éxito</h3>
                    <p className="text-sm text-emerald-700 max-w-sm">
                        Hemos recibido tu solicitud. Nos pondremos en contacto contigo en breve con la mejor propuesta.
                    </p>
                    <button
                        onClick={() => setSuccess(false)}
                        className="mt-6 text-emerald-600 text-sm font-semibold hover:text-emerald-700"
                    >
                        Enviar nueva solicitud
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">¿Qué estás valorando comprar?</label>
                            <input
                                required
                                type="text"
                                placeholder="Ej. Escáner intraoral, Autoclave..."
                                value={formData.producto}
                                onChange={(e) => setFormData({ ...formData, producto: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a7e1]/20 focus:border-[#00a7e1] transition-all text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Marca o referencia (si la tienes)</label>
                            <input
                                type="text"
                                placeholder="Ej: 3Shape TRIOS 5, Adec 500..."
                                value={formData.marca_referencia}
                                onChange={(e) => setFormData({ ...formData, marca_referencia: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a7e1]/20 focus:border-[#00a7e1] transition-all text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Plazo de entrega requerido</label>
                            <div className="relative">
                                <select
                                    value={formData.plazo_entrega}
                                    onChange={(e) => setFormData({ ...formData, plazo_entrega: e.target.value })}
                                    className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a7e1]/20 focus:border-[#00a7e1] transition-all text-sm appearance-none cursor-pointer"
                                >
                                    <option value="Urgente">Urgente</option>
                                    <option value="Lo antes posible">Lo antes posible</option>
                                    <option value="No es importante">No es importante</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Forma de pago preferida</label>
                            <div className="relative">
                                <select
                                    value={formData.forma_pago}
                                    onChange={(e) => setFormData({ ...formData, forma_pago: e.target.value })}
                                    className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a7e1]/20 focus:border-[#00a7e1] transition-all text-sm appearance-none cursor-pointer"
                                >
                                    <option value="Contado">Contado</option>
                                    <option value="Financiación/Renting/Leasing">Financiación/Renting/Leasing</option>
                                    <option value="Indiferente">Indiferente</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700">Referencia de precio actual</label>
                        <textarea
                            rows={3}
                            placeholder=""
                            value={formData.referencia_precio}
                            onChange={(e) => setFormData({ ...formData, referencia_precio: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00a7e1]/20 focus:border-[#00a7e1] transition-all text-sm resize-none"
                        ></textarea>
                        <p className="text-xs text-slate-500 mt-1">Si dispones de alguna oferta o referencia de precio, indícala aquí. Esta información es clave para poder negociar mejores condiciones para ti y para el grupo.</p>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center gap-2 bg-[#00a7e1] hover:bg-[#008bc0] disabled:opacity-70 text-white text-sm font-bold px-6 py-3 rounded-xl transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00a7e1] focus:ring-offset-2"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {loading ? 'Enviando...' : 'Enviar solicitud'}
                        </button>
                    </div>
                </form>
            )}
        </section>
    );
};

export default SolicitudPresupuestoCard;
