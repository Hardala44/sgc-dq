import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Users, ShoppingBag, Tag, Coins, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Key, Eye, EyeOff, X, ImageIcon, ExternalLink } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ClinicaRow { id: string; nombre: string; }
interface CategoriaRow { id: number; nombre: string; }
interface UserRow { id: number; username: string; email: string; first_name: string; last_name: string; rol: string; is_active: boolean; clinica_nombre: string; clinica_id: string; }
interface ProveedorRow { id: number; nombre: string; logo_url: string; contacto_nombre: string; contacto_email: string; contacto_telefono: string; descripcion_larga: string; descuento_dq: string; activo: boolean; logo?: File; }
interface ProductoRow { id: number; nombre: string; categoria: number; categoria_nombre: string; activo: boolean; imagen?: File; }
interface OfertaRow { id: number; titulo: string; descripcion: string; producto: number; producto_nombre: string; descuento_porcentaje: string; precio_oferta: string; fecha_inicio: string; fecha_fin: string; activa: boolean; destacada: boolean; }
interface PremioRow { id: number; nombre: string; descripcion: string; coste_puntos: number; imagen_url: string; activo: boolean; imagen?: File; }

// ─── Subcomponents ────────────────────────────────────────────────────────────
const Badge = ({ active }: { active: boolean }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
    {active ? 'Activo' : 'Inactivo'}
  </span>
);

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancelar</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors">Eliminar</button>
        </div>
      </div>
    </div>
  );
};

// ─── TAB: Users ───────────────────────────────────────────────────────────────
const TabUsuarios = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [clinicas, setClinicas] = useState<ClinicaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetResult, setResetResult] = useState<{ username: string; temp_password: string } | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState<Partial<UserRow> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try { 
      const [rUsers, rClinicas] = await Promise.all([
        api.get('/core/admin/users/'),
        api.get('/core/admin/clinics/')
      ]);
      setUsers(rUsers.data); 
      setClinicas(rClinicas.data);
    }
    catch { toast.error('Error cargando usuarios'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (u: UserRow) => {
    try {
      await api.patch(`/core/admin/users/${u.id}/`, { is_active: !u.is_active });
      toast.success(`Usuario ${!u.is_active ? 'activado' : 'desactivado'}`);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: !u.is_active } : x));
    } catch { toast.error('Error actualizando usuario'); }
  };

  const resetPass = async (u: UserRow) => {
    try {
      const r = await api.post(`/core/admin/users/${u.id}/reset-password/`);
      setResetResult({ username: u.username, temp_password: r.data.temp_password });
      setShowPass(false);
    } catch { toast.error('Error reseteando contraseña'); }
  };

  const saveUser = async () => {
    if (!form) return;
    try {
      if (form.id) {
        const r = await api.patch(`/core/admin/users/${form.id}/`, form);
        setUsers(prev => prev.map(u => u.id === form.id ? { ...u, ...r.data } : u));
        toast.success('Usuario actualizado');
      } else {
        const r = await api.post('/core/admin/users/', form);
        setUsers(prev => [...prev, r.data]);
        if (r.data.temp_password) {
          setResetResult({ username: r.data.username, temp_password: r.data.temp_password });
        } else {
          toast.success('Usuario creado');
        }
      }
      setForm(null);
      load();
    } catch { toast.error('Error guardando usuario'); }
  };

  const delUser = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/core/admin/users/${deleteId}/`);
      setUsers(prev => prev.filter(u => u.id !== deleteId));
      toast.success('Usuario eliminado físicamente');
    } catch { toast.error('Error al eliminar usuario'); }
    setDeleteId(null);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#00a7e1] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <DeleteConfirmModal isOpen={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={delUser} title="Eliminar Usuario" message="¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer." />

      <div className="flex justify-end mb-6">
        <button onClick={() => setForm({ rol: 'consulta', is_active: true })} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 transition-colors">
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </div>

      {resetResult && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4">
          <Key className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Contraseña temporal para <span className="font-bold">{resetResult.username}</span></p>
            <p className="text-xs text-amber-600 mt-1">Muéstrala ahora — no se volverá a mostrar</p>
            <div className="flex items-center gap-2 mt-2">
              <code className="flex-1 font-mono text-sm bg-white border border-amber-200 rounded-lg px-3 py-1.5">
                {showPass ? resetResult.temp_password : '••••••••••••'}
              </code>
              <button onClick={() => setShowPass(s => !s)} className="p-1.5 rounded-lg hover:bg-amber-100">
                {showPass ? <EyeOff className="w-4 h-4 text-amber-600" /> : <Eye className="w-4 h-4 text-amber-600" />}
              </button>
              <button onClick={() => { navigator.clipboard.writeText(resetResult.temp_password); toast.success('Copiado'); }} className="px-3 py-1.5 text-xs font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                Copiar
              </button>
            </div>
          </div>
          <button onClick={() => setResetResult(null)}><X className="w-4 h-4 text-amber-400" /></button>
        </div>
      )}

      {form !== null && (
        <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">{form.id ? 'Editar' : 'Nuevo'} Usuario</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
               <input value={form.first_name || ''} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1] focus:ring-2 focus:ring-[#00a7e1]/20" />
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Apellidos</label>
               <input value={form.last_name || ''} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1] focus:ring-2 focus:ring-[#00a7e1]/20" />
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Username</label>
               <input value={form.username || ''} disabled={!!form.id} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1] disabled:bg-slate-50" />
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
               <input value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1] focus:ring-2 focus:ring-[#00a7e1]/20" />
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
               <select value={form.rol || 'consulta'} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]">
                 <option value="consulta">Consulta</option>
                 <option value="clinica_admin">Admin Clínica</option>
                 <option value="admin_dq">Super Admin DQ</option>
               </select>
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Clínica Asociada</label>
               <select value={form.clinica_id || ''} onChange={e => setForm(f => ({ ...f, clinica_id: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]">
                 <option value="">-- Sin clínica --</option>
                 {clinicas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
               </select>
            </div>
            <div className="col-span-2 flex items-center gap-2 mt-2">
               <input type="checkbox" id="user-active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 text-[#00a7e1] rounded border-slate-300" />
               <label htmlFor="user-active" className="text-sm font-medium text-slate-700">Usuario Activo</label>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={saveUser} className="px-4 py-2 text-sm font-semibold bg-[#00a7e1] text-white rounded-xl hover:bg-[#0090c0] transition-colors">Guardar</button>
            <button onClick={() => setForm(null)} className="px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Usuario', 'Email', 'Clínica', 'Rol', 'Estado', 'Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">{u.first_name || u.username} {u.last_name}</td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3 text-slate-600">{u.clinica_nombre}</td>
                <td className="px-4 py-3"><span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{u.rol}</span></td>
                <td className="px-4 py-3"><Badge active={u.is_active} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggle(u)} title={u.is_active ? 'Desactivar' : 'Activar'} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                      {u.is_active ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => resetPass(u)} title="Reset contraseña" className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors">
                      <Key className="w-4 h-4" />
                    </button>
                    <button onClick={() => setForm(u)} title="Editar" className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(u.id)} title="Eliminar" className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="text-center text-slate-400 py-10 text-sm">No hay usuarios registrados</p>}
      </div>
    </div>
  );
};

// ─── TAB: Marketplace ─────────────────────────────────────────────────────────
const TabMarketplace = () => {
  const [proveedores, setProveedores] = useState<ProveedorRow[]>([]);
  const [productos, setProductos] = useState<ProductoRow[]>([]);
  const [categorias, setCategorias] = useState<CategoriaRow[]>([]);
  const [view, setView] = useState<'proveedores' | 'productos'>('proveedores');
  const [loading, setLoading] = useState(true);
  const [formProv, setFormProv] = useState<Partial<ProveedorRow> | null>(null);
  const [formProd, setFormProd] = useState<Partial<ProductoRow> | null>(null);
  const [deleteId, setDeleteId] = useState<{type: 'proveedor'|'producto', id: number} | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, prod, cat] = await Promise.all([api.get('/proveedores/'), api.get('/catalogo/'), api.get('/categorias/')]);
      setProveedores(p.data.results || p.data);
      setProductos(prod.data.results || prod.data);
      setCategorias(cat.data.results || cat.data);
    } catch { toast.error('Error cargando datos'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveProveedor = async () => {
    if (!formProv) return;
    try {
      const fd = new FormData();
      Object.entries(formProv).forEach(([k, v]) => {
        if (v !== undefined && v !== null && k !== 'logo_url') {
          fd.append(k, v instanceof File ? v : String(v));
        }
      });
      if (formProv.id) {
        await api.patch(`/proveedores/${formProv.id}/`, fd);
      } else {
        await api.post('/proveedores/', fd);
      }
      toast.success('Proveedor guardado');
      setFormProv(null);
      load();
    } catch { toast.error('Error guardando proveedor'); }
  };

  const saveProducto = async () => {
    if (!formProd) return;
    try {
      const fd = new FormData();
      Object.entries(formProd).forEach(([k, v]) => {
        if (v !== undefined && v !== null && k !== 'imagen_url') {
          fd.append(k, v instanceof File ? v : String(v));
        }
      });
      if (formProd.id) {
        await api.patch(`/productos/${formProd.id}/`, fd);
      } else {
        await api.post('/productos/', fd);
      }
      toast.success('Producto guardado');
      setFormProd(null);
      load();
    } catch { toast.error('Error guardando producto'); }
  };

  const delConfirm = async () => {
    if (!deleteId) return;
    try {
      if (deleteId.type === 'proveedor') {
         await api.delete(`/proveedores/${deleteId.id}/`);
      } else {
         await api.delete(`/productos/${deleteId.id}/`);
      }
      toast.success('Eliminado correctamente');
      load();
    } catch { toast.error('Error al eliminar'); }
    setDeleteId(null);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#00a7e1] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <DeleteConfirmModal isOpen={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={delConfirm} title="Confirmar eliminación" message="¿Estás seguro? Esta acción no se puede deshacer." />
      
      <div className="flex gap-2 mb-6">
        {(['proveedores', 'productos'] as const).map(v => (
          <button key={v} onClick={() => { setView(v); setFormProv(null); setFormProd(null); }} className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${view === v ? 'bg-[#00a7e1] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{v}</button>
        ))}
        {view === 'proveedores' && (
          <button onClick={() => setFormProv({ activo: true })} className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 transition-colors">
            <Plus className="w-4 h-4" /> Nuevo Proveedor
          </button>
        )}
        {view === 'productos' && (
          <button onClick={() => setFormProd({ activo: true })} className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 transition-colors">
            <Plus className="w-4 h-4" /> Nuevo Producto
          </button>
        )}
      </div>

      {formProv !== null && (
        <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">{formProv.id ? 'Editar' : 'Nuevo'} Proveedor</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
               <input value={formProv.nombre || ''} onChange={e => setFormProv(f => ({ ...f, nombre: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]" />
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Logo (Imagen)</label>
               <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) setFormProv(f => ({ ...f, logo: e.target.files![0] })); }} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Contacto Nombre</label>
               <input value={formProv.contacto_nombre || ''} onChange={e => setFormProv(f => ({ ...f, contacto_nombre: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]" />
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Email contacto</label>
               <input value={formProv.contacto_email || ''} onChange={e => setFormProv(f => ({ ...f, contacto_email: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]" />
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
               <input value={formProv.contacto_telefono || ''} onChange={e => setFormProv(f => ({ ...f, contacto_telefono: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]" />
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Descuento DQ (%)</label>
               <input type="number" step="0.01" value={formProv.descuento_dq || ''} onChange={e => setFormProv(f => ({ ...f, descuento_dq: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]" />
            </div>
            <div className="col-span-2">
               <label className="block text-xs font-medium text-slate-600 mb-1">Descripción Larga</label>
               <textarea value={formProv.descripcion_larga || ''} onChange={e => setFormProv(f => ({ ...f, descripcion_larga: e.target.value }))} rows={3} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1] resize-none" />
            </div>
            <div className="col-span-2 flex items-center gap-2 mt-2">
               <input type="checkbox" id="prov-active" checked={formProv.activo} onChange={e => setFormProv(f => ({ ...f, activo: e.target.checked }))} className="w-4 h-4 text-[#00a7e1] rounded border-slate-300" />
               <label htmlFor="prov-active" className="text-sm font-medium text-slate-700">Proveedor Activo</label>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={saveProveedor} className="px-4 py-2 text-sm font-semibold bg-[#00a7e1] text-white rounded-xl hover:bg-[#0090c0] transition-colors">Guardar</button>
            <button onClick={() => setFormProv(null)} className="px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {formProd !== null && (
        <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">{formProd.id ? 'Editar' : 'Nuevo'} Producto</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del Producto</label>
               <input value={formProd.nombre || ''} onChange={e => setFormProd(f => ({ ...f, nombre: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]" />
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Categoría</label>
               <select value={formProd.categoria || ''} onChange={e => setFormProd(f => ({ ...f, categoria: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]">
                 <option value="">-- Seleccionar --</option>
                 {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
               </select>
            </div>
            <div className="col-span-2">
               <label className="block text-xs font-medium text-slate-600 mb-1">Imagen (Upload)</label>
               <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) setFormProd(f => ({ ...f, imagen: e.target.files![0] })); }} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
            </div>
            <div className="col-span-2 flex items-center gap-2 mt-2">
               <input type="checkbox" id="prod-active" checked={formProd.activo} onChange={e => setFormProd(f => ({ ...f, activo: e.target.checked }))} className="w-4 h-4 text-[#00a7e1] rounded border-slate-300" />
               <label htmlFor="prod-active" className="text-sm font-medium text-slate-700">Producto Activo</label>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={saveProducto} className="px-4 py-2 text-sm font-semibold bg-[#00a7e1] text-white rounded-xl hover:bg-[#0090c0] transition-colors">Guardar</button>
            <button onClick={() => setFormProd(null)} className="px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {view === 'proveedores' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Logo', 'Nombre', 'Email', 'Desc. DQ', 'Estado', 'Acción'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {proveedores.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">{p.logo_url ? <img src={p.logo_url} alt="" className="h-6 object-contain" /> : <div className="w-8 h-6 bg-slate-100 rounded" />}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.nombre}</td>
                  <td className="px-4 py-3 text-slate-500">{p.contacto_email}</td>
                  <td className="px-4 py-3 text-emerald-600 font-semibold">{p.descuento_dq}%</td>
                  <td className="px-4 py-3"><Badge active={p.activo} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setFormProv(p)} className="p-1.5 rounded-lg hover:bg-slate-100"><Edit2 className="w-4 h-4 text-slate-400" /></button>
                      <button onClick={() => setDeleteId({type: 'proveedor', id: p.id})} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'productos' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>{['Nombre', 'Categoría', 'Estado', 'Acciones'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {productos.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.nombre}</td>
                  <td className="px-4 py-3 text-slate-500">{p.categoria_nombre}</td>
                  <td className="px-4 py-3"><Badge active={p.activo} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => setFormProd(p)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteId({type: 'producto', id: p.id})} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── TAB: Ofertas ─────────────────────────────────────────────────────────────
const TabOfertas = () => {
  const [ofertas, setOfertas] = useState<OfertaRow[]>([]);
  const [productos, setProductos] = useState<ProductoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<OfertaRow> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try { 
      const [rOf, rProd] = await Promise.all([api.get('/ofertas/'), api.get('/catalogo/')]);
      setOfertas(rOf.data.results || rOf.data);
      setProductos(rProd.data.results || rProd.data);
    }
    catch { toast.error('Error cargando ofertas'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form) return;
    try {
      if (form.id) {
        await api.patch(`/ofertas/${form.id}/`, form);
      } else {
        await api.post('/ofertas/', form);
      }
      toast.success('Oferta guardada');
      setForm(null);
      load();
    } catch { toast.error('Error guardando oferta'); }
  };

  const del = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/ofertas/${deleteId}/`);
      toast.success('Oferta eliminada');
      load();
    } catch { toast.error('Error eliminando oferta'); }
    setDeleteId(null);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#00a7e1] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <DeleteConfirmModal isOpen={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del} title="Eliminar Promoción" message="¿Seguro que deseas eliminar esta promoción?" />
      
      <div className="flex justify-end mb-6">
        <button onClick={() => setForm({ activa: true })} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 transition-colors">
          <Plus className="w-4 h-4" /> Nueva Promoción
        </button>
      </div>

      {form !== null && (
        <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">{form.id ? 'Editar' : 'Nueva'} Promoción</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
               <label className="block text-xs font-medium text-slate-600 mb-1">Título</label>
               <input value={form.titulo || ''} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]" />
            </div>
            <div className="col-span-2">
               <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
               <textarea value={form.descripcion || ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1] resize-none" />
            </div>
            <div className="col-span-2">
               <label className="block text-xs font-medium text-slate-600 mb-1">Producto Marketplace</label>
               <select value={form.producto || ''} onChange={e => setForm(f => ({ ...f, producto: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]">
                 <option value="">-- Seleccionar --</option>
                 {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
               </select>
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Descuento (%)</label>
               <input type="number" step="0.01" value={form.descuento_porcentaje || ''} onChange={e => setForm(f => ({ ...f, descuento_porcentaje: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]" />
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Precio Oferta (€)</label>
               <input type="number" step="0.01" value={form.precio_oferta || ''} onChange={e => setForm(f => ({ ...f, precio_oferta: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]" />
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Fecha Inicio</label>
               <input type="date" value={form.fecha_inicio || ''} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]" />
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Fecha Fin</label>
               <input type="date" value={form.fecha_fin || ''} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]" />
            </div>
            <div className="col-span-2 flex items-center gap-4 mt-2">
               <div className="flex items-center gap-2">
                 <input type="checkbox" id="of-active" checked={form.activa} onChange={e => setForm(f => ({ ...f, activa: e.target.checked }))} className="w-4 h-4 text-[#00a7e1] rounded border-slate-300" />
                 <label htmlFor="of-active" className="text-sm font-medium text-slate-700">Oferta Activa</label>
               </div>
               <div className="flex items-center gap-2">
                 <input type="checkbox" id="of-destacada" checked={form.destacada} onChange={e => setForm(f => ({ ...f, destacada: e.target.checked }))} className="w-4 h-4 text-amber-500 rounded border-slate-300" />
                 <label htmlFor="of-destacada" className="text-sm font-medium text-slate-700">Banner Home (Destacada)</label>
               </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={save} className="px-4 py-2 text-sm font-semibold bg-[#00a7e1] text-white rounded-xl hover:bg-[#0090c0] transition-colors">Guardar</button>
            <button onClick={() => setForm(null)} className="px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{['Título', 'Producto', 'Descuento', 'Precio', 'Vigencia', 'Estado', 'Acciones'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ofertas.map(o => (
              <tr key={o.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium text-slate-800">{o.titulo}</td>
                <td className="px-4 py-3 text-slate-600">{o.producto_nombre}</td>
                <td className="px-4 py-3 text-emerald-600 font-bold">{o.descuento_porcentaje}%</td>
                <td className="px-4 py-3 text-slate-700">{Number(o.precio_oferta).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{o.fecha_inicio} → {o.fecha_fin}</td>
                <td className="px-4 py-3"><Badge active={o.activa} /></td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => setForm(o)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setDeleteId(o.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ofertas.length === 0 && <p className="text-center text-slate-400 py-10 text-sm">No hay ofertas configuradas</p>}
      </div>
    </div>
  );
};

// ─── TAB: Loyalty / Premios ───────────────────────────────────────────────────
const TabLoyalty = () => {
  const [premios, setPremios] = useState<PremioRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<PremioRow> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try { const r = await api.get('/incentivos/premios/'); setPremios(r.data); }
    catch { toast.error('Error cargando premios'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form) return;
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== undefined && v !== null && k !== 'imagen_url') {
          fd.append(k, v instanceof File ? v : String(v));
        }
      });
      if (form.id) {
        await api.patch(`/incentivos/premios/${form.id}/`, fd);
      } else {
        await api.post('/incentivos/premios/', fd);
      }
      toast.success('Premio guardado');
      setForm(null);
      load();
    } catch { toast.error('Error guardando premio'); }
  };

  const del = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/incentivos/premios/${deleteId}/`);
      toast.success('Premio eliminado');
      load();
    } catch { toast.error('Error eliminando premio'); }
    setDeleteId(null);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#00a7e1] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <DeleteConfirmModal isOpen={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del} title="Eliminar Premio" message="¿Eliminar este premio permanentemente?" />

      <div className="flex justify-end mb-6">
        <button onClick={() => setForm({ activo: true, coste_puntos: 500 })} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 transition-colors">
          <Plus className="w-4 h-4" /> Nuevo Premio
        </button>
      </div>

      {form !== null && (
        <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">{form.id ? 'Editar' : 'Nuevo'} Premio</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Nombre</label>
              <input value={form.nombre || ''} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
              <textarea value={form.descripcion || ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1] resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Coste (DQ Coins)</label>
              <input type="number" value={form.coste_puntos || ''} onChange={e => setForm(f => ({ ...f, coste_puntos: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]" />
            </div>
            <div>
               <label className="block text-xs font-medium text-slate-600 mb-1">Imagen (Upload)</label>
               <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) setForm(f => ({ ...f, imagen: e.target.files![0] })); }} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
            </div>
            <div className="col-span-2 flex items-center gap-2 mt-2">
               <input type="checkbox" id="prem-active" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))} className="w-4 h-4 text-[#00a7e1] rounded border-slate-300" />
               <label htmlFor="prem-active" className="text-sm font-medium text-slate-700">Premio Activo</label>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <button onClick={save} className="px-4 py-2 text-sm font-semibold bg-[#00a7e1] text-white rounded-xl hover:bg-[#0090c0] transition-colors">Guardar</button>
            <button onClick={() => setForm(null)} className="px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {premios.map(p => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
            {p.imagen_url && <img src={p.imagen_url} alt={p.nombre} className="w-full h-32 object-cover rounded-xl mb-3" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{p.nombre}</p>
                {p.descripcion && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{p.descripcion}</p>}
              </div>
              <Badge active={p.activo} />
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className="flex items-center gap-1 text-amber-600 font-bold text-sm">
                <Coins className="w-3.5 h-3.5" /> {p.coste_puntos.toLocaleString('es-ES')} pts
              </span>
              <div className="flex gap-1">
                <button onClick={() => setForm(p)} className="p-1.5 rounded-lg hover:bg-slate-100"><Edit2 className="w-3.5 h-3.5 text-slate-400" /></button>
                <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
              </div>
            </div>
          </div>
        ))}
        {premios.length === 0 && <p className="col-span-3 text-center text-slate-400 py-10 text-sm">No hay premios configurados</p>}
      </div>
    </div>
  );
};

// ─── TABS CONFIG ──────────────────────────────────────────────────────────────

// ─── TAB: Ofertas Destacadas (Home banners) ───────────────────────────────────
interface OfertaDestacadaRow { id: number; titulo: string; imagen: string; imagen_url: string | null; url_destino: string; activa: boolean; orden: number; fecha_creacion: string; }

const TabOfertasDestacadas = () => {
  const [ofertas, setOfertas] = useState<OfertaDestacadaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Partial<OfertaDestacadaRow> & { imagenFile?: File } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await api.get('/ofertas-destacadas/'); setOfertas(r.data); }
    catch { toast.error('Error cargando ofertas destacadas'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form) return;
    const fd = new FormData();
    if (form.titulo) fd.append('titulo', form.titulo);
    if (form.url_destino !== undefined) fd.append('url_destino', form.url_destino);
    fd.append('activa', String(form.activa ?? true));
    fd.append('orden', String(form.orden ?? 0));
    if (form.imagenFile) fd.append('imagen', form.imagenFile);
    try {
      if (form.id) { await api.patch(`/ofertas-destacadas/${form.id}/`, fd); }
      else { await api.post('/ofertas-destacadas/', fd); }
      toast.success('Oferta guardada');
      setForm(null);
      load();
    } catch { toast.error('Error guardando oferta'); }
  };

  const del = async () => {
    if (!deleteId) return;
    try { await api.delete(`/ofertas-destacadas/${deleteId}/`); toast.success('Oferta eliminada'); load(); }
    catch { toast.error('Error eliminando oferta'); }
    setDeleteId(null);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[#00a7e1] border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <DeleteConfirmModal isOpen={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={del} title="Eliminar Oferta" message="¿Eliminar esta oferta destacada del home?" />

      <div className="flex justify-end mb-6">
        <button onClick={() => setForm({ activa: true, orden: 0, url_destino: '' })} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 text-white hover:bg-slate-700 transition-colors">
          <Plus className="w-4 h-4" /> Nueva Oferta
        </button>
      </div>

      {form !== null && (
        <div className="mb-6 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">{form.id ? 'Editar' : 'Nueva'} Oferta Destacada</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Título</label>
              <input value={form.titulo || ''} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Oferta de lanzamiento DentalQuality" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Enlace al que redirigir (URL)</label>
              <input value={form.url_destino || ''} onChange={e => setForm(f => ({ ...f, url_destino: e.target.value }))} placeholder="https://proveedor.com/oferta" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Imagen del flyer</label>
              <input type="file" accept="image/*" onChange={e => { if (e.target.files?.[0]) setForm(f => ({ ...f, imagenFile: e.target.files![0] })); }} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
              {form.imagen_url && !form.imagenFile && (
                <img src={form.imagen_url} alt="preview" className="mt-2 h-20 rounded-lg object-cover border border-slate-200" />
              )}
              {form.imagenFile && (
                <img src={URL.createObjectURL(form.imagenFile)} alt="preview" className="mt-2 h-20 rounded-lg object-cover border border-slate-200" />
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Orden (menor = antes)</label>
              <input type="number" value={form.orden ?? 0} onChange={e => setForm(f => ({ ...f, orden: Number(e.target.value) }))} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a7e1]" />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="od-active" checked={form.activa ?? true} onChange={e => setForm(f => ({ ...f, activa: e.target.checked }))} className="w-4 h-4 text-[#00a7e1] rounded border-slate-300" />
              <label htmlFor="od-active" className="text-sm font-medium text-slate-700">Oferta Activa (visible en el home)</label>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={save} className="px-4 py-2 text-sm font-semibold bg-[#00a7e1] text-white rounded-xl hover:bg-[#0090c0] transition-colors">Guardar</button>
            <button onClick={() => setForm(null)} className="px-4 py-2 text-sm font-semibold bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ofertas.map(o => (
          <div key={o.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
            {o.imagen_url ? (
              <img src={o.imagen_url} alt={o.titulo} className="w-full h-36 object-cover" />
            ) : (
              <div className="w-full h-36 bg-slate-100 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-slate-300" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-800 text-sm leading-snug">{o.titulo}</p>
                <Badge active={o.activa} />
              </div>
              {o.url_destino && (
                <a href={o.url_destino} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[#00a7e1] hover:underline mt-1 truncate">
                  <ExternalLink className="w-3 h-3 shrink-0" /> {o.url_destino}
                </a>
              )}
              <p className="text-xs text-slate-400 mt-1">Orden: {o.orden}</p>
              <div className="flex gap-2 mt-3">
                <button onClick={() => setForm({ ...o, imagenFile: undefined })} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors">
                  <Edit2 className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={() => setDeleteId(o.id)} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
        {ofertas.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-slate-400">
            <ImageIcon className="w-10 h-10 mb-3 text-slate-200" />
            <p className="text-sm">No hay ofertas destacadas. Crea la primera.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const TABS = [
  { id: 'usuarios',    label: 'Control Usuarios',     Icon: Users,       Component: TabUsuarios },
  { id: 'marketplace', label: 'Marketplace',           Icon: ShoppingBag, Component: TabMarketplace },
  { id: 'ofertas',     label: 'Promociones',           Icon: Tag,         Component: TabOfertas },
  { id: 'loyalty',          label: 'Loyalty / Premios',     Icon: Coins,       Component: TabLoyalty },
  { id: 'ofertas-home',      label: 'Crear Ofertas',          Icon: ImageIcon,   Component: TabOfertasDestacadas },
] as const;

// ─── AdminHub ─────────────────────────────────────────────────────────────────
const AdminHub = () => {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['id']>('usuarios');
  const ActiveComponent = TABS.find(t => t.id === activeTab)?.Component ?? TabUsuarios;

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-md">
          <ShieldCheck className="w-5 h-5 text-[#00a7e1]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">DQ Admin Hub</h1>
          <p className="text-sm text-slate-400">Centro de Control — Dental Quality</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 border-b border-slate-200 pb-0 overflow-x-auto no-scrollbar">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all whitespace-nowrap -mb-px ${
              activeTab === id
                ? 'border-[#00a7e1] text-[#00a7e1]'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Icon className="w-4 h-4" strokeWidth={1.8} />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default AdminHub;
