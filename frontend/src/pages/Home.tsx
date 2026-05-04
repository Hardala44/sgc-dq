import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    Award,
    ArrowRight,
    Activity,
    Sparkles,
    Trophy,
    Lightbulb,
    TrendingDown
} from 'lucide-react';
import GlobalSearch from '../components/GlobalSearch';
import ProductCard from '../components/ProductCard';
import InvestmentDeepDive from '../components/InvestmentDeepDive';
import { motion } from 'framer-motion';

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

const Home = () => {
    const navigate = useNavigate();
    const [offers, setOffers] = useState<Product[]>([]);
    const [loadingOffers, setLoadingOffers] = useState(true);
    const [dashboardData, setDashboardData] = useState<Record<string, unknown> | null>(null);
    const [loadingDashboard, setLoadingDashboard] = useState(true);
    const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);
    const hasOffers = offers.length > 0;

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);

    const wealthManagement = (dashboardData?.wealth_management as {
        realized_savings: number;
        total_opportunity: number;
        top_opportunity_category?: string;
    } | undefined) || {
        realized_savings: 0,
        total_opportunity: 0,
        top_opportunity_category: 'categorías estratégicas'
    };

    const diagnosticBreakdown = (dashboardData?.diagnostic_breakdown as Array<{ status: string }> | undefined) || [];
    const outOfRangeCount = diagnosticBreakdown.filter((item) => item.status !== 'in_range').length;
    const recoveryRatio = Math.min(
        1,
        wealthManagement.realized_savings /
            Math.max(1, wealthManagement.realized_savings + wealthManagement.total_opportunity)
    );
    const loyaltyProgress = 83;

    const smartInsights = [
        {
            id: 'benchmark',
            icon: Lightbulb,
            title: 'Benchmark DQ',
            message:
                wealthManagement.realized_savings > 0
                    ? `Tu gestión ya ha generado ${formatCurrency(wealthManagement.realized_savings)} en ahorro real en el periodo actual.`
                    : 'Tu clínica está en fase de diagnóstico activo para detectar la primera bolsa de ahorro recuperable.'
        },
        {
            id: 'risk',
            icon: TrendingDown,
            title: 'Riesgo de Inversión',
            message:
                outOfRangeCount > 0
                    ? `Hay ${outOfRangeCount} categorías fuera del rango óptimo. Priorizar su ajuste puede mejorar margen y estabilidad operativa.`
                    : 'Las categorías analizadas se mantienen en rango óptimo respecto a la red DQ.'
        },
        {
            id: 'opportunity',
            icon: Lightbulb,
            title: 'Oportunidad Activa',
            message:
                wealthManagement.total_opportunity > 0
                    ? `Activa acuerdos en ${wealthManagement.top_opportunity_category} para capturar hasta ${formatCurrency(wealthManagement.total_opportunity)} adicionales.`
                    : 'Activa campañas de compras centralizadas para desbloquear nuevas oportunidades de ahorro negociado.'
        }
    ];


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

        const fetchDashboard = async () => {
            try {
                const response = await api.get('/analytics/dashboard/', { params: { period: '2025-Q1' } });
                setDashboardData(response.data);
            } catch (err) {
                console.error("Error fetching dashboard:", err);
            } finally {
                setLoadingDashboard(false);
            }
        };

        fetchOffers();
        fetchDashboard();
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
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="bg-white rounded-[1.75rem] p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center gap-6"
                >
                    <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="transparent" className="stroke-slate-100" strokeWidth="8" />
                            <circle
                                cx="50"
                                cy="50"
                                r="45"
                                fill="transparent"
                                className="stroke-klein-500 transition-all duration-1000 ease-out"
                                strokeWidth="8"
                                strokeDasharray="283"
                                strokeDashoffset={283 * (1 - recoveryRatio)}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Award className="w-7 h-7 text-klein-500" />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Valor Generado</h3>
                        <p className="text-2xl font-bold text-slate-900">{formatCurrency(wealthManagement.realized_savings)}</p>
                        <p className="text-sm text-slate-500 mt-2">Ahorro acumulado en el periodo actual.</p>
                    </div>
                </motion.div>

                <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.06 }}
                    onClick={() => setIsDeepDiveOpen(true)}
                    className="bg-white rounded-[1.75rem] p-6 shadow-sm border border-slate-200 flex items-center justify-between text-left hover:border-klein-500/30 hover:shadow-md transition-all duration-300"
                >
                    <div className="pr-4">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Diagnóstico de Inversión</h3>
                        <p className="text-slate-700 text-sm leading-relaxed">
                            {loadingDashboard
                                ? 'Analizando salud financiera...'
                                : `${outOfRangeCount} categorías fuera de rango óptimo. Profundiza para detectar fugas y riesgos.`}
                        </p>
                        <div className="mt-4 flex items-center gap-2 text-klein-600 text-xs font-bold uppercase tracking-widest">
                            Profundizar análisis <ArrowRight className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-200 shrink-0">
                        <Activity className="w-6 h-6 text-slate-500" />
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
                    {smartInsights.map((insight) => {
                        const Icon = insight.icon;
                        return (
                            <div key={insight.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon className="w-4 h-4 text-klein-600" />
                                    <h3 className="text-sm font-bold text-slate-800">{insight.title}</h3>
                                </div>
                                <p className="text-sm text-slate-600 leading-relaxed">{insight.message}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* DEEP DIVE MODAL */}
            {dashboardData && (
                <InvestmentDeepDive 
                    isOpen={isDeepDiveOpen} 
                    onClose={() => setIsDeepDiveOpen(false)} 
                    data={diagnosticBreakdown} 
                />
            )}

            {/* OFFERS GRID */}
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

        </div>
    );
};

export default Home;


