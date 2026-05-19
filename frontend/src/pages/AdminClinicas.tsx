import { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Building2, Users, LayoutGrid, Plus, Edit2, Trash2, X } from 'lucide-react';
import api from '../services/api';
import { useClinic } from '../context/ClinicContext';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClinicRow {
    id: string;
    nombre: string;
    activa: boolean;
    num_boxes: number | null;
    cif: string;
    nombre_fiscal: string;
    num_usuarios?: number;
}

type ClinicForm = Partial<Omit<ClinicRow, 'id'>> & { id?: string };

// ─── Shared input style ───────────────────────────────────────────────────────
const inp = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#00a7e1] focus:ring-2 focus:ring-[#00a7e1]/20 bg-white';

// ─── AdminClinicas ────────────────────────────────────────────────────────────
const AdminClinicas = () => {
    const [clinics, setClinics]   = useState<ClinicRow[]>([]);
    const [loading, setLoading]   = useState(true);
    const [query, setQuery]       = useState('');
    const [form, setForm]         = useState<ClinicForm | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { activeClinicId, isViewingAs, setActiveClinic, resetToOwnClinic } = useClinic();

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [manageRes, statsRes] = await Promise.all([
                api.get('/core/admin/clinics/manage/'),
                api.get('/core/admin/global-stats/'),
            ]);
            const userCountMap: Record<string, number> = {};
            (statsRes.data.clinicas ?? []).forEach((c: { id: string; num_usuarios: number }) => {
                userCountMap[c.id] = c.num_usuarios;
            });
            setClinics(manageRes.data.map((c: ClinicRow) => ({
                ...c,
                num_usuarios: userCountMap[c.id] ?? 0,
            })));
        } catch {
            toast.error('Error cargando clínicas');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const save = async () => {
        if (!form) return;
        try {
            if (form.id) {
                await api.patch(`/core/admin/clinics/manage/${form.id}/`, form);
                toast.success('Clínica actualizada');
            } else {
                await api.post('/core/admin/clinics/manage/', form);
                toast.success('Clínica creada');
            }
            setForm(null);
            load();
        } catch { toast.error('Error guardando clínica'); }
    };

    const del = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/core/admin/clinics/manage/${deleteId}/`);
            toast.success('Clínica eliminada');
            load();
        } catch { toast.error('Error eliminando clínica'); }
        setDeleteId(null);
    };

    const handleViewAs = (c: ClinicRow) => {
        if (isViewingAs && activeClinicId === c.id) {
            resetToOwnClinic();
            toast.success('Vista de auditoría desactivada');
        } else {
            setActiveClinic({ id: c.id, nombre: c.nombre });
            toast.success(`Auditando: ${c.nombre}`, { icon: '🔍' });
        }
    };

    const filtered = query
        ? clinics.filter(c => c.nombre.toLowerCase().includes(query.toLowerCase()))
        : clinics;

    return (
        <div className="max-w-6xl">
            {/* Delete confirm */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-base font-bold text-slate-900 mb-2">Eliminar clínica</h3>
                        <p className="text-sm text-slate-500 mb-5">Esta acción es irreversible. ¿Continuar?</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200">Cancelar</button>
                            <button onClick={del} className="px-4 py-2 text-sm font-semibold bg-red-500 text-white rounded-xl hover:bg-red-600">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-lg font-bold text-slate-900">Clínicas</h1>
                    <p className="text-xs text-slate-500 mt-0.5">{clinics.length} centros en el sistema</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Buscar..."
                        className="w-48 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#00a7e1] bg-white"
                    />
                    <button
                        onClick={() => setForm({ activa: true })}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Añadir Clínica
                    </button>
                </div>
            </div>

            {/* Inline form */}
            {form !== null && (
                <div className="mb-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-800">{form.id ? 'Editar' : 'Nueva'} Clínica</h3>
                        <button onClick={() => setForm(null)} className="p-1 rounded hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
                            <input value={form.nombre || ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={inp} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">CIF</label>
                            <input value={form.cif || ''} onChange={e => setForm(f => ({ ...f, cif: e.target.value }))} className={inp} placeholder="B12345678" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre Fiscal</label>
                            <input value={form.nombre_fiscal || ''} onChange={e => setForm(f => ({ ...f, nombre_fiscal: e.target.value }))} className={inp} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Número de Boxes</label>
                            <input type="number" min="0" value={form.num_boxes ?? ''} onChange={e => setForm(f => ({ ...f, num_boxes: e.target.value ? Number(e.target.value) : null }))} className={inp} />
                        </div>
                        <div className="flex items-center gap-2 self-end pb-1">
                            <input type="checkbox" id="clinic-activa" checked={form.activa ?? true} onChange={e => setForm(f => ({ ...f, activa: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-[#00a7e1]" />
                            <label htmlFor="clinic-activa" className="text-sm text-slate-700 font-medium">Clínica Activa</label>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={save} className="px-4 py-2 text-sm font-semibold bg-[#00a7e1] text-white rounded-lg hover:bg-[#0090c0] transition-colors">Guardar</button>
                        <button onClick={() => setForm(null)} className="px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">Cancelar</button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> Clínica</span>
                            </th>
                            <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">CIF</th>
                            <th className="text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <span className="flex items-center justify-center gap-1"><LayoutGrid className="w-3 h-3" /> Boxes</span>
                            </th>
                            <th className="text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                <span className="flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Usuarios</span>
                            </th>
                            <th className="text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado</th>
                            <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <tr key={i}>
                                    <td colSpan={6} className="px-4 py-3">
                                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                    </td>
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">
                                    {query ? 'Sin resultados.' : 'No hay clínicas registradas.'}
                                </td>
                            </tr>
                        ) : filtered.map(c => {
                            const isAuditing = isViewingAs && activeClinicId === c.id;
                            return (
                                <tr key={c.id} className={`transition-colors ${isAuditing ? 'bg-amber-50' : 'hover:bg-slate-50'}`}>
                                    <td className="px-4 py-2.5 font-medium text-slate-900">
                                        <div className="flex items-center gap-2">
                                            {isAuditing && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500 text-white">
                                                    Auditando
                                                </span>
                                            )}
                                            {c.nombre}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{c.cif || '—'}</td>
                                    <td className="px-4 py-2.5 text-center text-slate-600">{c.num_boxes ?? '—'}</td>
                                    <td className="px-4 py-2.5 text-center text-slate-600">{c.num_usuarios ?? 0}</td>
                                    <td className="px-4 py-2.5 text-center">
                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${c.activa ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                            {c.activa ? 'Activa' : 'Inactiva'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => handleViewAs(c)}
                                                title={isAuditing ? 'Salir de auditoría' : 'Auditar clínica'}
                                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors
                                                    ${isAuditing ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                            >
                                                {isAuditing ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                            </button>
                                            <button onClick={() => setForm(c)} title="Editar" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => setDeleteId(c.id)} title="Eliminar" className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminClinicas;
