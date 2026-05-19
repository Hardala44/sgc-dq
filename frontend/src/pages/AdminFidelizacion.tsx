import { useState, useEffect, useCallback } from 'react';
import { Gift, Coins, Plus, Edit2, Trash2, X } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PremioRow {
    id: number;
    nombre: string;
    descripcion: string;
    coste_puntos: number;
    activo: boolean;
    imagen_url?: string;
    orden: number;
    imagen?: File;
}
type PremioForm = Partial<PremioRow>;

interface ClinicCoins {
    id: string;
    nombre: string;
    puntos_acumulados: number;
}

const inp = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#00a7e1] focus:ring-2 focus:ring-[#00a7e1]/20 bg-white';

const Badge = ({ active }: { active: boolean }) => (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
        {active ? 'Activo' : 'Inactivo'}
    </span>
);

// ─── AdminFidelizacion ────────────────────────────────────────────────────────
const AdminFidelizacion = () => {
    const [premios,    setPremios]   = useState<PremioRow[]>([]);
    const [coins,      setCoins]     = useState<ClinicCoins[]>([]);
    const [loadingP,   setLoadingP]  = useState(true);
    const [loadingC,   setLoadingC]  = useState(true);
    const [form,       setForm]      = useState<PremioForm | null>(null);
    const [deleteId,   setDeleteId]  = useState<number | null>(null);

    const loadPremios = useCallback(async () => {
        setLoadingP(true);
        try {
            const r = await api.get('/incentivos/premios/');
            setPremios(r.data.results ?? r.data);
        } catch { toast.error('Error cargando premios'); }
        finally { setLoadingP(false); }
    }, []);

    const loadCoins = useCallback(async () => {
        setLoadingC(true);
        try {
            const r = await api.get('/core/admin/clinics/coins/');
            setCoins((r.data ?? []).sort((a: ClinicCoins, b: ClinicCoins) => b.puntos_acumulados - a.puntos_acumulados));
        } catch { toast.error('Error cargando DQ Coins'); }
        finally { setLoadingC(false); }
    }, []);

    useEffect(() => { loadPremios(); loadCoins(); }, [loadPremios, loadCoins]);

    const save = async () => {
        if (!form) return;
        try {
            const fd = new FormData();
            (Object.entries(form) as [string, unknown][]).forEach(([k, v]) => {
                if (v !== undefined && v !== null && k !== 'imagen_url') {
                    fd.append(k, v instanceof File ? v : String(v));
                }
            });
            if (form.id) {
                await api.patch(`/incentivos/premios/${form.id}/`, fd);
                toast.success('Premio actualizado');
            } else {
                await api.post('/incentivos/premios/', fd);
                toast.success('Premio creado');
            }
            setForm(null);
            loadPremios();
        } catch { toast.error('Error guardando premio'); }
    };

    const del = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/incentivos/premios/${deleteId}/`);
            toast.success('Premio eliminado');
            loadPremios();
        } catch { toast.error('Error eliminando premio'); }
        setDeleteId(null);
    };

    const maxCoins = coins[0]?.puntos_acumulados ?? 1;

    return (
        <div className="max-w-6xl space-y-8">
            {/* Delete confirm */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-base font-bold text-slate-900 mb-2">Eliminar premio</h3>
                        <p className="text-sm text-slate-500 mb-5">Esta acción es irreversible.</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-600 rounded-xl">Cancelar</button>
                            <button onClick={del} className="px-4 py-2 text-sm font-semibold bg-red-500 text-white rounded-xl hover:bg-red-600">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Sección 1: Catálogo de Premios ─────────────────────────── */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-[#00a7e1]" />
                        <div>
                            <h1 className="text-lg font-bold text-slate-900">Catálogo de Premios</h1>
                            <p className="text-xs text-slate-500">{premios.length} premios disponibles</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setForm({ activo: true, coste_puntos: 100, orden: premios.length + 1 })}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Premio
                    </button>
                </div>

                {/* Form */}
                {form !== null && (
                    <div className="mb-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-800">{form.id ? 'Editar' : 'Nuevo'} Premio</h3>
                            <button onClick={() => setForm(null)}><X className="w-4 h-4 text-slate-400" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
                                <input value={form.nombre || ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={inp} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Coste (DQ Coins) *</label>
                                <input type="number" min="1" value={form.coste_puntos ?? ''} onChange={e => setForm(f => ({ ...f, coste_puntos: Number(e.target.value) }))} className={inp} />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Imagen</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={e => { if (e.target.files?.[0]) setForm(f => ({ ...f, imagen: e.target.files![0] })); }}
                                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Orden</label>
                                <input type="number" min="1" value={form.orden ?? ''} onChange={e => setForm(f => ({ ...f, orden: Number(e.target.value) }))} className={inp} />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
                                <textarea value={form.descripcion || ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={3} className={`${inp} resize-none`} />
                            </div>
                            <div className="col-span-2 flex items-center gap-2">
                                <input type="checkbox" id="premio-activo" checked={form.activo ?? true} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-[#00a7e1]" />
                                <label htmlFor="premio-activo" className="text-sm font-medium text-slate-700">Premio Activo</label>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={save} className="px-4 py-2 text-sm font-semibold bg-[#00a7e1] text-white rounded-lg hover:bg-[#0090c0]">Guardar</button>
                            <button onClick={() => setForm(null)} className="px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-600 rounded-lg">Cancelar</button>
                        </div>
                    </div>
                )}

                {/* Premios table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Premio</th>
                                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 max-w-xs">Descripción</th>
                                <th className="text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Coste</th>
                                <th className="text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Orden</th>
                                <th className="text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado</th>
                                <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loadingP ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                                ))
                            ) : premios.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">No hay premios configurados.</td></tr>
                            ) : premios.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2">
                                            {p.imagen_url
                                                ? <img src={p.imagen_url} alt="" className="w-8 h-8 rounded object-cover" />
                                                : <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center"><Gift className="w-4 h-4 text-slate-300" /></div>
                                            }
                                            <span className="font-medium text-slate-900">{p.nombre}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-500 text-xs max-w-xs truncate">{p.descripcion}</td>
                                    <td className="px-4 py-2.5 text-center font-semibold text-[#00a7e1]">{p.coste_puntos.toLocaleString()}</td>
                                    <td className="px-4 py-2.5 text-center text-slate-500">{p.orden}</td>
                                    <td className="px-4 py-2.5 text-center"><Badge active={p.activo} /></td>
                                    <td className="px-4 py-2.5 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button onClick={() => setForm(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><Edit2 className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Sección 2: Auditoría DQ Coins ──────────────────────────── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <Coins className="w-5 h-5 text-amber-500" />
                    <div>
                        <h2 className="text-base font-bold text-slate-900">Auditoría DQ Coins</h2>
                        <p className="text-xs text-slate-500">Puntos acumulados por clínica</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Ranking</th>
                                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Clínica</th>
                                <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">DQ Coins</th>
                                <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-64">Distribución</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loadingC ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                                ))
                            ) : coins.length === 0 ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">No hay datos de DQ Coins.</td></tr>
                            ) : coins.map((c, i) => {
                                const pct = maxCoins > 0 ? Math.round((c.puntos_acumulados / maxCoins) * 100) : 0;
                                return (
                                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-2.5">
                                            <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold
                                                ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-50 text-slate-500'}`}>
                                                {i + 1}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 font-medium text-slate-900">{c.nombre}</td>
                                        <td className="px-4 py-2.5 text-right font-bold text-amber-600 tabular-nums">{c.puntos_acumulados.toLocaleString()}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-amber-400 rounded-full transition-all duration-700"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminFidelizacion;
