import { useState, useEffect } from 'react';
import { TrendingUp, Building2, PiggyBank, ArrowUpRight } from 'lucide-react';
import api from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface GlobalStats {
    facturacion_total: number;
    ahorro_total: number;
    ahorro_gastos: number;
    clinicas_activas: number;
    top_proveedores: { id: number; nombre: string; volumen: number; num_pedidos: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({
    label,
    value,
    sub,
    icon: Icon,
    accent,
}: {
    label: string;
    value: string;
    sub?: string;
    icon: React.ElementType;
    accent: string;
}) => (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
            <span className={`inline-flex p-1.5 rounded-md ${accent}`}>
                <Icon className="w-3.5 h-3.5" strokeWidth={2} />
            </span>
        </div>
        <div>
            <p className="text-2xl font-bold text-slate-900 leading-none tracking-tight">{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
    </div>
);

// ─── AdminDashboard ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]   = useState<string | null>(null);

    useEffect(() => {
        api.get('/core/admin/global-stats/')
            .then(r => setStats(r.data))
            .catch(() => setError('No se pudieron cargar las métricas globales.'))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="px-6 py-5 max-w-5xl">

            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-lg font-bold text-slate-900 leading-tight">Global Insights</h1>
                <p className="text-xs text-slate-500 mt-0.5">Métricas agregadas de todo el grupo clínico</p>
            </div>

            {error && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">
                    {error}
                </div>
            )}

            {/* KPI grid */}
            {loading ? (
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {[0, 1, 2].map(i => (
                        <div key={i} className="bg-white border border-slate-200 rounded-lg p-4 h-24 animate-pulse" />
                    ))}
                </div>
            ) : stats && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <StatCard
                        label="Facturación Total"
                        value={fmt(stats.facturacion_total)}
                        sub="Suma histórica todos los pedidos"
                        icon={TrendingUp}
                        accent="bg-blue-50 text-blue-600"
                    />
                    <StatCard
                        label="Ahorro Generado"
                        value={fmt(stats.ahorro_gastos)}
                        sub="Suma de ahorro_aprox en histórico de gastos"
                        icon={PiggyBank}
                        accent="bg-emerald-50 text-emerald-600"
                    />
                    <StatCard
                        label="Clínicas Activas"
                        value={String(stats.clinicas_activas)}
                        sub="Centros integrados en la plataforma"
                        icon={Building2}
                        accent="bg-violet-50 text-violet-600"
                    />
                </div>
            )}

            {/* Top 5 providers table */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Top Proveedores por Volumen
                    </h2>
                    <span className="text-[10px] text-slate-400 font-medium">Histórico total</span>
                </div>

                {loading ? (
                    <div className="p-4 space-y-2">
                        {[0,1,2,3,4].map(i => (
                            <div key={i} className="h-9 bg-slate-100 rounded animate-pulse" />
                        ))}
                    </div>
                ) : stats && stats.top_proveedores.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">#</th>
                                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Proveedor</th>
                                <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Volumen</th>
                                <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Pedidos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {stats.top_proveedores.map((p, idx) => (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-2.5 text-xs font-bold text-slate-400 tabular-nums">
                                        {idx + 1}
                                    </td>
                                    <td className="px-4 py-2.5 text-sm text-slate-800 font-medium">{p.nombre}</td>
                                    <td className="px-4 py-2.5 text-right text-sm font-semibold text-slate-900 tabular-nums">
                                        {fmt(p.volumen)}
                                    </td>
                                    <td className="px-4 py-2.5 text-right text-xs text-slate-500 tabular-nums">
                                        {p.num_pedidos}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : !loading && (
                    <p className="px-4 py-6 text-sm text-slate-400 text-center">
                        No hay datos de pedidos registrados todavía.
                    </p>
                )}
            </div>

            {/* Quick actions */}
            <div className="mt-4 grid grid-cols-2 gap-3">
                <a href="/admin/clinicas" className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all group">
                    <div>
                        <p className="text-sm font-semibold text-slate-800">Gestionar Clínicas</p>
                        <p className="text-xs text-slate-400 mt-0.5">Añadir, editar y auditar centros</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" strokeWidth={1.8} />
                </a>
                <a href="/admin/proveedores" className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:shadow-sm transition-all group">
                    <div>
                        <p className="text-sm font-semibold text-slate-800">Proveedores</p>
                        <p className="text-xs text-slate-400 mt-0.5">Tarifas, descuentos y contactos DQ</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0" strokeWidth={1.8} />
                </a>
            </div>
        </div>
    );
};

export default AdminDashboard;
