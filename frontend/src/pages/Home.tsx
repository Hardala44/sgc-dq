import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    Award,
    ArrowRight,
    Sparkles,
    Trophy,
    ShieldCheck,
    AlertTriangle,
    X,
    CircleDollarSign,
} from 'lucide-react';
import GlobalSearch from '../components/GlobalSearch';
import ProductCard from '../components/ProductCard';
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
    precio: number;
    imagen?: string;
    proveedor?: {
        nombre: string;
    };
    ahorro?: number;
}

interface SearchProductSelection {
    id?: number;
}

interface SavingsByCategory {
    category_id: number;
    category_name: string;
    savings_amount: number;
}

interface SavingsByProvider {
    provider_id: string | null;
    provider_name: string;
    logo_url: string | null;
    estimated_rate_pct: number;
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
    savings: {
        lifetime_total: number;
        current_year_total: number;
        by_category: SavingsByCategory[];
        by_provider: SavingsByProvider[];
    };
    compliance: {
        optimized_categories: ComplianceCategory[];
        potential_savings_categories: ComplianceCategory[];
        all_categories: ComplianceCategory[];
    };
}

const PIE_COLORS = ['#0f766e', '#10b981', '#34d399', '#6ee7b7', '#99f6e4', '#ccfbf1'];

const Home = () => {
    const navigate = useNavigate();
    const [offers, setOffers] = useState<Product[]>([]);
    const [loadingOffers, setLoadingOffers] = useState(true);
    const [highlights, setHighlights] = useState<HomeHighlights | null>(null);
    const [loadingHighlights, setLoadingHighlights] = useState(true);
    const [isSavingsPanelOpen, setIsSavingsPanelOpen] = useState(false);
    const hasOffers = offers.length > 0;

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
    const formatPercent = (value: number) => `${value.toFixed(1)}%`;

    const savingsData = highlights?.savings;
    const complianceData = highlights?.compliance;

    const optimizedCategories = complianceData?.optimized_categories || [];
    const potentialCategories = complianceData?.potential_savings_categories || [];

    const recoveryRatio = useMemo(() => {
        if (!savingsData) {
            return 0;
        }
        const lifetime = savingsData.lifetime_total || 0;
        const annual = savingsData.current_year_total || 0;
        return Math.min(1, annual / Math.max(lifetime, 1));
    }, [savingsData]);

    const pieData = useMemo(
        () => (savingsData?.by_category || []).filter((item) => item.savings_amount > 0).slice(0, 6),
        [savingsData]
    );

    const providerList = useMemo(
        () => (savingsData?.by_provider || []).filter((item) => item.savings_amount > 0).slice(0, 10),
        [savingsData]
    );

    const loyaltyProgress = 83;

    useEffect(() => {
        document.body.style.overflow = isSavingsPanelOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isSavingsPanelOpen]);

    useEffect(() => {
        const fetchOffers = async () => {
            try {
                const response = await api.get('/productos/');
                const productsWithSavings = response.data.slice(0, 3).map((p: { ahorro?: number; [key: string]: unknown }) => ({
                    ...p,
                    ahorro: p.ahorro || Math.floor(Math.random() * 20) + 10
                }));
                setOffers(productsWithSavings);
            } catch (err) {
                console.error("Error fetching offers:", err);
            } finally {
                setLoadingOffers(false);
            }
        };

        const fetchHighlights = async () => {
            try {
                const response = await api.get<HomeHighlights>('/analytics/home-highlights/');
                setHighlights(response.data);
            } catch (err) {
                console.error('Error fetching home highlights:', err);
            } finally {
                setLoadingHighlights(false);
            }
        };

        fetchOffers();
        fetchHighlights();
    }, []);

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
        <div className="space-y-16">
            {/* HER0 & SEARCH */}
            <section className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pt-4">
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black flex items-center gap-3">
                        Bienvenido de nuevo 👋
                    </h1>
                    <p className="text-slate-500 mt-3 font-medium text-lg">
                        Tu panel de control de compras y ahorros.
                    </p>
                </div>
                <div className="w-full md:w-[450px] relative z-50">
                    <GlobalSearch onSelectResult={handleSearchSelection} />
                </div>
            </section>

            {/* TOP KPIS */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    onClick={() => setIsSavingsPanelOpen(true)}
                    className="md:col-span-2 text-left bg-white rounded-[1.75rem] p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center gap-6 hover:shadow-md hover:border-emerald-300 transition-all duration-300"
                >
                    <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="transparent" className="stroke-slate-100" strokeWidth="8" />
                            <circle
                                cx="50"
                                cy="50"
                                r="45"
                                fill="transparent"
                                className="stroke-emerald-500 transition-all duration-1000 ease-out"
                                strokeWidth="8"
                                strokeDasharray="283"
                                strokeDashoffset={283 * (1 - recoveryRatio)}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Award className="w-7 h-7 text-emerald-600" />
                        </div>
                    </div>
                    <div className="w-full">
                        <div className="flex items-start justify-between gap-3">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Ahorro Acumulado Total</h3>
                            <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 border border-emerald-100">
                                Año actual: {loadingHighlights ? '...' : formatCurrency(savingsData?.current_year_total || 0)}
                            </span>
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{loadingHighlights ? '...' : formatCurrency(savingsData?.lifetime_total || 0)}</p>
                        <p className="text-sm text-slate-500 mt-2">Haz clic para ver el desglose por categoría y proveedor.</p>
                        <div className="mt-4 inline-flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-widest">
                            Ver detalle <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                </motion.button>

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.12 }}
                    className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-[1.75rem] p-6 shadow-sm"
                >
                    <div className="flex items-center gap-2 text-amber-800 mb-4">
                        <Trophy className="w-4 h-4 text-amber-600" />
                        <h3 className="text-xs font-bold uppercase tracking-widest">Fidelización DQ</h3>
                    </div>
                    <p className="text-2xl font-bold text-amber-900">1.250 DQ Coins</p>
                    <div className="mt-4 h-2 bg-amber-200/80 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" style={{ width: `${loyaltyProgress}%` }} />
                    </div>
                    <p className="text-sm text-amber-700 mt-3">Próximo premio: iPad Pro</p>
                </motion.div>
            </section>

            {/* COMPLIANCE SPLIT VIEW */}
            <section className="bg-white rounded-[1.75rem] border border-slate-200 shadow-sm p-6 md:p-8">
                <div className="flex items-center justify-between gap-3 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Diagnóstico de Inversión y Compliance</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Visualiza categorías optimizadas frente al potencial de ahorro pendiente en DQ.
                        </p>
                    </div>
                    {highlights?.period && (
                        <span className="text-xs font-semibold uppercase tracking-widest rounded-full px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200">
                            {highlights.period.label}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <article className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldCheck className="w-5 h-5 text-emerald-700" />
                            <h3 className="text-base font-bold text-emerald-900">Categorías Optimizadas</h3>
                        </div>
                        {loadingHighlights ? (
                            <p className="text-sm text-emerald-800/80">Analizando categorías...</p>
                        ) : optimizedCategories.length > 0 ? (
                            <div className="space-y-3">
                                {optimizedCategories.slice(0, 6).map((item) => (
                                    <div key={item.category_id} className="rounded-xl bg-white/80 border border-emerald-100 p-3">
                                        <p className="text-sm font-semibold text-emerald-950">{item.category_name}</p>
                                        <p className="text-xs text-emerald-800 mt-1">
                                            Actual: {formatCurrency(item.actual_spend)} | Umbral: {formatCurrency(item.threshold)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-emerald-900/80">Todavía no hay categorías por encima del consumo mínimo trimestral.</p>
                        )}
                    </article>

                    <article className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-slate-100 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="w-5 h-5 text-rose-700" />
                            <h3 className="text-base font-bold text-rose-900">Potencial de Ahorro</h3>
                        </div>
                        {loadingHighlights ? (
                            <p className="text-sm text-rose-800/80">Calculando potencial...</p>
                        ) : potentialCategories.length > 0 ? (
                            <div className="space-y-3">
                                {potentialCategories.slice(0, 6).map((item) => (
                                    <div key={item.category_id} className="rounded-xl bg-white/85 border border-rose-100 p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-sm font-semibold text-rose-950">{item.category_name}</p>
                                            <span className="text-[11px] font-bold text-rose-700 bg-rose-100 rounded-full px-2 py-0.5 border border-rose-200">
                                                +{formatPercent(item.estimated_extra_saving_pct)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-700 mt-2 leading-relaxed">
                                            {item.alert_message ||
                                                `Detectamos gasto externo. Pasa tus compras de ${item.category_name} a DQ para ahorrar un ${formatPercent(item.estimated_extra_saving_pct)} adicional`}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-700">No se han detectado categorías con bajo o nulo gasto en DQ.</p>
                        )}
                    </article>
                </div>
            </section>

            {/* OFFERS GRID — promoted to top priority */}
            <section className="pt-8 border-t border-slate-200/60">
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-black tracking-tight flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-klein-500" />
                            Ofertas Exclusivas
                        </h2>
                        <p className="text-slate-500 text-sm font-medium mt-2">Acuerdos especiales negociados para tu clínica</p>
                    </div>
                    <button
                        onClick={() => navigate('/catalogo')}
                        className="text-klein-600 text-xs font-bold hover:text-klein-700 hover:bg-klein-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 uppercase tracking-widest"
                    >
                        Ver Catálogo <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

                {loadingOffers ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white h-[320px] rounded-[1.5rem] animate-pulse shadow-sm border border-slate-100"></div>
                        ))}
                    </div>
                ) : hasOffers ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                        {offers.map((offer) => (
                            <div key={offer.id}>
                                <ProductCard product={offer} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <article className="md:col-span-2 bg-white rounded-[1.75rem] border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 p-6 text-white">
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-200">Acuerdo Destacado del Mes</p>
                                <h3 className="text-2xl font-bold mt-2">30% en Implantes Zimmer</h3>
                                <p className="text-sm text-slate-200 mt-2">Negociación exclusiva DentalQuality para clínicas con centralización activa.</p>
                            </div>
                            <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">Validez: hasta fin de mes</p>
                                    <p className="text-sm text-slate-500 mt-1">Incluye referencias estratégicas de cirugía e implantología.</p>
                                </div>
                                <button
                                    onClick={() => navigate('/catalogo')}
                                    className="rounded-xl bg-klein-600 hover:bg-klein-700 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
                                >
                                    Ver acuerdo en catálogo
                                </button>
                            </div>
                        </article>

                        <article className="bg-white rounded-[1.75rem] border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Oferta Próxima</p>
                                <h3 className="text-lg font-bold text-slate-900 mt-2">Pack Ortodoncia Premium</h3>
                                <p className="text-sm text-slate-500 mt-2">Activación prevista en breve para clínicas de alto volumen.</p>
                            </div>
                            <button
                                onClick={() => navigate('/catalogo')}
                                className="mt-6 w-full rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-sm font-semibold py-2.5 transition-colors"
                            >
                                Solicitar aviso
                            </button>
                        </article>
                    </div>
                )}
            </section>

            {/* ADVISORY PANEL */}
            <section className="bg-white rounded-[1.75rem] border border-slate-200 shadow-sm p-6 md:p-8 space-y-5">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Recomendaciones de Optimización</h2>
                        <p className="text-sm text-slate-500 mt-1">Tu panel de asesoría para decidir mejor y comprar con más inteligencia.</p>
                    </div>
                    <span className="hidden sm:inline-flex items-center rounded-full bg-klein-50 text-klein-700 text-xs font-bold uppercase tracking-widest px-3 py-1 border border-klein-100">
                        Asesoría DQ
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <CircleDollarSign className="w-4 h-4 text-emerald-700" />
                            <h3 className="text-sm font-bold text-emerald-900">Valor histórico generado</h3>
                        </div>
                        <p className="text-sm text-emerald-800 leading-relaxed">
                            El ahorro acumulado total asciende a {loadingHighlights ? '...' : formatCurrency(savingsData?.lifetime_total || 0)}.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="w-4 h-4 text-teal-700" />
                            <h3 className="text-sm font-bold text-teal-900">Cumplimiento activo</h3>
                        </div>
                        <p className="text-sm text-teal-800 leading-relaxed">
                            {loadingHighlights
                                ? 'Revisando cumplimiento...'
                                : `${optimizedCategories.length} categorías superan su consumo mínimo trimestral en DQ.`}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-rose-700" />
                            <h3 className="text-sm font-bold text-rose-900">Bolsa de oportunidad</h3>
                        </div>
                        <p className="text-sm text-rose-800 leading-relaxed">
                            {loadingHighlights
                                ? 'Estimando potencial...'
                                : `${potentialCategories.length} categorías muestran potencial de ahorro por migrar compra externa a DQ.`}
                        </p>
                    </div>
                </div>
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
                                        {formatCurrency(savingsData?.lifetime_total || 0)}
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Desglose acumulado por categoría y proveedor.
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
                                    <div className="h-64 w-full rounded-2xl border border-slate-200 p-3">
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
                                </section>

                                <section>
                                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-4">Ahorro por Proveedor</h3>
                                    <div className="space-y-3">
                                        {providerList.length > 0 ? (
                                            providerList.map((provider) => {
                                                const initials = provider.provider_name.slice(0, 2).toUpperCase();
                                                return (
                                                    <article
                                                        key={provider.provider_id || provider.provider_name}
                                                        className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between gap-3"
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            {provider.logo_url ? (
                                                                <img
                                                                    src={provider.logo_url}
                                                                    alt={`Logo ${provider.provider_name}`}
                                                                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-white"
                                                                />
                                                            ) : (
                                                                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                                                                    {initials}
                                                                </div>
                                                            )}
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-semibold text-slate-900 truncate">{provider.provider_name}</p>
                                                                <p className="text-xs text-slate-500">
                                                                    Ahorro estimado medio: {formatPercent(provider.estimated_rate_pct)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm font-bold text-emerald-700 whitespace-nowrap">
                                                            {formatCurrency(provider.savings_amount)}
                                                        </p>
                                                    </article>
                                                );
                                            })
                                        ) : (
                                            <p className="text-sm text-slate-500">No hay ahorro por proveedor disponible.</p>
                                        )}
                                    </div>
                                </section>
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Home;


