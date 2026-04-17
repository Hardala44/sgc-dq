import { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, TrendingDown, DollarSign, Box } from 'lucide-react';

interface KPI {
    total_spend: number;
    total_savings: number;
    spend_per_box: number | null;
}

interface CategoryData {
    id: number;
    name: string;
    current_spend: number;
    previous_spend: number;
    sector_avg: number;
    trend_pct: number;
}

interface AhorroPorProveedor {
    proveedor_nombre: string;
    compras: number;
    diferencial: number;
    ahorro: number;
}

interface DashboardData {
    period_label: string;
    comparison_label: string;
    kpis: KPI;
    categories: CategoryData[];
    ahorro_por_proveedor?: AhorroPorProveedor[];
}

interface Clinic {
    id: string;
    nombre: string;
}

const DashboardAnalytics = () => {
    const { token } = useAuth();
    const [period, setPeriod] = useState('2025-Q1');
    const [comparisonMode, setComparisonMode] = useState<'yoy' | 'qoq'>('yoy');
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [selectedClinicId, setSelectedClinicId] = useState<string>('');
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch Clinics on Mount
    useEffect(() => {
        const fetchClinics = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8000/api/analytics/clinics/', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setClinics(response.data);
                if (response.data.length > 0) {
                    setSelectedClinicId(response.data[0].id);
                }
            } catch (err) {
                console.error("Error fetching clinics", err);
            }
        };
        if (token) fetchClinics();
    }, [token]);


    useEffect(() => {
        const fetchData = async () => {
            if (!selectedClinicId) return; // Wait for clinic selection

            setLoading(true);
            setError(null);
            try {
                const response = await axios.get('http://127.0.0.1:8000/api/analytics/dashboard/', {
                    params: {
                        period: period,
                        comparison_mode: comparisonMode,
                        clinic_id: selectedClinicId
                    },
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
                setData(response.data);
            } catch (err: any) {
                console.error("Error fetching dashboard data", err);
                if (err.response && err.response.status === 401) {
                    setError("Sesión expirada. Por favor, cierre sesión e ingrese nuevamente.");
                } else {
                    setError("Error al cargar los datos. Por favor revise su conexión.");
                }
            } finally {
                setLoading(false);
            }
        };

        if (token && selectedClinicId) {
            fetchData();
        }
    }, [period, comparisonMode, token, selectedClinicId]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 border border-slate-200 shadow-sm rounded-lg">
                    <p className="font-bold text-slate-900 mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 mb-1">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-sm text-slate-500">
                                {entry.name}: <span className="font-semibold text-slate-900">{formatCurrency(entry.value)}</span>
                            </span>
                        </div>
                    ))}
                    {data && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                            <p className="text-xs text-slate-400">Promedio Sector: {formatCurrency(payload[0].payload.sector_avg)}</p>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    if (loading && !data) return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
    );

    if (error) return (
        <div className="flex h-screen items-center justify-center bg-flint-50">
            <div className={`p-6 rounded-lg border ${error.includes('Sesión expirada') ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                <p className="font-semibold">{error.includes('Sesión expirada') ? 'Atención' : 'Error'}</p>
                <p>{error}</p>
            </div>
        </div>
    );

    return (
        <div className="p-6 md:p-8 space-y-6 bg-slate-50 min-h-screen">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-xl font-serif font-bold text-slate-900 tracking-tight">Análisis Financiero</h1>
                    <div className="flex items-center gap-3 mt-2">
                        {clinics.length > 1 && (
                            <div className="mr-3">
                                <select
                                    value={selectedClinicId}
                                    onChange={(e) => setSelectedClinicId(e.target.value)}
                                    className="bg-white border border-slate-200 text-slate-900 text-xs rounded-md focus:ring-slate-500 focus:border-slate-500 block p-1.5"
                                >
                                    {clinics.map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Visualizando:</p>
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-900 text-xs font-semibold tracking-tight rounded-md focus:ring-slate-500 focus:border-slate-500 block p-1.5"
                        >
                            <option value="2025-Q2">Q2 2025</option>
                            <option value="2025-Q1">Q1 2025</option>
                            <option value="2024-Q4">Q4 2024</option>
                            <option value="2024-Q3">Q3 2024</option>
                            <option value="2024-Q2">Q2 2024</option>
                            <option value="2024-Q1">Q1 2024</option>
                        </select>
                        <span className="text-slate-400 text-xs">vs {data?.comparison_label}</span>
                    </div>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-md mt-4 md:mt-0">
                    <button
                        onClick={() => setComparisonMode('yoy')}
                        className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all duration-200 ${comparisonMode === 'yoy'
                            ? 'bg-white text-slate-950 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        vs Año Anterior
                    </button>
                    <button
                        onClick={() => setComparisonMode('qoq')}
                        className={`px-3 py-1.5 rounded-md text-[10px] uppercase tracking-widest font-bold transition-all duration-200 ${comparisonMode === 'qoq'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                            }`}
                    >
                        vs Trims. Anterior
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between">
                    <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Gasto Total ({data?.period_label})</p>
                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                            {data ? formatCurrency(data.kpis.total_spend) : '...'}
                        </h3>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <DollarSign className="w-5 h-5 text-slate-700" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between">
                    <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Ahorro vs Periodo Anterior</p>
                        <h3 className={`text-2xl font-bold tracking-tight mt-1 ${data && data.kpis.total_savings >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                            {data ? formatCurrency(data.kpis.total_savings) : '...'}
                        </h3>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${data && data.kpis.total_savings >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
                        }`}>
                        {data && data.kpis.total_savings >= 0 ? (
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                        ) : (
                            <TrendingDown className="w-5 h-5 text-rose-600" />
                        )}
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between">
                    <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Gasto por Box</p>
                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                            {data && data.kpis.spend_per_box !== null ? formatCurrency(data.kpis.spend_per_box) : 'N/A'}
                        </h3>
                    </div>
                    <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-100">
                        <Box className="w-5 h-5 text-indigo-600" />
                    </div>
                </div>
            </div>

            {/* Main Chart */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-5">Desglose por Categoría</h3>
                {/* Fixed height container for Recharts */}
                <div style={{ width: '100%', height: 350 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data?.categories || []}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 12 }}
                                tickFormatter={(value) => `${value / 1000}k`}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                            <Bar
                                dataKey="previous_spend"
                                name="Periodo Anterior"
                                fill="#e2e8f0"
                                radius={[4, 4, 0, 0]}
                                barSize={30}
                            />
                            <Bar
                                dataKey="current_spend"
                                name="Periodo Actual"
                                fill="#0f172a"
                                radius={[4, 4, 0, 0]}
                                barSize={30}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Insight Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data?.categories.map((cat) => {
                    const isEfficient = cat.current_spend < cat.sector_avg;
                    const diffPct = cat.sector_avg > 0 ? ((cat.current_spend - cat.sector_avg) / cat.sector_avg) * 100 : 0;

                    return (
                        <div key={cat.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition-shadow duration-300">
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="font-semibold text-slate-900 tracking-tight">{cat.name}</h4>
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${isEfficient
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                                    }`}>
                                    {isEfficient ? 'Eficiente' : 'Alto'}
                                </span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 font-medium">Tu Gasto</span>
                                    <span className="font-bold text-slate-900">{formatCurrency(cat.current_spend)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 font-medium">Promedio Sector</span>
                                    <span className="font-semibold text-slate-500">{formatCurrency(cat.sector_avg)}</span>
                                </div>

                                <div className="pt-3 border-t border-slate-100 mt-2 flex items-center gap-2">
                                    {isEfficient ? (
                                        <TrendingDown className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                        <TrendingUp className="w-4 h-4 text-amber-500" />
                                    )}
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${isEfficient ? 'text-emerald-600' : 'text-amber-600'
                                        }`}>
                                        {Math.abs(diffPct).toFixed(1)}% {isEfficient ? 'Menos' : 'Más'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Provider Breakdown Table */}
            {data?.ahorro_por_proveedor && data.ahorro_por_proveedor.length > 0 && (
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4">Desglose por Proveedor</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[600px]">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 rounded-tl-lg">Proveedor</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 text-right">Compras</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 text-center">Diferencial</th>
                                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 text-right rounded-tr-lg">Ahorro</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {data.ahorro_por_proveedor.map((prov, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors duration-150">
                                        <td className="py-3 px-4 text-sm font-semibold text-slate-900">{prov.proveedor_nombre}</td>
                                        <td className="py-3 px-4 text-sm font-medium text-slate-700 text-right">{formatCurrency(prov.compras)}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="inline-flex px-2 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-md border border-slate-200">
                                                {Number(prov.diferencial) % 1 === 0 ? prov.diferencial : Number(prov.diferencial).toFixed(2)}%
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm font-bold text-emerald-600 text-right">
                                            {formatCurrency(prov.ahorro)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardAnalytics;
