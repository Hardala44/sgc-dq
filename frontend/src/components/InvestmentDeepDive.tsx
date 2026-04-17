import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, TrendingDown } from 'lucide-react';
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

const CustomTooltip = ({ active, payload, viewMode }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload as DiagnosticCategory;
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl">
                <p className="text-white font-bold text-sm mb-1">{data.name}</p>
                <div className="text-slate-300 text-xs space-y-1">
                    {viewMode === 'fugas' ? (
                        <>
                            <p>Gasto Total: <span className="text-white">{formatCurrency(data.total_spend)}</span></p>
                            {data.leak_amount > 0 && (
                                <p className="text-rose-400">Fuga detectada: {formatCurrency(data.leak_amount)}</p>
                            )}
                        </>
                    ) : (
                        <>
                            <p>Gasto actual: <span className="text-white">{formatCurrency(data.total_spend)}</span></p>
                            {data.benchmark_target && (
                                <p className="text-amber-400">
                                    Objetivo recomendado: {formatCurrency(data.benchmark_target)} ({data.benchmark_pct}%)
                                </p>
                            )}
                            {data.benchmark_target && data.total_spend < data.benchmark_target && (
                                <p className="text-rose-400 font-semibold">
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

    // For the goal reference line in riesgo view: use the max benchmark target
    const maxBenchmark = riesgoData.reduce((max, d) => Math.max(max, d.benchmark_target ?? 0), 0);

    const activeData = viewMode === 'fugas' ? leakageData : riesgoData;
    const chartDataKey = viewMode === 'fugas' ? 'leak_amount' : 'total_spend';

    const getBarColor = (entry: DiagnosticCategory) => {
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
                    className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/60 shadow-2xl rounded-2xl w-full max-w-3xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="px-6 pt-6 pb-4 border-b border-slate-800/60 flex justify-between items-start">
                        <div>
                            <h2 className="text-xl font-serif text-white tracking-tight">Diagnóstico de Inversión</h2>
                            <p className="text-slate-400 text-xs mt-1 font-light">Análisis estratégico del estado financiero de tu clínica.</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors mt-1">
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    </div>

                    {/* Toggle Tabs */}
                    <div className="flex items-center gap-2 px-6 pt-4">
                        <button
                            onClick={() => setViewMode('fugas')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                                viewMode === 'fugas'
                                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                    : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Fugas de Capital
                            {countFugas > 0 && (
                                <span className="bg-rose-500/30 text-rose-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                    {countFugas}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setViewMode('riesgo')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
                                viewMode === 'riesgo'
                                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                    : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            <TrendingDown className="w-3.5 h-3.5" />
                            Riesgo Operativo
                            {countRiesgo > 0 && (
                                <span className="bg-amber-500/30 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
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
                                <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-rose-200/70 text-[11px] leading-relaxed">
                                    <span className="text-rose-400 font-semibold">Fugas detectadas:</span>{' '}
                                    Categorías con compras realizadas fuera de la red DentalQuality. Cada euro aquí es ahorro directo recuperable.
                                </div>
                            ) : (
                                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-amber-200/70 text-[11px] leading-relaxed">
                                    <span className="text-amber-400 font-semibold">Riesgo operativo:</span>{' '}
                                    Inversión inferior al benchmark recomendado. La línea punteada marca el nivel óptimo de gasto.
                                    {riesgoData.length === 0 && (
                                        <span className="block mt-1 text-amber-300/50">No se han detectado categorías con sub-inversión en este período.</span>
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
                                            stroke="#1e293b"
                                        />
                                        <XAxis
                                            type="number"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#475569', fontSize: 10 }}
                                            tickFormatter={v => `€${(v / 1000).toFixed(0)}k`}
                                        />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                                            width={150}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#1e293b' }}
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
                                            {activeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={getBarColor(entry)} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[200px] flex items-center justify-center text-slate-600 text-sm">
                                {viewMode === 'fugas'
                                    ? '✓ No se detectaron fugas en este período.'
                                    : '✓ Todas las categorías están dentro del rango óptimo.'}
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default InvestmentDeepDive;
