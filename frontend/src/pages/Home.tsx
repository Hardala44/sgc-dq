import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    Award,
    ArrowRight,
    Sparkles,
    X,
} from 'lucide-react';
import GlobalSearch from '../components/GlobalSearch';
import logoDQ from '../assets/logo-dq.png';
import { OfertaFlyerCard } from '../components/OfertaFlyerCard';
import LeadRequestModal from '../components/LeadRequestModal';
import { useAuth } from '../context/AuthContext';
import { useClinic } from '../context/ClinicContext';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';

interface Product {
    id: number;
    nombre: string;
    descripcion: string;
    precio?: number;
    imagen?: string;
    imagen_url?: string;
    proveedor_nombre?: string;
    proveedor?: {
        nombre: string;
    };
    ahorro?: number;
    url_destino?: string;
}

interface SearchProductSelection {
    id?: number;
}

interface SavingsByCategory {
    category_id: number;
    category_name: string;
    savings_amount: number;
}

interface ComplianceCategory {
    category_id: number;
    category_name: string;
    actual_spend: number;
    threshold: number;
    status: 'optimized' | 'potential';
    estimated_extra_saving_pct: number;
    alert_message: string | null;
}

interface HomeHighlights {
    period: {
        year: number;
        quarter: number;
        label: string;
    };
    facturacion_total?: number;
    facturacion_current_year?: number;
    savings: {
        lifetime_total: number;
        current_year_total: number;
        last_full_year_total: number;
        last_full_year: {
            year: number;
            total: number;
            by_category: SavingsByCategory[];
        };
        by_category: SavingsByCategory[];
    };
    compliance: {
        optimized_categories: ComplianceCategory[];
        potential_savings_categories: ComplianceCategory[];
        all_categories: ComplianceCategory[];
    };
}

const PIE_COLORS = ['#0f766e', '#10b981', '#34d399', '#6ee7b7', '#99f6e4', '#ccfbf1'];

const getOfferImageUrl = (imagen?: string) => {
    if (!imagen) return 'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=800&auto=format&fit=crop';
    if (imagen.startsWith('http')) return imagen;
    if (!imagen.startsWith('/media/')) return imagen;
    return `http://127.0.0.1:8000${imagen}`;
};

const Home = () => {
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const { activeClinicId } = useClinic();
    const [offers, setOffers] = useState<Product[]>([]);
    const [loadingOffers, setLoadingOffers] = useState(true);
    const [highlights, setHighlights] = useState<HomeHighlights | null>(null);
    const [loadingHighlights, setLoadingHighlights] = useState(true);
    const [isSavingsPanelOpen, setIsSavingsPanelOpen] = useState(false);
    const [selectedOferta, setSelectedOferta] = useState<Product | null>(null);
    const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
    const hasOffers = offers.length > 0;

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

    const savingsData = highlights?.savings;
    const lastFullYearSavings = savingsData?.last_full_year;
    const pieData = useMemo(
        () => (lastFullYearSavings?.by_category || []).filter((item) => item.savings_amount > 0).slice(0, 6),
        [lastFullYearSavings]
    );

    useEffect(() => {
        document.body.style.overflow = isSavingsPanelOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isSavingsPanelOpen]);

    useEffect(() => {
        const fetchOffers = async () => {
            try {
                const response = await api.get('/ofertas-destacadas/');
                setOffers(response.data.map((o: Product) => ({
                    ...o,
                    imagen: o.imagen_url || o.imagen,
                })));
            } catch (err) {
                console.error("Error fetching offers:", err);
                setOffers([]);
            } finally {
                setLoadingOffers(false);
            }
        };

        const fetchHighlights = async () => {
            try {
                const response = await api.get<HomeHighlights>('/analytics/home-highlights/', {
                    params: activeClinicId ? { clinic_id: activeClinicId } : undefined,
                });
                setHighlights(response.data);
            } catch (err) {
                console.error('Error fetching home highlights:', err);
            } finally {
                setLoadingHighlights(false);
            }
        };

        fetchOffers();

        if (activeClinicId) {
            fetchHighlights();
        }
    }, [activeClinicId]);

    const handleSearchSelection = (type: 'categoria' | 'proveedor' | 'oferta' | 'producto', item: unknown) => {
        if (type !== 'producto') {
            return;
        }

        const selectedProduct = item as SearchProductSelection;
        if (typeof selectedProduct.id !== 'number') {
            return;
        }

        navigate('/catalogo', {
            state: { openProductId: selectedProduct.id },
        });
    };

    return (
        <div className="space-y-6">
            {/* HEADER: Logo + Search */}
            <header className="flex items-center gap-4 pb-4 border-b border-slate-100">
                <img
                    src={logoDQ}
                    alt="Dental Quality"
                    className="h-12 object-contain select-none shrink-0"
                    style={{ mixBlendMode: 'multiply' }}
                />
                <div className="flex-1 ml-auto relative z-50">
                    <GlobalSearch onSelectResult={handleSearchSelection} />
                </div>
            </header>

            {/* KPI STRIP */}
            <section className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {/* Savings — dark premium card */}
                <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    onClick={() => setIsSavingsPanelOpen(true)}
                    className="md:col-span-3 text-left bg-navy-800 rounded-2xl px-6 py-5 group hover:bg-[#0d2d54] transition-colors duration-200 relative overflow-hidden"
                >
                    {/* Decorative blur circle */}
                    <div className="absolute top-0 right-0 w-52 h-52 bg-emerald-500/[0.06] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    <div className="relative flex items-center gap-5">
                        <div className="shrink-0 w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                            <Award className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.18em] mb-1">Ahorro en el último año</p>
                            <p className="text-[2rem] font-black text-white tracking-tight leading-none tabular-nums">
                                {loadingHighlights
                                    ? <span className="text-slate-600 text-2xl">Cargando…</span>
                                    : formatCurrency(lastFullYearSavings?.total || 0)
                                }
                            </p>
                        </div>
                        <div className="shrink-0 text-right">
                            {lastFullYearSavings?.year && (
                                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                                    {lastFullYearSavings.year}
                                </span>
                            )}
                            <span className="text-xs text-emerald-400 font-semibold group-hover:underline">
                                Ver desglose →
                            </span>
                        </div>
                    </div>
                </motion.button>

                {/* Consultancy */}
                {(!isAdmin || user?.rol === 'clinica') && (
                    <motion.button
                        type="button"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.07 }}
                        onClick={() => setIsLeadModalOpen(true)}
                        className="md:col-span-2 text-left bg-white rounded-2xl border border-slate-200 px-5 py-5 group hover:border-slate-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                    >
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] mb-1.5">Consultoría</p>
                            <p className="text-sm font-semibold text-slate-800 leading-snug">¿Necesitas asesoría en una compra?</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-xs text-slate-400">Respuesta en 24h</p>
                            <span className="inline-flex items-center gap-1.5 bg-slate-900 group-hover:bg-slate-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-colors">
                                Pedir asesoría <ArrowRight className="w-3 h-3" />
                            </span>
                        </div>
                    </motion.button>
                )}
            </section>

            {/* OFERTAS EXCLUSIVAS */}
            <section>
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-[3px] h-5 bg-slate-900 rounded-full" />
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-[0.12em]">Ofertas Exclusivas</h2>
                    </div>
                    <button
                        onClick={() => navigate('/catalogo')}
                        className="text-slate-400 text-xs font-semibold hover:text-slate-700 flex items-center gap-1.5 transition-colors"
                    >
                        Ver catálogo <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                {loadingOffers ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="bg-white h-52 rounded-2xl animate-pulse border border-slate-100" />
                        ))}
                    </div>
                ) : hasOffers ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-3">
                        {offers.map((offer) => (
                            <OfertaFlyerCard
                                key={offer.id}
                                offer={offer}
                                onClick={() => setSelectedOferta(offer)}
                                compact
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center bg-white rounded-2xl border border-slate-100">
                        <Sparkles className="w-8 h-8 text-slate-200" />
                        <p className="text-slate-400 text-sm font-medium">No hay ofertas activas en este momento.</p>
                        <button
                            onClick={() => navigate('/catalogo')}
                            className="text-xs font-bold text-klein-600 hover:underline"
                        >
                            Explorar el catálogo →
                        </button>
                    </div>
                )}
            </section>

            <AnimatePresence>
                {isSavingsPanelOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onClick={() => setIsSavingsPanelOpen(false)}
                            className="fixed inset-0 bg-slate-900/55 backdrop-blur-sm z-40"
                        />

                        <motion.aside
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                            className="fixed top-0 right-0 h-full w-full max-w-2xl bg-white border-l border-slate-200 z-50 shadow-2xl flex flex-col"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Detalle de ahorro"
                        >
                            <header className="p-6 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Detalle de Ahorro</p>
                                    <h2 className="text-2xl font-bold text-slate-900 mt-1">
                                        {formatCurrency(lastFullYearSavings?.total || 0)}
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Desglose estimado por categoría para {lastFullYearSavings?.year || 'el último año completo'}.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsSavingsPanelOpen(false)}
                                    className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors"
                                    aria-label="Cerrar panel de ahorro"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </header>

                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                <section>
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Ahorro por Categoría</h3>
                                    <div className="rounded-2xl border border-slate-200 p-4 space-y-5">
                                        <div className="h-64 w-full">
                                            {pieData.length > 0 ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart>
                                                        <Pie
                                                            data={pieData}
                                                            dataKey="savings_amount"
                                                            nameKey="category_name"
                                                            cx="50%"
                                                            cy="50%"
                                                            innerRadius={58}
                                                            outerRadius={88}
                                                            paddingAngle={2}
                                                        >
                                                            {pieData.map((entry, index) => (
                                                                <Cell key={entry.category_id} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip
                                                            formatter={(value) => formatCurrency(Number(value ?? 0))}
                                                            labelFormatter={(label) => `Categoría: ${label}`}
                                                        />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            ) : (
                                                <div className="h-full flex items-center justify-center text-sm text-slate-500">
                                                    No hay ahorro por categoría disponible.
                                                </div>
                                            )}
                                        </div>

                                        {pieData.length > 0 && (
                                            <div className="space-y-3">
                                                {pieData.map((category, index) => (
                                                    <article
                                                        key={category.category_id}
                                                        className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <span
                                                                className="w-3 h-3 rounded-full shrink-0"
                                                                style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                                                                aria-hidden="true"
                                                            />
                                                            <p className="text-sm font-semibold text-slate-900 truncate">{category.category_name}</p>
                                                        </div>
                                                        <p className="text-sm font-bold text-emerald-700 whitespace-nowrap">
                                                            {formatCurrency(category.savings_amount)}
                                                        </p>
                                                    </article>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </section>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
            <LeadRequestModal
                isOpen={isLeadModalOpen}
                onClose={() => setIsLeadModalOpen(false)}
                proveedor={null}
            />
            {/* LIGHTBOX MODAL PARA OFERTAS (FLYERS) */}
            <AnimatePresence>
                {selectedOferta && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 md:p-8"
                        onClick={() => setSelectedOferta(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-auto max-w-[94vw] max-h-[94vh] flex flex-col items-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setSelectedOferta(null)}
                                className="absolute -top-12 right-0 md:-right-12 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-2 transition-all"
                            >
                                <X className="w-8 h-8" />
                            </button>
                            
                            {/* Image Container */}
                            <div className="relative bg-white rounded-2xl overflow-hidden shadow-2xl w-auto max-w-[96vw] md:max-w-[94vw]">
                                <div className="overflow-auto bg-slate-100 flex items-center justify-center p-2 md:p-3 max-h-[90vh]">
                                    <img
                                        src={getOfferImageUrl(selectedOferta.imagen)}
                                        alt={selectedOferta.nombre}
                                        className="block w-auto max-w-full h-auto max-h-[88vh] object-contain"
                                    />
                                </div>

                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/80 via-slate-900/30 to-transparent p-3 md:p-4 flex items-end justify-end gap-3">
                                    <button
                                        onClick={() => {
                                            setSelectedOferta(null);
                                            if (selectedOferta.url_destino) {
                                                window.open(selectedOferta.url_destino, '_blank', 'noopener,noreferrer');
                                                return;
                                            }
                                            navigate('/catalogo');
                                        }}
                                        className="shrink-0 bg-klein-600 hover:bg-klein-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-all shadow-sm"
                                    >
                                        Ir al producto
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Home;


