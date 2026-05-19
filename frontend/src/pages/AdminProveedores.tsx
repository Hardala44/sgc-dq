import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CategoriaRow { id: number; nombre: string; }

interface ProveedorRow {
    id: number;
    nombre: string;
    logo_url: string;
    logo?: File;
    contacto_nombre: string;
    contacto_email: string;
    contacto_telefono: string;
    descripcion_larga: string;
    condiciones_especiales: string;
    descuento_dq: string;
    descuento_mercado: string;
    ahorro_estimado: string | null;
    modo_pedido: string;
    tipo_interaccion: string;
    url_web: string;
    url_catalogo: string;
    codigo_descuento: string;
    es_estrategico: boolean;
    activo: boolean;
    categorias: number[];
    categorias_nombres: string[];
}
type ProveedorForm = Partial<ProveedorRow>;

const MODO_PEDIDO_OPTIONS = [
    { value: 'email_pedido',    label: 'Email Pedido' },
    { value: 'redireccion_web', label: 'Redirección Web' },
    { value: 'api_rest',        label: 'API REST' },
    { value: 'edi',             label: 'EDI' },
];
const TIPO_INTERACCION_OPTIONS = [
    { value: 'link',      label: 'Link directo' },
    { value: 'lead_form', label: 'Formulario Lead' },
];

const inp = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#00a7e1] focus:ring-2 focus:ring-[#00a7e1]/20 bg-white';
const fieldLabel = (text: string) => <label className="block text-xs font-medium text-slate-600 mb-1">{text}</label>;

const Badge = ({ active }: { active: boolean }) => (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
        {active ? 'Activo' : 'Inactivo'}
    </span>
);

const SectionTitle = ({ children }: { children: ReactNode }) => (
    <div className="col-span-2 mt-2 mb-0.5 pb-1 border-b border-slate-100">
        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{children}</span>
    </div>
);

// ─── AdminProveedores ─────────────────────────────────────────────────────────
const AdminProveedores = () => {
    const [proveedores, setProveedores] = useState<ProveedorRow[]>([]);
    const [categorias,  setCategorias]  = useState<CategoriaRow[]>([]);
    const [loading,     setLoading]     = useState(true);
    const [query,       setQuery]       = useState('');
    const [form,        setForm]        = useState<ProveedorForm | null>(null);
    const [deleteId,    setDeleteId]    = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [rp, rc] = await Promise.all([
                api.get('/proveedores/'),
                api.get('/categorias/'),
            ]);
            setProveedores(rp.data.results ?? rp.data);
            setCategorias(rc.data.results ?? rc.data);
        } catch { toast.error('Error cargando proveedores'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const toggleCategoria = (id: number) => {
        setForm(f => {
            if (!f) return f;
            const current = f.categorias ?? [];
            const next = current.includes(id) ? current.filter(c => c !== id) : [...current, id];
            return { ...f, categorias: next };
        });
    };

    const save = async () => {
        if (!form) return;
        try {
            const fd = new FormData();
            const skip = new Set(['categorias', 'categorias_nombres', 'logo_url']);
            (Object.entries(form) as [string, unknown][]).forEach(([k, v]) => {
                if (skip.has(k) || v === undefined || v === null) return;
                fd.append(k, v instanceof File ? v : String(v));
            });
            // External logo URL (only send if not empty)
            if (form.logo_url) fd.append('logo_url', form.logo_url);
            // M2M: send each category ID separately
            (form.categorias ?? []).forEach(id => fd.append('categorias', String(id)));
            if (form.id) {
                await api.patch(`/proveedores/${form.id}/`, fd);
                toast.success('Proveedor actualizado');
            } else {
                await api.post('/proveedores/', fd);
                toast.success('Proveedor creado');
            }
            setForm(null);
            load();
        } catch { toast.error('Error guardando proveedor'); }
    };

    const del = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/proveedores/${deleteId}/`);
            toast.success('Proveedor eliminado');
            load();
        } catch { toast.error('Error eliminando proveedor'); }
        setDeleteId(null);
    };

    const filtered = query
        ? proveedores.filter(p => p.nombre.toLowerCase().includes(query.toLowerCase()))
        : proveedores;

    return (
        <div className="max-w-6xl">
            {/* Delete confirm */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-base font-bold text-slate-900 mb-2">Eliminar proveedor</h3>
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
                    <h1 className="text-lg font-bold text-slate-900">Proveedores</h1>
                    <p className="text-xs text-slate-500 mt-0.5">{proveedores.length} proveedores en la plataforma</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Buscar proveedor..."
                        className="w-48 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#00a7e1] bg-white"
                    />
                    <button
                        onClick={() => setForm({ activo: true, modo_pedido: 'email_pedido', tipo_interaccion: 'link', categorias: [] })}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Proveedor
                    </button>
                </div>
            </div>

            {/* Inline form */}
            {form !== null && (
                <div className="mb-5 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-slate-800">{form.id ? 'Editar' : 'Nuevo'} Proveedor</h3>
                        <button onClick={() => setForm(null)}><X className="w-4 h-4 text-slate-400" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">

                        {/* ── Identificación ── */}
                        <SectionTitle>Identificación</SectionTitle>
                        <div>
                            {fieldLabel('Nombre *')}
                            <input value={form.nombre || ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className={inp} />
                        </div>
                        <div className="flex items-center gap-3 self-end pb-1">
                            <input type="checkbox" id="prov-activo" checked={form.activo ?? true} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-[#00a7e1]" />
                            <label htmlFor="prov-activo" className="text-sm font-medium text-slate-700">Activo</label>
                            <input type="checkbox" id="prov-estrategico" checked={form.es_estrategico ?? false} onChange={e => setForm(f => ({ ...f, es_estrategico: e.target.checked }))} className="w-4 h-4 rounded border-slate-300 text-[#00a7e1]" />
                            <label htmlFor="prov-estrategico" className="text-sm font-medium text-slate-700">Estratégico</label>
                        </div>

                        {/* ── Imagen / Logo ── */}
                        <SectionTitle>Imagen / Logo</SectionTitle>
                        <div>
                            {fieldLabel('Subir imagen (archivo)')}
                            <input
                                type="file" accept="image/*"
                                onChange={e => { if (e.target.files?.[0]) setForm(f => ({ ...f, logo: e.target.files![0] })); }}
                                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                            />
                        </div>
                        <div>
                            {fieldLabel('URL externa del logo')}
                            <input type="url" value={form.logo_url || ''} onChange={e => setForm(f => ({ ...f, logo_url: e.target.value }))} className={inp} placeholder="https://..." />
                        </div>

                        {/* ── Contacto ── */}
                        <SectionTitle>Contacto</SectionTitle>
                        <div>
                            {fieldLabel('Persona de contacto')}
                            <input value={form.contacto_nombre || ''} onChange={e => setForm(f => ({ ...f, contacto_nombre: e.target.value }))} className={inp} />
                        </div>
                        <div>
                            {fieldLabel('Email')}
                            <input type="email" value={form.contacto_email || ''} onChange={e => setForm(f => ({ ...f, contacto_email: e.target.value }))} className={inp} />
                        </div>
                        <div>
                            {fieldLabel('Teléfono')}
                            <input value={form.contacto_telefono || ''} onChange={e => setForm(f => ({ ...f, contacto_telefono: e.target.value }))} className={inp} />
                        </div>

                        {/* ── Web & Links ── */}
                        <SectionTitle>Web & Enlace</SectionTitle>
                        <div>
                            {fieldLabel('Web del proveedor')}
                            <input type="url" value={form.url_web || ''} onChange={e => setForm(f => ({ ...f, url_web: e.target.value }))} className={inp} placeholder="https://" />
                        </div>
                        <div>
                            {fieldLabel('URL Catálogo')}
                            <input type="url" value={form.url_catalogo || ''} onChange={e => setForm(f => ({ ...f, url_catalogo: e.target.value }))} className={inp} placeholder="https://" />
                        </div>
                        <div>
                            {fieldLabel('Código de descuento')}
                            <input value={form.codigo_descuento || ''} onChange={e => setForm(f => ({ ...f, codigo_descuento: e.target.value }))} className={inp} />
                        </div>
                        <div>
                            {fieldLabel('Tipo de interacción')}
                            <select value={form.tipo_interaccion || 'link'} onChange={e => setForm(f => ({ ...f, tipo_interaccion: e.target.value }))} className={inp}>
                                {TIPO_INTERACCION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            {fieldLabel('Modo de pedido')}
                            <select value={form.modo_pedido || 'email_pedido'} onChange={e => setForm(f => ({ ...f, modo_pedido: e.target.value }))} className={inp}>
                                {MODO_PEDIDO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>

                        {/* ── Descuentos & Ahorro ── */}
                        <SectionTitle>Descuentos & Ahorro</SectionTitle>
                        <div>
                            {fieldLabel('Descuento DQ (%)')}
                            <input type="number" step="0.01" min="0" max="100" value={form.descuento_dq || ''} onChange={e => setForm(f => ({ ...f, descuento_dq: e.target.value }))} className={inp} placeholder="0.00" />
                        </div>
                        <div>
                            {fieldLabel('Descuento Mercado (%)')}
                            <input type="number" step="0.01" min="0" max="100" value={form.descuento_mercado || ''} onChange={e => setForm(f => ({ ...f, descuento_mercado: e.target.value }))} className={inp} placeholder="0.00" />
                        </div>
                        <div>
                            {fieldLabel('Ahorro estimado (%)')}
                            <div className="relative">
                                <input
                                    type="number" step="0.01" min="0" max="100"
                                    value={form.ahorro_estimado != null ? (parseFloat(form.ahorro_estimado as string) * 100).toFixed(2) : ''}
                                    onChange={e => setForm(f => ({ ...f, ahorro_estimado: e.target.value ? String(parseFloat(e.target.value) / 100) : null }))}
                                    className={inp} placeholder="Ej: 8 para 8%"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">%</span>
                            </div>
                        </div>

                        {/* ── Categorías ── */}
                        <SectionTitle>Categorías</SectionTitle>
                        <div className="col-span-2">
                            {categorias.length === 0 ? (
                                <p className="text-xs text-slate-400">No hay categorías disponibles.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {categorias.map(cat => {
                                        const selected = (form.categorias ?? []).includes(cat.id);
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => toggleCategoria(cat.id)}
                                                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                                    selected
                                                        ? 'bg-[#00a7e1] border-[#00a7e1] text-white'
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-[#00a7e1]'
                                                }`}
                                            >
                                                {cat.nombre}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* ── Descripción & Condiciones ── */}
                        <SectionTitle>Descripción & Condiciones DQ</SectionTitle>
                        <div className="col-span-2">
                            {fieldLabel('Descripción')}
                            <textarea value={form.descripcion_larga || ''} onChange={e => setForm(f => ({ ...f, descripcion_larga: e.target.value }))} rows={3} className={`${inp} resize-none`} />
                        </div>
                        <div className="col-span-2">
                            {fieldLabel('Condiciones especiales DQ')}
                            <textarea value={form.condiciones_especiales || ''} onChange={e => setForm(f => ({ ...f, condiciones_especiales: e.target.value }))} rows={3} className={`${inp} resize-none`} placeholder="Condiciones de la alianza, descuentos exclusivos, requisitos de compra mínima..." />
                        </div>

                    </div>
                    <div className="flex gap-3 mt-5">
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
                            <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 w-10">Logo</th>
                            <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Nombre</th>
                            <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</th>
                            <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Modo Pedido</th>
                            <th className="text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">% Ahorro</th>
                            <th className="text-center px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado</th>
                            <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td></tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">No hay proveedores.</td></tr>
                        ) : filtered.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-2.5">
                                    {p.logo_url
                                        ? <img src={p.logo_url} alt="" className="h-6 w-12 object-contain" />
                                        : <div className="w-12 h-6 bg-slate-100 rounded" />
                                    }
                                </td>
                                <td className="px-4 py-2.5 font-medium text-slate-900">{p.nombre}</td>
                                <td className="px-4 py-2.5 text-slate-500">{p.contacto_email}</td>
                                <td className="px-4 py-2.5 text-slate-500">
                                    <span className="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded">{p.modo_pedido}</span>
                                </td>
                                <td className="px-4 py-2.5 text-center font-semibold text-emerald-700">{p.ahorro_estimado ? (parseFloat(p.ahorro_estimado) * 100).toFixed(2) : '0.00'}%</td>
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

export default AdminProveedores;
