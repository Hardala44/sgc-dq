import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    Award,
    ArrowRight,
    Activity,
    Sparkles
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

const Home = () => {
    const navigate = useNavigate();
    const [offers, setOffers] = useState<Product[]>([]);
    const [loadingOffers, setLoadingOffers] = useState(true);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loadingDashboard, setLoadingDashboard] = useState(true);
    const [isDeepDiveOpen, setIsDeepDiveOpen] = useState(false);

    useEffect(() => {
        const fetchOffers = async () => {
            try {
                const response = await api.get('/productos/');
                const productsWithSavings = response.data.slice(0, 3).map((p: any) => ({
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

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
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
                    <GlobalSearch />
                </div>
            </section>

            {/* WEALTH MANAGEMENT SECTION */}
            {!loadingDashboard && dashboardData && (
                <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* BOX 1: Valor Generado */}
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white rounded-[2rem] p-8 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)] border border-slate-100 flex flex-col sm:flex-row items-center gap-8 group hover:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] transition-shadow duration-300"
                    >
                        {/* Progress Ring */}
                        <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                {/* Background ring */}
                                <circle cx="50" cy="50" r="45" fill="transparent" className="stroke-slate-100" strokeWidth="8" />
                                {/* Value ring */}
                                <circle 
                                    cx="50" cy="50" r="45" 
                                    fill="transparent" 
                                    className="stroke-klein-500 transition-all duration-1000 ease-out" 
                                    strokeWidth="8" 
                                    strokeDasharray="283" 
                                    strokeDashoffset={283 * (1 - Math.min(1, dashboardData.wealth_management.realized_savings / Math.max(1, (dashboardData.wealth_management.realized_savings + dashboardData.wealth_management.total_opportunity))))} 
                                    strokeLinecap="round" 
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Award className="w-8 h-8 text-klein-500 group-hover:scale-110 transition-transform duration-300" />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                                <span className="w-2 h-2 rounded-full bg-klein-500"></span>
                                Valor Generado
                            </h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                {dashboardData.wealth_management.realized_savings > 0 ? (
                                    <>
                                        ¡Enhorabuena! Has recuperado <span className="text-klein-600 font-bold text-base">{formatCurrency(dashboardData.wealth_management.realized_savings)}</span> este mes. 
                                        {dashboardData.wealth_management.total_opportunity > 0 && (
                                            <> Aún tienes <span className="text-black font-semibold">{formatCurrency(dashboardData.wealth_management.total_opportunity)}</span> esperando en oportunidades clave como <span className="font-semibold">{dashboardData.wealth_management.top_opportunity_category}</span>.</>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        Estamos analizando tus facturas para encontrar tu primer ahorro. 
                                        {dashboardData.wealth_management.total_opportunity > 0 && (
                                            <> Tienes <span className="text-black font-semibold">{formatCurrency(dashboardData.wealth_management.total_opportunity)}</span> de potencial detectado.</>
                                        )}
                                    </>
                                )}
                            </p>
                        </div>
                    </motion.div>

                    {/* BOX 2: Diagnóstico de Inversión */}
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        onClick={() => setIsDeepDiveOpen(true)}
                        className="bg-white rounded-[2rem] p-8 shadow-[0_4px_24px_-12px_rgba(0,0,0,0.08)] border border-slate-100 flex items-center justify-between cursor-pointer group hover:border-klein-500/30 hover:shadow-[0_8px_32px_-12px_rgba(0,0,0,0.12)] transition-all duration-300"
                    >
                        <div className="flex-1 pr-6">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                                <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-klein-500 transition-colors"></span>
                                Diagnóstico de Inversión
                            </h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                Análisis de <span className="text-black font-bold text-base">{dashboardData.diagnostic_breakdown.filter((d: any) => d.status !== 'in_range').length}</span> categorías operando fuera de rango óptimo. Riesgos de sub-inversión vs fugas de capital.
                            </p>
                            <div className="mt-5 flex items-center gap-2">
                                <span className="text-xs font-bold text-klein-600 uppercase tracking-widest group-hover:text-klein-700 transition-colors">Profundizar Análisis</span>
                                <ArrowRight className="w-4 h-4 text-klein-600 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                        <div className="w-16 h-16 bg-slate-50 group-hover:bg-klein-50 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100 group-hover:border-klein-100 transition-colors">
                            <Activity className="w-7 h-7 text-slate-400 group-hover:text-klein-500 transition-colors" />
                        </div>
                    </motion.div>
                </section>
            )}

            {/* DEEP DIVE MODAL */}
            {dashboardData && (
                <InvestmentDeepDive 
                    isOpen={isDeepDiveOpen} 
                    onClose={() => setIsDeepDiveOpen(false)} 
                    data={dashboardData.diagnostic_breakdown} 
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

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                    {loadingOffers ? (
                        [...Array(3)].map((_, i) => (
                            <div key={i} className="bg-white h-[320px] rounded-[1.5rem] animate-pulse shadow-sm border border-slate-100"></div>
                        ))
                    ) : offers.length > 0 ? (
                        offers.map((offer) => (
                            <div key={offer.id}>
                                <ProductCard product={offer} />
                            </div>
                        ))
                    ) : (
                        <div className="col-span-3 text-center py-20 text-slate-500 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                            <p className="font-medium text-lg">No hay ofertas disponibles en este momento.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default Home;


