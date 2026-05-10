import { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useClinic } from '../context/ClinicContext';
import { TrendingUp, DollarSign, Box, AlertTriangle, CheckCircle } from 'lucide-react';
import api from '../services/api';
import PeriodSelector from '../components/PeriodSelector';

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
    smart_insights?: Array<{
        title: string;
        description: string;
        type: string;
        impact_value?: number;
    }>;
}

interface SmartInsightItem {
    id: string;
    tone: 'positive' | 'warning';
    message: string;
}

// Custom tick that wraps long category names into up to 2 lines
const CustomXAxisTick = ({ x, y, payload }: any) => {
    const MAX_CHARS = 14; // chars per line before wrapping
    const words = (payload.value as string).split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (candidate.length > MAX_CHARS && current) {
            lines.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }
    if (current) lines.push(current);
    // Cap at 2 lines, abbreviate overflow
    const displayLines = lines.length > 2 ? [lines[0], lines.slice(1).join(' ').substring(0, MAX_CHARS) + '…'] : lines;
    const lineHeight = 13;
    const totalHeight = displayLines.length * lineHeight;
    return (
        <g transform={`translate(${x},${y + 8})`}>
            {displayLines.map((line, i) => (
                <text
                    key={i}
                    x={0}
                    y={i * lineHeight - (totalHeight / 2 - lineHeight / 2)}
                    textAnchor="middle"
                    fill="#64748B"
                    fontSize={10}
                    fontFamily="Inter, system-ui, sans-serif"
                >
                    {line}
                </text>
            ))}
        </g>
    );
};

const DashboardAnalytics = () => {
    const { token } = useAuth();
    const { activeClinicId } = useClinic();
    const [period, setPeriod] = useState('');
    const [comparisonMode, setComparisonMode] = useState<'yoy' | 'qoq'>('yoy');
    const [datosKpis, setDatosKpis] = useState<KPI | null>(null);
    const [datosCategorias, setDatosCategorias] = useState<CategoryData[]>([]);
    const [datosProveedores, setDatosProveedores] = useState<AhorroPorProveedor[]>([]);
    const [backendInsights, setBackendInsights] = useState<Array<any>>([]);
    const [periodLabel, setPeriodLabel] = useState('');
    const [comparisonLabel, setComparisonLabel] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Bumped whenever clinic settings (num_boxes) change — triggers analytics re-fetch
    const [refreshVersion, setRefreshVersion] = useState(0);

    const providerChartColors = ['#0f172a', '#2563eb', '#0f766e', '#ea580c', '#7c3aed', '#db2777'];

    const smartInsights = useMemo(() => {
        // ── Best performing category (biggest absolute spend reduction) ──────
        const categoriesWithDiff = datosCategorias
            .filter(c => c.gasto_anterior > 0)
            .map((category) => ({
                ...category,
                absoluteChange: category.gasto_actual - category.gasto_anterior,
            }));

        const bestOptimization = categoriesWithDiff.length > 0
            ? [...categoriesWithDiff].sort((a, b) => a.absoluteChange - b.absoluteChange)[0]
            : null;

        // ── Local positive summary insight (category-based) ──────────────────
        const localPositive: SmartInsightItem = {
            id: 'local-positive',
            tone: 'positive',
            message: bestOptimization && bestOptimization.absoluteChange < 0
                ? `Buena gestión en ${bestOptimization.nombre_categoria}: has reducido el gasto un ${Math.abs(((bestOptimization.absoluteChange / bestOptimization.gasto_anterior) * 100)).toFixed(1)}% respecto al periodo anterior.`
                : 'El gasto global del periodo se mantiene estable respecto al periodo de comparación.',
        };

        // ── Dynamic insights from backend (category compliance alerts) ───────
        const dynamicInsights: SmartInsightItem[] = backendInsights.map((insight, idx) => ({
            id: `backend-${idx}`,
            tone: insight.type === 'warning' ? 'warning' : 'positive',
            message: insight.description,
        }));

        // ── Optimization opportunity value ────────────────────────────────────
        const optimizationValue = datosKpis?.ahorro_potencial && datosKpis.ahorro_potencial > 0
            ? datosKpis.ahorro_potencial
            : 0;

        const opportunityText = optimizationValue > 0
            ? 'Detectado en compras fuera de la red DQ y oportunidades activas de optimización estimadas por el sistema.'
            : 'Detectamos oportunidades de consolidación de compra dentro de tu red actual.';

        return {
            insights: [localPositive, ...dynamicInsights],
            optimizationValue,
            opportunityText,
        };
    }, [datosCategorias, datosKpis, backendInsights]);

    // Listen for clinic settings updates (e.g. num_boxes changed in Settings page)
    useEffect(() => {
        const handler = () => setRefreshVersion(v => v + 1);
        window.addEventListener('clinic-settings-updated', handler);
        window.addEventListener('clinic-context-changed', handler);
        return () => {
            window.removeEventListener('clinic-settings-updated', handler);
            window.removeEventListener('clinic-context-changed', handler);
        };
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!activeClinicId || !period) return; // Wait for clinic + period selection

            setLoading(true);
            setError(null);
            try {
                const response = await api.get<DashboardData>('/analytics/dashboard/', {
                    params: {
                        period: period,
                        comparison_mode: comparisonMode,
                        clinic_id: activeClinicId
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
                setBackendInsights(response.data.smart_insights || []);
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

        if (token && activeClinicId) {
            fetchData();
        }
    }, [period, comparisonMode, token, activeClinicId, refreshVersion]);

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
    const ProviderPieTooltip = ({ active, payload }: any) => {
        if (!active || !payload || !payload.length) {
            return null;
        }

        const prov = payload[0].payload as AhorroPorProveedor;
        const total = datosProveedores.reduce((sum, p) => sum + p.valor, 0);
        const pct = total > 0 ? ((prov.valor / total) * 100).toFixed(1) : '0.0';

        return (
            <div className="bg-white p-4 border border-slate-200 shadow-sm rounded-lg">
                <p className="font-bold text-slate-900 mb-2">{prov.nombre_proveedor}</p>
                <p className="text-sm text-slate-500">Gasto: <span className="font-semibold text-slate-900">{formatCurrency(prov.valor)}</span></p>
                <p className="text-sm text-slate-500">Peso: <span className="font-semibold text-slate-900">{pct}%</span></p>
                {prov.ahorro > 0 && (
                    <p className="text-sm text-emerald-600">Ahorro estimado: <span className="font-semibold">{formatCurrency(prov.ahorro)}</span></p>
                )}
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
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Visualizando:</p>
                        <PeriodSelector
                            value={period}
                            onChange={setPeriod}
                            clinicId={activeClinicId}
                        />
                        {comparisonLabel && (
                            <span className="text-slate-400 text-xs">vs {comparisonLabel}</span>
                        )}
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
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Ahorro del Periodo</p>
                        <h3 className="text-2xl font-bold tracking-tight mt-1 text-slate-900">
                            {datosKpis ? formatCurrency(datosKpis.total_savings) : '...'}
                        </h3>
                    </div>
                    <div className="p-2.5 rounded-lg border bg-emerald-50 border-emerald-100">
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
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
                                            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                        ) : (
                                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-700 leading-relaxed font-medium">{insight.message}</p>
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
                    <div style={{ width: '100%', height: 380 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={datosCategorias}
                                margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis
                                    dataKey="nombre_categoria"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={<CustomXAxisTick />}
                                    interval={0}
                                    height={55}
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
                                    barSize={22}
                                />
                                <Bar
                                    dataKey="gasto_actual"
                                    name="Periodo Actual"
                                    fill="#0f172a"
                                    radius={[4, 4, 0, 0]}
                                    barSize={22}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-5">Gasto por Proveedor</h3>
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={datosProveedores.filter(p => p.valor > 0).slice(0, 8)}
                                    dataKey="valor"
                                    nameKey="nombre_proveedor"
                                    innerRadius={70}
                                    outerRadius={110}
                                    paddingAngle={3}
                                >
                                    {datosProveedores.filter(p => p.valor > 0).slice(0, 8).map((prov, index) => (
                                        <Cell
                                            key={prov.nombre_proveedor}
                                            fill={providerChartColors[index % providerChartColors.length]}
                                        />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<ProviderPieTooltip />} />
                                <Legend
                                    formatter={(value) => (
                                        <span className="text-xs text-slate-600">{value}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>


        </div>
    );
};

export default DashboardAnalytics;
