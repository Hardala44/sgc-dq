import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell,
    ReferenceLine,
    CartesianGrid,
} from 'recharts';

interface DiagnosticCategory {
    id: number;
    name: string;
    total_spend: number;
    leak_amount: number;
    status: 'in_range' | 'low' | 'leakage';
    benchmark_target: number | null;
    benchmark_pct: number | null;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    data: DiagnosticCategory[];
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

type ViewMode = 'fugas' | 'riesgo';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, viewMode }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload as DiagnosticCategory;
        return (
            <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-xl">
                <p className="text-slate-900 font-bold text-sm mb-1">{data.name}</p>
                <div className="text-slate-500 text-xs space-y-1">
                    {viewMode === 'fugas' ? (
                        <>
                            <p>Gasto Total: <span className="text-slate-900">{formatCurrency(data.total_spend)}</span></p>
                            {data.leak_amount > 0 && (
                                <p className="text-rose-700">Fuga detectada: {formatCurrency(data.leak_amount)}</p>
                            )}
                        </>
                    ) : (
                        <>
                            <p>Gasto actual: <span className="text-slate-900">{formatCurrency(data.total_spend)}</span></p>
                            {data.benchmark_target && (
                                <p className="text-amber-700">
                                    Objetivo recomendado: {formatCurrency(data.benchmark_target)} ({data.benchmark_pct}%)
                                </p>
                            )}
                            {data.benchmark_target && data.total_spend < data.benchmark_target && (
                                <p className="text-rose-700 font-semibold">
                                    Déficit: {formatCurrency(data.benchmark_target - data.total_spend)}
                                </p>
                            )}
                        </>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

const InvestmentDeepDive: React.FC<Props> = ({ isOpen, onClose, data }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('fugas');

    if (!isOpen) return null;

    // FUGAS view: categories with leakage, sorted descending
    const leakageData = data
        .filter(d => d.leak_amount > 0)
        .sort((a, b) => b.leak_amount - a.leak_amount);

    // RIESGO view: categories tagged as 'low' (under-investment)
    const riesgoData = data
        .filter(d => d.status === 'low' && d.benchmark_target !== null)
        .sort((a, b) => (a.benchmark_target! - a.total_spend) - (b.benchmark_target! - b.total_spend));


    const activeData = viewMode === 'fugas' ? leakageData : riesgoData;
    const chartDataKey = viewMode === 'fugas' ? 'leak_amount' : 'total_spend';

    const getBarColor = () => {
        if (viewMode === 'fugas') return '#f43f5e'; // rose-500
        return '#fbbf24'; // amber-400
    };

    const countFugas = data.filter(d => d.leak_amount > 0).length;
    const countRiesgo = data.filter(d => d.status === 'low').length;

    return (
        <AnimatePresence>
            <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xl"
                onClick={onClose}
            >
                <motion.div
                    key="modal"
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    onClick={e => e.stopPropagation()}
                    className="bg-white border border-slate-200 shadow-xl rounded-2xl w-full max-w-3xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-6 pt-6 pb-4 border-b border-slate-200 flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-serif text-slate-900 tracking-tight">Diagnóstico de Inversión</h2>
                            <p className="text-slate-500 text-xs mt-1 font-light">Análisis estratégico del estado financiero de tu clínica.</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors mt-1">
                            <X className="w-4 h-4 text-slate-500" />
                        </button>
                    </div>

                    {/* Toggle Tabs */}
                    <div className="flex items-center gap-2 px-6 pt-4">
                        <button
                            onClick={() => setViewMode('fugas')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                                viewMode === 'fugas'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                    : 'text-slate-500 hover:text-slate-700 bg-transparent border border-transparent'
                            }`}
                        >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Fugas de Capital
                            {countFugas > 0 && (
                                <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                    {countFugas}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setViewMode('riesgo')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                                viewMode === 'riesgo'
                                    ? 'bg-slate-100 text-slate-900 border border-slate-200'
                                    : 'text-slate-500 hover:text-slate-700 bg-transparent border border-transparent'
                            }`}
                        >
                            <TrendingDown className="w-3.5 h-3.5" />
                            Riesgo Operativo
                            {countRiesgo > 0 && (
                                <span className="bg-slate-200 text-slate-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                    {countRiesgo}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Context Banner */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={viewMode}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="px-6 pt-3"
                        >
                            {viewMode === 'fugas' ? (
                                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-rose-700 text-[11px] leading-relaxed flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <p>
                                        <span className="font-semibold">Fugas detectadas:</span>{' '}
                                        Categorías con compras realizadas fuera de la red DentalQuality. Cada euro aquí es ahorro directo recuperable.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-700 text-[11px] leading-relaxed">
                                    <span className="font-semibold">Riesgo operativo:</span>{' '}
                                    Inversión inferior al benchmark recomendado. La línea punteada marca el nivel óptimo de gasto.
                                    {riesgoData.length === 0 && (
                                        <span className="block mt-1 text-amber-600">No se han detectado categorías con sub-inversión en este período.</span>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {/* Chart */}
                    <div className="px-6 pb-6 pt-4">
                        {activeData.length > 0 ? (
                            <div className="h-[260px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={activeData}
                                        layout="vertical"
                                        margin={{ top: 4, right: 40, left: 10, bottom: 0 }}
                                        barSize={22}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            horizontal={false}
                                            stroke="#e2e8f0"
                                        />
                                        <XAxis
                                            type="number"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 10 }}
                                            tickFormatter={v => `€${(v / 1000).toFixed(0)}k`}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#475569', fontSize: 11 }}
                                            width={150}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f1f5f9' }}
                                            content={<CustomTooltip viewMode={viewMode} />}
                                        />
                                        {/* Goal Line for Riesgo view */}
                                        {viewMode === 'riesgo' && riesgoData[0]?.benchmark_target && (
                                            <ReferenceLine
                                                x={riesgoData[0].benchmark_target}
                                                stroke="#fbbf24"
                                                strokeDasharray="6 3"
                                                strokeWidth={1.5}
                                                label={{
                                                    value: 'Meta',
                                                    fill: '#fbbf24',
                                                    fontSize: 10,
                                                    fontWeight: 'bold',
                                                    position: 'top',
                                                }}
                                            />
                                        )}
                                        <Bar dataKey={chartDataKey} radius={[0, 6, 6, 0]}>
                                            {activeData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={getBarColor()} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center">
                                <div className="flex flex-col items-center justify-center gap-2 text-center">
                                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                                    <p className="text-slate-500 text-sm">
                                        {viewMode === 'fugas'
                                            ? 'No se detectaron fugas en este período.'
                                            : 'Todas las categorías están dentro del rango óptimo.'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default InvestmentDeepDive;
