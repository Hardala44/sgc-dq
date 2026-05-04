import { useState, useEffect, useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, TrendingDown, DollarSign, Box, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../services/api';

interface KPI {
    total_spend: number;
    total_savings: number;
    spend_per_box: number | null;
    ahorro_potencial?: number;
    ahorro_potencial_por_box?: number | null;
}

interface CategoryData {
    id: number;
    nombre_categoria: string;
    gasto_actual: number;
    gasto_anterior: number;
    media_sector: number;
    trend_pct: number;
}

interface AhorroPorProveedor {
    nombre_proveedor: string;
    valor: number;
    diferencial: number;
    ahorro: number;
}

interface DashboardData {
    period_label: string;
    comparison_label: string;
    kpis: KPI;
    categories: Array<{
        id: number;
        name?: string;
        nombre_categoria?: string;
        current_spend?: number;
        gasto_actual?: number;
        previous_spend?: number;
        gasto_anterior?: number;
        sector_avg?: number;
        media_sector?: number;
        trend_pct: number;
    }>;
    ahorro_por_proveedor?: Array<{
        proveedor_nombre?: string;
        nombre_proveedor?: string;
        compras?: number;
        valor?: number;
        diferencial: number;
        ahorro: number;
    }>;
}

interface Clinic {
    id: string;
    nombre: string;
}

interface SmartInsightItem {
    id: string;
    tone: 'positive' | 'warning';
    message: string;
}

const DashboardAnalytics = () => {
    const { token } = useAuth();
    const [period, setPeriod] = useState('2025-Q1');
    const [comparisonMode, setComparisonMode] = useState<'yoy' | 'qoq'>('yoy');
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [selectedClinicId, setSelectedClinicId] = useState<string>('');
    const [datosKpis, setDatosKpis] = useState<KPI | null>(null);
    const [datosCategorias, setDatosCategorias] = useState<CategoryData[]>([]);
    const [datosProveedores, setDatosProveedores] = useState<AhorroPorProveedor[]>([]);
    const [periodLabel, setPeriodLabel] = useState('');
    const [comparisonLabel, setComparisonLabel] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const providerChartColors = ['#0f172a', '#2563eb', '#0f766e', '#ea580c', '#7c3aed', '#db2777'];

    const smartInsights = useMemo(() => {
        const categoriesWithDiff = datosCategorias.map((category) => {
            const absoluteChange = category.gasto_actual - category.gasto_anterior;
            const percentChange = category.gasto_anterior > 0
                ? (absoluteChange / category.gasto_anterior) * 100
                : (category.gasto_actual > 0 ? 100 : 0);

            return {
                ...category,
                absoluteChange,
                percentChange,
            };
        });

        const bestOptimization = categoriesWithDiff.length > 0
            ? [...categoriesWithDiff].sort((left, right) => left.absoluteChange - right.absoluteChange)[0]
            : null;

        const biggestAlert = categoriesWithDiff.length > 0
            ? [...categoriesWithDiff].sort((left, right) => right.percentChange - left.percentChange)[0]
            : null;

        const topProviders = [...datosProveedores]
            .sort((left, right) => right.valor - left.valor)
            .slice(0, 3);

        const providerNames = topProviders.map((provider) => provider.nombre_proveedor);
        const simulatedOpportunity = topProviders.reduce((total, provider) => total + provider.valor, 0) * 0.12;
        const optimizationValue = datosKpis?.ahorro_potencial && datosKpis.ahorro_potencial > 0
            ? datosKpis.ahorro_potencial
            : simulatedOpportunity;

        const insights: SmartInsightItem[] = [
            {
                id: 'positive',
                tone: 'positive',
                message: bestOptimization
                    ? `Excelente gestión en ${bestOptimization.nombre_categoria}, has reducido el gasto respecto al periodo anterior.`
                    : 'Excelente disciplina financiera: mantenéis una evolución de gasto estable respecto al periodo anterior.',
            },
            {
                id: 'warning',
                tone: 'warning',
                message: biggestAlert
                    ? `Atención: Tu gasto en ${biggestAlert.nombre_categoria} ha subido considerablemente. Te recomendamos revisar tarifas con tus proveedores.`
                    : 'Atención: no detectamos una categoría claramente tensionada, pero conviene revisar periódicamente las tarifas pactadas con proveedores.',
            },
        ];

        let opportunityText = 'Detectamos oportunidades de consolidación de compra dentro de tu red actual.';

        if (datosKpis?.ahorro_potencial && datosKpis.ahorro_potencial > 0) {
            opportunityText = 'Detectado en compras fuera de la red DQ y oportunidades activas de optimización ya estimadas por el sistema.';
        } else if (providerNames.length > 0) {
            opportunityText = `Detectamos que centralizando el 100% de tus compras del top 3 de proveedores (${providerNames.join(', ')}), tu ahorro proyectado crecería significativamente.`;
        }

        return {
            insights,
            optimizationValue,
            opportunityText,
        };
    }, [datosCategorias, datosKpis, datosProveedores]);

    // Fetch Clinics on Mount
    useEffect(() => {
        const fetchClinics = async () => {
            try {
                const response = await api.get('/analytics/clinics/');
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
                const response = await api.get<DashboardData>('/analytics/dashboard/', {
                    params: {
                        period: period,
                        comparison_mode: comparisonMode,
                        clinic_id: selectedClinicId
                    }
                });

                console.log('Analytics dashboard response', response.data);

                const mappedCategories: CategoryData[] = (response.data.categories || []).map((category) => ({
                    id: category.id,
                    nombre_categoria: category.nombre_categoria || category.name || 'Sin categoría',
                    gasto_actual: Number(category.gasto_actual ?? category.current_spend ?? 0),
                    gasto_anterior: Number(category.gasto_anterior ?? category.previous_spend ?? 0),
                    media_sector: Number(category.media_sector ?? category.sector_avg ?? 0),
                    trend_pct: Number(category.trend_pct ?? 0),
                }));

                const mappedProviders: AhorroPorProveedor[] = (response.data.ahorro_por_proveedor || []).map((provider) => ({
                    nombre_proveedor: provider.nombre_proveedor || provider.proveedor_nombre || 'Sin proveedor',
                    valor: Number(provider.valor ?? provider.compras ?? 0),
                    diferencial: Number(provider.diferencial ?? 0),
                    ahorro: Number(provider.ahorro ?? 0),
                }));

                setDatosKpis(response.data.kpis);
                setDatosCategorias(mappedCategories);
                setDatosProveedores(mappedProviders);
                setPeriodLabel(response.data.period_label);
                setComparisonLabel(response.data.comparison_label);
            } catch (err) {
                const axiosError = err as { response?: { status?: number } };
                console.error("Error fetching dashboard data", err);
                if (axiosError.response && axiosError.response.status === 401) {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 border border-slate-200 shadow-sm rounded-lg">
                    <p className="font-bold text-slate-900 mb-2">{label}</p>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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
                    {payload[0]?.payload?.media_sector > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                            <p className="text-xs text-slate-400">Media Sector: {formatCurrency(payload[0].payload.media_sector)}</p>
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ProviderTooltip = ({ active, payload }: any) => {
        if (!active || !payload || !payload.length) {
            return null;
        }

        const provider = payload[0].payload as AhorroPorProveedor;

        return (
            <div className="bg-white p-4 border border-slate-200 shadow-sm rounded-lg">
                <p className="font-bold text-slate-900 mb-2">{provider.nombre_proveedor}</p>
                <p className="text-sm text-slate-500">Gasto: <span className="font-semibold text-slate-900">{formatCurrency(provider.valor)}</span></p>
                <p className="text-sm text-slate-500">Ahorro: <span className="font-semibold text-emerald-600">{formatCurrency(provider.ahorro)}</span></p>
            </div>
        );
    };

    if (loading && !datosKpis) return (
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
                        <span className="text-slate-400 text-xs">vs {comparisonLabel || '...'}</span>
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
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Gasto Total ({periodLabel || '...'})</p>
                        <h3 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                            {datosKpis ? formatCurrency(datosKpis.total_spend) : '...'}
                        </h3>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                        <DollarSign className="w-5 h-5 text-slate-700" />
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex items-start justify-between">
                    <div>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Ahorro vs Periodo Anterior</p>
                        <h3 className={`text-2xl font-bold tracking-tight mt-1 ${datosKpis && datosKpis.total_savings >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                            {datosKpis ? formatCurrency(datosKpis.total_savings) : '...'}
                        </h3>
                    </div>
                    <div className={`p-2.5 rounded-lg border ${datosKpis && datosKpis.total_savings >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'
                        }`}>
                        {datosKpis && datosKpis.total_savings >= 0 ? (
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
                            {datosKpis && datosKpis.spend_per_box !== null ? formatCurrency(datosKpis.spend_per_box) : 'N/A'}
                        </h3>
                    </div>
                    <div className="p-2.5 bg-indigo-50 rounded-lg border border-indigo-100">
                        <Box className="w-5 h-5 text-indigo-600" />
                    </div>
                </div>
            </div>

            {/* Smart Insights */}
            <div className="w-full bg-slate-50 border border-blue-100 rounded-xl p-6 mb-6">
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-2/3">
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4">Diagnóstico Inteligente</h3>
                        <div className="space-y-4">
                            {smartInsights.insights.map((insight) => (
                                <div key={insight.id} className="flex items-start gap-3">
                                    <div className={`p-2 rounded-md border ${insight.tone === 'positive'
                                        ? 'bg-emerald-50 border-emerald-100'
                                        : 'bg-amber-50 border-amber-100'
                                        }`}>
                                        {insight.tone === 'positive' ? (
                                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                                        ) : (
                                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-700 leading-relaxed">{insight.message}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="w-full md:w-1/3">
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4">Oportunidad de Optimización</h3>
                        <div className="bg-white rounded-lg p-4 shadow-sm border border-rose-100">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ahorro Potencial no aprovechado</p>
                            <p className="text-3xl font-bold text-rose-600 tracking-tight mt-2">{formatCurrency(smartInsights.optimizationValue)}</p>
                            <p className="text-xs text-slate-500 mt-2">{smartInsights.opportunityText}</p>
                            <button
                                type="button"
                                className="mt-4 inline-flex items-center justify-center px-3 py-1.5 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                            >
                                Ver alternativas DQ
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-5">Desglose por Categoría</h3>
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={datosCategorias}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis
                                    dataKey="nombre_categoria"
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
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#F8FAFC' }} />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar
                                    dataKey="gasto_anterior"
                                    name="Periodo Anterior"
                                    fill="#cbd5e1"
                                    radius={[4, 4, 0, 0]}
                                    barSize={30}
                                />
                                <Bar
                                    dataKey="gasto_actual"
                                    name="Periodo Actual"
                                    fill="#0f172a"
                                    radius={[4, 4, 0, 0]}
                                    barSize={30}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-5">Distribución por Proveedor</h3>
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={datosProveedores}
                                    dataKey="valor"
                                    nameKey="nombre_proveedor"
                                    innerRadius={70}
                                    outerRadius={110}
                                    paddingAngle={3}
                                >
                                    {datosProveedores.map((provider, index) => (
                                        <Cell
                                            key={provider.nombre_proveedor}
                                            fill={providerChartColors[index % providerChartColors.length]}
                                        />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<ProviderTooltip />} />
                                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Insight Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {datosCategorias.map((cat) => {
                    // Normalize both values to spend-per-box so clinics of different sizes are comparable.
                    const clinicBoxes = datosKpis?.spend_per_box && datosKpis.spend_per_box > 0
                        ? datosKpis.total_spend / datosKpis.spend_per_box
                        : 1;
                    const currentSpendPerBox = clinicBoxes > 0 ? cat.gasto_actual / clinicBoxes : cat.gasto_actual;
                    const sectorAvgPerBox = clinicBoxes > 0 ? cat.media_sector / clinicBoxes : cat.media_sector;

                    const diffPct = sectorAvgPerBox > 0
                        ? ((currentSpendPerBox - sectorAvgPerBox) / sectorAvgPerBox) * 100
                        : 0;
                    const isAboveSector = diffPct > 0;

                    return (
                        <div key={cat.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:shadow-md transition-shadow duration-300">
                            <div className="flex justify-between items-start mb-3">
                                <h4 className="font-semibold text-slate-900 tracking-tight">{cat.nombre_categoria}</h4>
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${!isAboveSector
                                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                                    }`}>
                                    {!isAboveSector ? 'Eficiente' : 'Alto'}
                                </span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 font-medium">Tu Gasto (por Box)</span>
                                    <span className="font-bold text-slate-900">{formatCurrency(currentSpendPerBox)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500 font-medium">Media Sector (por Box)</span>
                                    <span className="font-semibold text-slate-500">{formatCurrency(sectorAvgPerBox)}</span>
                                </div>

                                <div className="pt-3 border-t border-slate-100 mt-2 flex items-center gap-2">
                                    {!isAboveSector ? (
                                        <TrendingDown className="w-4 h-4 text-emerald-500" />
                                    ) : (
                                        <TrendingUp className="w-4 h-4 text-amber-500" />
                                    )}
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${!isAboveSector ? 'text-emerald-600' : 'text-amber-600'
                                        }`}>
                                        {`${diffPct >= 0 ? '+' : ''}${diffPct.toFixed(1)}% VS MEDIA`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DashboardAnalytics;
