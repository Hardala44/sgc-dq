import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useClinic } from '../context/ClinicContext';
import { TrendingUp, DollarSign, Box, AlertTriangle, CheckCircle, ShoppingCart, ArrowRight } from 'lucide-react';
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
        category_name?: string;
        category_id?: number;
    }>;
}

interface SmartInsightItem {
    id: string;
    tone: 'positive' | 'warning';
    message: string;
    category_name?: string;
    category_id?: number;
    impact_value?: number;
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
    const navigate = useNavigate();
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
            message: insight.description,            category_name: insight.category_name,
            category_id: insight.category_id,
            impact_value: insight.impact_value,        }));

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

            {/* ── 1. Header: Period Selector + Comparison Toggle ── */}
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

            {/* ── 2. KPI Summary Cards ── */}
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

            {/* ── 3. Charts ── */}
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
                                <Bar dataKey="gasto_anterior" name="Periodo Anterior" fill="#cbd5e1" radius={[4, 4, 0, 0]} barSize={22} />
                                <Bar dataKey="gasto_actual" name="Periodo Actual" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={22} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-5">Inversión por Proveedor</h3>
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
                                        <Cell key={prov.nombre_proveedor} fill={providerChartColors[index % providerChartColors.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip content={<ProviderPieTooltip />} />
                                <Legend formatter={(value) => <span className="text-xs text-slate-600">{value}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    {/* Provider breakdown table */}
                    {datosProveedores.filter(p => p.valor > 0).length > 0 && (
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Proveedor</th>
                                        <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Facturación</th>
                                        <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Ahorro %</th>
                                        <th className="text-right px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Ahorro €</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {datosProveedores.filter(p => p.valor > 0).map(prov => (
                                        <tr key={prov.nombre_proveedor} className="hover:bg-slate-50">
                                            <td className="px-3 py-2 font-medium text-slate-800">{prov.nombre_proveedor}</td>
                                            <td className="px-3 py-2 text-right text-slate-600">{formatCurrency(prov.valor)}</td>
                                            <td className="px-3 py-2 text-right font-semibold text-emerald-600">{prov.diferencial.toFixed(1)}%</td>
                                            <td className="px-3 py-2 text-right font-bold text-emerald-700">{formatCurrency(prov.ahorro)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {/* Header strip */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <div>
                        <h3 className="text-base font-bold text-slate-900 tracking-tight">Diagnóstico Inteligente</h3>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mt-0.5">Análisis de cumplimiento y oportunidades de ahorro</p>
                    </div>
                    {smartInsights.optimizationValue > 0 && (
                        <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-lg px-4 py-2 shrink-0">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Ahorro potencial</span>
                            <span className="text-lg font-bold text-rose-600 tracking-tight">{formatCurrency(smartInsights.optimizationValue)}</span>
                        </div>
                    )}
                </div>

                <div className="p-6 space-y-3">
                    {/* Positive insights */}
                    {smartInsights.insights
                        .filter(i => i.tone === 'positive')
                        .map(insight => (
                            <div key={insight.id} className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                                <div className="p-1.5 bg-emerald-100 rounded-md shrink-0">
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                </div>
                                <p className="text-sm text-slate-700 leading-relaxed font-medium">{insight.message}</p>
                            </div>
                        ))
                    }

                    {/* Warning / action cards */}
                    {smartInsights.insights.filter(i => i.tone === 'warning').length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-4 mb-3 px-1">Potencial de ahorro · actúa ahora</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {smartInsights.insights
                                    .filter(i => i.tone === 'warning')
                                    .map(insight => (
                                        <button
                                            key={insight.id}
                                            onClick={() => {
                                                if (insight.category_id) {
                                                    navigate(`/catalogo?categoria=${insight.category_id}`);
                                                } else {
                                                    navigate('/catalogo');
                                                }
                                            }}
                                            className="group text-left w-full bg-slate-50 hover:bg-slate-900 border border-slate-200 hover:border-slate-900 rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="p-1.5 bg-amber-100 group-hover:bg-amber-300/30 rounded-md shrink-0 transition-colors">
                                                    <AlertTriangle className="w-4 h-4 text-amber-600 group-hover:text-amber-300 transition-colors" />
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-white mt-0.5 shrink-0 transition-colors" />
                                            </div>
                                            <p className="text-xs text-slate-600 group-hover:text-slate-300 leading-snug mb-3 transition-colors line-clamp-3">
                                                {insight.message}
                                            </p>
                                            <div className="flex items-center gap-1.5">
                                                <ShoppingCart className="w-3.5 h-3.5 text-blue-500 group-hover:text-blue-300 transition-colors shrink-0" />
                                                <span className="text-[11px] font-bold text-blue-600 group-hover:text-blue-300 tracking-tight transition-colors">
                                                    Ver proveedores de {insight.category_name ?? 'esta categoría'} en DQ
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                }
                            </div>
                        </div>
                    )}

                    {smartInsights.insights.length === 0 && (
                        <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 border border-slate-100">
                            <CheckCircle className="w-5 h-5 text-slate-400 shrink-0" />
                            <p className="text-sm text-slate-500">No hay datos suficientes para generar un diagnóstico en este periodo.</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default DashboardAnalytics;
