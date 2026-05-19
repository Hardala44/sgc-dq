import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, ImageIcon, ExternalLink } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface OfertaDestacadaRow {
    id: number;
    titulo: string;
    imagen: string;
    imagen_url: string | null;
    url_destino: string;
    activa: boolean;
    orden: number;
    fecha_creacion: string;
}
type OfertaForm = Partial<OfertaDestacadaRow> & { imagenFile?: File };

const inp = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1] focus:ring-2 focus:ring-[#00a7e1]/20 bg-white';

const Badge = ({ active }: { active: boolean }) => (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
        {active ? 'Activa' : 'Inactiva'}
    </span>
);

// ─── AdminOfertas ─────────────────────────────────────────────────────────────
const AdminOfertas = () => {
    const [ofertas,  setOfertas]  = useState<OfertaDestacadaRow[]>([]);
    const [loading,  setLoading]  = useState(true);
    const [form,     setForm]     = useState<OfertaForm | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const r = await api.get('/ofertas-destacadas/');
            setOfertas(r.data.results ?? r.data);
        } catch { toast.error('Error cargando ofertas'); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const save = async () => {
        if (!form) return;
        try {
            const fd = new FormData();
            if (form.titulo)       fd.append('titulo',      form.titulo);
            if (form.url_destino !== undefined) fd.append('url_destino', form.url_destino);
            fd.append('activa', String(form.activa ?? true));
            fd.append('orden',  String(form.orden  ?? 0));
            if (form.imagenFile)   fd.append('imagen', form.imagenFile);
            if (form.id) {
                await api.patch(`/ofertas-destacadas/${form.id}/`, fd);
                toast.success('Oferta actualizada');
            } else {
                await api.post('/ofertas-destacadas/', fd);
                toast.success('Oferta creada');
            }
            setForm(null);
            load();
        } catch { toast.error('Error guardando oferta'); }
    };

    const del = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/ofertas-destacadas/${deleteId}/`);
            toast.success('Oferta eliminada');
            load();
        } catch { toast.error('Error eliminando oferta'); }
        setDeleteId(null);
    };

    return (
        <div className="max-w-6xl">

            {/* Delete confirm */}
            {deleteId !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-base font-bold text-slate-900 mb-2">Eliminar oferta</h3>
                        <p className="text-sm text-slate-500 mb-5">Esta oferta dejará de aparecer en el home. La acción es irreversible.</p>
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
                    <h1 className="text-lg font-bold text-slate-900">Ofertas del Home</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Banners de ofertas exclusivas visibles en el inicio de las clínicas</p>
                </div>
                <button
                    onClick={() => setForm({ activa: true, orden: 0, url_destino: '' })}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Nueva Oferta
                </button>
            </div>

            {/* Form */}
            {form !== null && (
                <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-sm font-bold text-slate-800">{form.id ? 'Editar' : 'Nueva'} Oferta Destacada</h3>
                        <button onClick={() => setForm(null)}><X className="w-4 h-4 text-slate-400" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Nombre / Título</label>
                            <input
                                value={form.titulo || ''}
                                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                                placeholder="Ej: Oferta de lanzamiento DentalQuality"
                                className={inp}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-slate-600 mb-1">Enlace (URL de destino)</label>
                            <input
                                type="url"
                                value={form.url_destino || ''}
                                onChange={e => setForm(f => ({ ...f, url_destino: e.target.value }))}
                                placeholder="https://proveedor.com/oferta"
                                className={inp}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Imagen del flyer</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={e => { if (e.target.files?.[0]) setForm(f => ({ ...f, imagenFile: e.target.files![0] })); }}
                                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-xl file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                            />
                            {/* Preview */}
                            {form.imagenFile ? (
                                <img src={URL.createObjectURL(form.imagenFile)} alt="preview" className="mt-2 h-24 rounded-xl object-cover border border-slate-200" />
                            ) : form.imagen_url ? (
                                <img src={form.imagen_url} alt="actual" className="mt-2 h-24 rounded-xl object-cover border border-slate-200" />
                            ) : null}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">Orden (menor = primero)</label>
                            <input
                                type="number"
                                value={form.orden ?? 0}
                                onChange={e => setForm(f => ({ ...f, orden: Number(e.target.value) }))}
                                className={inp}
                                min={0}
                            />
                        </div>

                        <div className="md:col-span-2 flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="of-activa"
                                checked={form.activa ?? true}
                                onChange={e => setForm(f => ({ ...f, activa: e.target.checked }))}
                                className="w-4 h-4 rounded border-slate-300 text-[#00a7e1]"
                            />
                            <label htmlFor="of-activa" className="text-sm font-medium text-slate-700">Activa (visible en el home de clínicas)</label>
                        </div>

                    </div>
                    <div className="flex gap-3 mt-5">
                        <button onClick={save} className="px-4 py-2 text-sm font-semibold bg-[#00a7e1] text-white rounded-xl hover:bg-[#0090c0] transition-colors">Guardar</button>
                        <button onClick={() => setForm(null)} className="px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
                    </div>
                </div>
            )}

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-pulse">
                            <div className="w-full h-36 bg-slate-100" />
                            <div className="p-4 space-y-2">
                                <div className="h-4 bg-slate-100 rounded w-3/4" />
                                <div className="h-3 bg-slate-100 rounded w-1/2" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : ofertas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <ImageIcon className="w-12 h-12 mb-3 text-slate-200" />
                    <p className="text-sm font-medium">No hay ofertas destacadas todavía</p>
                    <p className="text-xs mt-1">Crea la primera oferta para que aparezca en el home de las clínicas</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ofertas.map(o => (
                        <div key={o.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
                            {o.imagen_url ? (
                                <img src={o.imagen_url} alt={o.titulo} className="w-full h-36 object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ) : (
                                <div className="w-full h-36 bg-slate-100 flex items-center justify-center">
                                    <ImageIcon className="w-8 h-8 text-slate-300" />
                                </div>
                            )}
                            <div className="p-4">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <p className="font-semibold text-slate-800 text-sm leading-snug">{o.titulo}</p>
                                    <Badge active={o.activa} />
                                </div>
                                {o.url_destino && (
                                    <a
                                        href={o.url_destino}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs text-[#00a7e1] hover:underline truncate"
                                    >
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                        {o.url_destino}
                                    </a>
                                )}
                                <p className="text-xs text-slate-400 mt-1">Orden: {o.orden}</p>
                                <div className="flex gap-2 mt-3">
                                    <button
                                        onClick={() => setForm({ ...o, imagenFile: undefined })}
                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" /> Editar
                                    </button>
                                    <button
                                        onClick={() => setDeleteId(o.id)}
                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Eliminar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminOfertas;
