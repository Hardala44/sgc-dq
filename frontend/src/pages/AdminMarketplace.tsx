import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CategoriaRow { id: number; nombre: string; }
interface ProductoRow {
    id: number;
    nombre: string;
    marca: string;
    descripcion: string;
    categoria: number;
    categoria_nombre: string;
    activo: boolean;
    imagen?: File;
    imagen_url?: string;
}
type ProductoForm = Partial<ProductoRow>;

const inp = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#00a7e1] focus:ring-2 focus:ring-[#00a7e1]/20 bg-white';

const Badge = ({ active }: { active: boolean }) => (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
        {active ? 'Activo' : 'Inactivo'}
    </span>
);

// ─── AdminMarketplace ─────────────────────────────────────────────────────────
const AdminMarketplace = () => {
    const [productos,   setProductos]  = useState<ProductoRow[]>([]);
    const [categorias,  setCategorias] = useState<CategoriaRow[]>([]);
    const [loading,     setLoading]    = useState(true);
    const [query,       setQuery]      = useState('');
    const [form,        setForm]       = useState<ProductoForm | null>(null);
    const [deleteId,    setDeleteId]   = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [pRes, cRes] = await Promise.all([
                api.get('/catalogo/'),
                api.get('/categorias/'),
            ]);
            setProductos(pRes.data.results ?? pRes.data);
            setCategorias(cRes.data.results ?? cRes.data);
        } catch { toast.error('Error cargando productos'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const save = async () => {
        if (!form) return;
        try {
            const fd = new FormData();
            (Object.entries(form) as [string, unknown][]).forEach(([k, v]) => {
                if (v !== undefined && v !== null && k !== 'imagen_url' && k !== 'categoria_nombre') {
                    fd.append(k, v instanceof File ? v : String(v));
                }
            });
            if (form.id) {
                await api.patch(`/catalogo/${form.id}/`, fd);
                toast.success('Producto actualizado');
            } else {
                await api.post('/catalogo/', fd);
                toast.success('Producto creado');
            }
            setForm(null);
            load();
        } catch { toast.error('Error guardando producto'); }
    };

    const del = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/catalogo/${deleteId}/`);
            toast.success('Producto eliminado');
            load();
        } catch { toast.error('Error eliminando producto'); }
        setDeleteId(null);
    };

    const filtered = query
        ? productos.filter(p => p.nombre.toLowerCase().includes(query.toLowerCase()) || p.marca?.toLowerCase().includes(query.toLowerCase()))
        : productos;

    return (
        <div className="max-w-6xl">
            {/* Delete confirm */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-base font-bold text-slate-900 mb-2">Eliminar producto</h3>
                        <p className="text-sm text-slate-500 mb-5">Esta acción es irreversible.</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-600 rounded-xl">Cancelar</button>
                            <button onClick={del} className="px-4 py-2 text-sm font-semibold bg-red-500 text-white rounded-xl hover:bg-red-600">Eliminar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-lg font-bold text-slate-900">Marketplace</h1>
                    <p className="text-xs text-slate-500 mt-0.5">{productos.length} productos en el catálogo maestro</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Buscar producto..."
                        className="w-48 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#00a7e1] bg-white"
                    />
                    <button
                        onClick={() => setForm({ activo: true })}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Producto
                    </button>
                </div>
            </div>

            {/* Inline form */}
            {form !== null && (
                <div className="mb-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-800">{form.id ? 'Editar' : 'Nuevo'} Producto</h3>
                        <button onClick={() => setForm(null)}><X className="w-4 h-4 text-slate-400" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre *</label>
                            <input value={form.nombre || ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={inp} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Marca</label>
                            <input value={form.marca || ''} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} className={inp} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Categoría</label>
                            <select value={form.categoria ?? ''} onChange={e => setForm(f => ({ ...f, categoria: Number(e.target.value) }))} className={inp}>
                                <option value="">-- Seleccionar --</option>
                                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
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
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
                            <textarea
                                value={form.descripcion || ''}
                                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                                rows={3}
                                className={`${inp} resize-none`}
                            />
                        </div>
                        <div className="col-span-2 flex items-center gap-2">
                            <input type="checkbox" id="prod-activo" checked={form.activo ?? true} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-[#00a7e1]" />
                            <label htmlFor="prod-activo" className="text-sm font-medium text-slate-700">Producto Activo</label>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                        <button onClick={save} className="px-4 py-2 text-sm font-semibold bg-[#00a7e1] text-white rounded-lg hover:bg-[#0090c0]">Guardar</button>
                        <button onClick={() => setForm(null)} className="px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-600 rounded-lg">Cancelar</button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Nombre</th>
                            <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Marca</th>
                            <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Categoría</th>
                            <th className="text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado</th>
                            <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">No hay productos.</td></tr>
                        ) : filtered.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2.5 font-medium text-slate-900">{p.nombre}</td>
                                <td className="px-4 py-2.5 text-slate-500">{p.marca || '—'}</td>
                                <td className="px-4 py-2.5 text-slate-600">{p.categoria_nombre}</td>
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
    );
};

export default AdminMarketplace;
