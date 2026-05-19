import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
    Loader2, CreditCard, Users, Bell,
    Construction, Shield, Eye, EyeOff, Check, Settings as SettingsIcon, Store
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = 'perfil' | 'operativos' | 'facturacion' | 'usuarios' | 'notificaciones' | 'seguridad';

interface Tab { id: TabId; label: string; icon: React.ReactNode; }

interface ClinicProfile {
    nombre: string; cif: string; nombre_fiscal: string;
    direccion: string; poblacion: string; provincia: string;
    telefono: string; email: string; num_boxes: number | null;
}

interface FieldError { [key: string]: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: Tab[] = [
    { id: 'perfil',         label: 'Perfil de la Clínica',  icon: <Store className="w-4 h-4" /> },
    { id: 'operativos',     label: 'Datos Operativos',       icon: <SettingsIcon className="w-4 h-4" /> },
    { id: 'seguridad',      label: 'Seguridad',              icon: <Shield className="w-4 h-4" /> },
    { id: 'facturacion',    label: 'Facturación',            icon: <CreditCard className="w-4 h-4" /> },
    { id: 'usuarios',       label: 'Usuarios y Permisos',    icon: <Users className="w-4 h-4" /> },
    { id: 'notificaciones', label: 'Notificaciones',         icon: <Bell className="w-4 h-4" /> },
];

const ESPECIALIDADES = ['Implantología', 'Ortodoncia', 'Estética', 'Cirugía Maxilofacial'];

// ─── Password strength helper ─────────────────────────────────────────────────

function passwordStrength(pw: string): { score: number; label: string; color: string } {
    if (!pw) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 8)  score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { score, label: 'Muy débil', color: 'bg-red-500' };
    if (score === 2) return { score, label: 'Débil',    color: 'bg-orange-400' };
    if (score === 3) return { score, label: 'Aceptable', color: 'bg-yellow-400' };
    if (score === 4) return { score, label: 'Fuerte',   color: 'bg-blue-500' };
    return { score, label: 'Muy fuerte', color: 'bg-emerald-500' };
}

// ─── Reusable UI helpers ──────────────────────────────────────────────────────

const FieldGroup = ({ label, hint, error, children }: {
    label: string; hint?: string; error?: string; children: React.ReactNode;
}) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
        {children}
        {error && <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>}
        {!error && hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
    </div>
);

const inputCls = (hasError?: boolean) =>
    `w-full px-3.5 py-2.5 rounded-lg border text-sm text-slate-800 bg-white
     placeholder:text-slate-300 focus:outline-none focus:ring-2 transition-all
     ${hasError
        ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
        : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20'}`;

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="mb-6 pb-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
);

const ComingSoon = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">{icon}</div>
        <div>
            <p className="text-sm font-semibold text-slate-500">{title}</p>
            <p className="text-xs text-slate-400 mt-1">{description}</p>
        </div>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 border border-blue-100">
            <Construction className="w-3 h-3" /> Sección en desarrollo
        </span>
    </div>
);

// ─── PerfilClinica Panel ──────────────────────────────────────────────────────

const PerfilClinica = ({ profile, setProfile, errors }: {
    profile: Partial<ClinicProfile>;
    setProfile: (p: Partial<ClinicProfile>) => void;
    errors: FieldError;
}) => {
    const set = (key: keyof ClinicProfile) => (v: string) => setProfile({ ...profile, [key]: v });
    return (
        <div className="space-y-5">
            <SectionTitle title="Perfil de la Clínica" subtitle="Información legal y de contacto de tu organización." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <FieldGroup label="Nombre de la Clínica" error={errors.nombre}>
                    <input id="nombre" type="text" value={profile.nombre || ''} onChange={e => set('nombre')(e.target.value)}
                        placeholder="Clínica Dental Ejemplo" className={inputCls(!!errors.nombre)} />
                </FieldGroup>
                <FieldGroup label="CIF / NIF" error={errors.cif}>
                    <input id="cif" type="text" value={profile.cif || ''} onChange={e => set('cif')(e.target.value)}
                        placeholder="B-12345678" className={inputCls(!!errors.cif)} />
                </FieldGroup>
                <FieldGroup label="Razón Social (Nombre Fiscal)">
                    <input id="nombre-fiscal" type="text" value={profile.nombre_fiscal || ''} onChange={e => set('nombre_fiscal')(e.target.value)}
                        placeholder="Clínica Dental Ejemplo S.L." className={inputCls()} />
                </FieldGroup>
                <FieldGroup label="Email de Contacto" error={errors.email}>
                    <input id="email" type="email" value={profile.email || ''} onChange={e => set('email')(e.target.value)}
                        placeholder="contacto@clinica.com" className={inputCls(!!errors.email)} />
                </FieldGroup>
                <FieldGroup label="Teléfono">
                    <input id="telefono" type="tel" value={profile.telefono || ''} onChange={e => set('telefono')(e.target.value)}
                        placeholder="+34 91 000 00 00" className={inputCls()} />
                </FieldGroup>
                <FieldGroup label="Población">
                    <input id="poblacion" type="text" value={profile.poblacion || ''} onChange={e => set('poblacion')(e.target.value)}
                        placeholder="Madrid" className={inputCls()} />
                </FieldGroup>
            </div>
            <FieldGroup label="Dirección">
                <textarea id="direccion" value={profile.direccion || ''} onChange={e => set('direccion')(e.target.value)}
                    placeholder="Calle Gran Vía 45, 2ª Planta, 28013 Madrid" rows={3}
                    className={`${inputCls()} resize-none`} />
            </FieldGroup>
        </div>
    );
};

// ─── DatosOperativos Panel ────────────────────────────────────────────────────

const DatosOperativos = ({ numBoxes, setNumBoxes, especialidades, setEspecialidades, teamSize, setTeamSize, errors }: {
    numBoxes: string; setNumBoxes: (v: string) => void;
    especialidades: string[]; setEspecialidades: (v: string[]) => void;
    teamSize: string; setTeamSize: (v: string) => void;
    errors: FieldError;
}) => {
    const toggle = (esp: string) =>
        setEspecialidades(especialidades.includes(esp) ? especialidades.filter(e => e !== esp) : [...especialidades, esp]);
    return (
        <div className="space-y-6">
            <SectionTitle title="Datos Operativos" subtitle="Parámetros que definen la operativa diaria de tu clínica." />
            <FieldGroup label="Número de Gabinetes (Boxes)" hint="Utilizado para calcular métricas de rentabilidad por box." error={errors.num_boxes}>
                <input id="num-boxes" type="number" min="0" step="1" value={numBoxes} onChange={e => setNumBoxes(e.target.value)}
                    placeholder="Ej: 4" className={`w-full sm:w-40 ${inputCls(!!errors.num_boxes)}`} />
            </FieldGroup>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Especialidades Principales</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ESPECIALIDADES.map(esp => {
                        const checked = especialidades.includes(esp);
                        return (
                            <label key={esp} htmlFor={`esp-${esp}`}
                                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all
                                    ${checked ? 'border-blue-500 bg-blue-50/60 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
                                    ${checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                                    {checked && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                                </div>
                                <input id={`esp-${esp}`} type="checkbox" className="sr-only" checked={checked} onChange={() => toggle(esp)} />
                                <span className="text-sm font-medium">{esp}</span>
                            </label>
                        );
                    })}
                </div>
            </div>
            <FieldGroup label="Tamaño del Equipo">
                <select id="team-size" value={teamSize} onChange={e => setTeamSize(e.target.value)}
                    className="w-full sm:w-64 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800
                               focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none
                               bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22/%3E%3C/svg%3E')]
                               bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25rem] pr-10">
                    <option value="">Selecciona un rango</option>
                    <option value="1-5">1 – 5 empleados</option>
                    <option value="6-10">6 – 10 empleados</option>
                    <option value="+10">Más de 10 empleados</option>
                </select>
            </FieldGroup>
        </div>
    );
};

// ─── Seguridad Panel ──────────────────────────────────────────────────────────

const SeguridadPanel = ({ onPasswordChanged }: { onPasswordChanged: () => void }) => {
    const [current, setCurrent]   = useState('');
    const [newPw,   setNewPw]     = useState('');
    const [confirm, setConfirm]   = useState('');
    const [showCur, setShowCur]   = useState(false);
    const [showNew, setShowNew]   = useState(false);
    const [showCon, setShowCon]   = useState(false);
    const [errors,  setErrors]    = useState<FieldError>({});
    const [saving,  setSaving]    = useState(false);

    const strength = passwordStrength(newPw);

    const validate = (): boolean => {
        const e: FieldError = {};
        if (!current)  e.current  = 'La contraseña actual es obligatoria.';
        if (!newPw)    e.new      = 'La nueva contraseña es obligatoria.';
        else if (newPw.length < 8) e.new = 'Mínimo 8 caracteres.';
        if (!confirm)  e.confirm  = 'Confirma la nueva contraseña.';
        else if (newPw && confirm !== newPw) e.confirm = 'Las contraseñas no coinciden.';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            const res = await api.post('/core/auth/change-password/', {
                current_password: current,
                new_password: newPw,
                confirm_password: confirm,
            });
            toast.success(res.data.detail || 'Contraseña actualizada.');
            setCurrent(''); setNewPw(''); setConfirm('');
            setErrors({});
            if (res.data.require_relogin) onPasswordChanged();
        } catch (err: unknown) {
            const axErr = err as { response?: { data?: { errors?: FieldError; detail?: string } } };
            const serverErrors = axErr.response?.data?.errors;
            if (serverErrors) {
                setErrors({
                    current: serverErrors.current_password || '',
                    new: serverErrors.new_password || '',
                    confirm: serverErrors.confirm_password || '',
                });
            } else {
                toast.error(axErr.response?.data?.detail || 'Error al cambiar la contraseña.');
            }
        } finally {
            setSaving(false);
        }
    };

    const PwField = ({ id, label, value, onChange, show, toggleShow, error }: {
        id: string; label: string; value: string; onChange: (v: string) => void;
        show: boolean; toggleShow: () => void; error?: string;
    }) => (
        <FieldGroup label={label} error={error}>
            <div className="relative">
                <input id={id} type={show ? 'text' : 'password'} value={value}
                    onChange={e => onChange(e.target.value)} autoComplete="new-password"
                    className={`${inputCls(!!error)} pr-10`} />
                <button type="button" onClick={toggleShow}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        </FieldGroup>
    );

    return (
        <div className="space-y-5">
            <SectionTitle title="Seguridad" subtitle="Cambia tu contraseña de acceso a la plataforma." />
            <form id="form-security" onSubmit={handleSubmit} className="max-w-md space-y-5">
                <PwField id="current-pw" label="Contraseña actual" value={current} onChange={setCurrent}
                    show={showCur} toggleShow={() => setShowCur(v => !v)} error={errors.current} />
                <div className="space-y-2">
                    <PwField id="new-pw" label="Nueva contraseña" value={newPw} onChange={setNewPw}
                        show={showNew} toggleShow={() => setShowNew(v => !v)} error={errors.new} />
                    {newPw && (
                        <div className="space-y-1">
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300
                                        ${i <= strength.score ? strength.color : 'bg-slate-200'}`} />
                                ))}
                            </div>
                            <p className="text-xs text-slate-500">{strength.label}</p>
                        </div>
                    )}
                </div>
                <PwField id="confirm-pw" label="Confirmar nueva contraseña" value={confirm} onChange={setConfirm}
                    show={showCon} toggleShow={() => setShowCon(v => !v)} error={errors.confirm} />
                <div className="pt-2">
                    <button type="submit" id="security-save-btn" disabled={saving}
                        className="inline-flex items-center gap-2 bg-[#00a7e1] hover:bg-[#008bc0] disabled:opacity-60
                                   text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors shadow-sm
                                   focus:outline-none focus:ring-2 focus:ring-[#00a7e1] focus:ring-offset-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {saving ? 'Actualizando...' : 'Actualizar Contraseña'}
                    </button>
                </div>
            </form>
        </div>
    );
};

// ─── Validation helpers ───────────────────────────────────────────────────────

function validatePerfil(profile: Partial<ClinicProfile>): FieldError {
    const e: FieldError = {};
    if (!profile.nombre?.trim()) e.nombre = 'El nombre de la clínica es obligatorio.';
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))
        e.email = 'Introduce un email válido.';
    return e;
}

function validateOperativos(numBoxes: string): FieldError {
    const e: FieldError = {};
    if (numBoxes !== '') {
        const n = Number(numBoxes);
        if (!Number.isInteger(n) || n < 0)
            e.num_boxes = 'Debe ser un número entero positivo (o déjalo vacío).';
    }
    return e;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const Settings = () => {
    const { logout } = useAuth();
    const [activeTab, setActiveTab] = useState<TabId>('perfil');
    const [loading,   setLoading]   = useState(true);
    const [saving,    setSaving]    = useState(false);

    // Perfil fields (flat, loaded from API)
    const [profile,    setProfile]    = useState<Partial<ClinicProfile>>({});
    const [fieldErrors, setFieldErrors] = useState<FieldError>({});

    // Datos Operativos extra state
    const [numBoxes,      setNumBoxes]      = useState('');
    const [especialidades, setEspecialidades] = useState<string[]>([]);
    const [teamSize,      setTeamSize]      = useState('');

    // Fetch clinic profile on mount
    const fetchSettings = useCallback(async () => {
        try {
            const res = await api.get('/core/clinics/me/');
            const d = res.data;
            setProfile({
                nombre: d.nombre || '', cif: d.cif || '',
                nombre_fiscal: d.nombre_fiscal || '', direccion: d.direccion || '',
                poblacion: d.poblacion || '', provincia: d.provincia || '',
                telefono: d.telefono || '', email: d.email || '',
            });
            setNumBoxes(d.num_boxes != null ? String(d.num_boxes) : '');
        } catch (err) {
            const error = err as { response?: { status?: number } };
            if (error.response?.status !== 400) toast.error('Error al cargar la configuración.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSettings(); }, [fetchSettings]);

    // ── Submit handlers ────────────────────────────────────────────────────────

    const handleSubmitPerfil = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validatePerfil(profile);
        setFieldErrors(errs);
        if (Object.keys(errs).length > 0) return;
        setSaving(true);
        try {
            await api.patch('/core/clinics/me/', profile);
            toast.success('Perfil actualizado correctamente.');
        } catch (err) {
            const axErr = err as { response?: { data?: { detail?: string } } };
            toast.error(axErr.response?.data?.detail || 'Error al guardar el perfil.');
        } finally { setSaving(false); }
    };

    const handleSubmitOperativos = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs = validateOperativos(numBoxes);
        setFieldErrors(errs);
        if (Object.keys(errs).length > 0) return;
        setSaving(true);
        try {
            const payload = { num_boxes: numBoxes === '' ? null : parseInt(numBoxes, 10) };
            await api.patch('/core/clinics/me/', payload);
            toast.success('Datos operativos guardados.');
            // Notify Dashboard to refresh its KPIs
            window.dispatchEvent(new CustomEvent('clinic-settings-updated', { detail: payload }));
        } catch (err) {
            const axErr = err as { response?: { data?: { detail?: string } } };
            toast.error(axErr.response?.data?.detail || 'Error al guardar los datos.');
        } finally { setSaving(false); }
    };

    const handlePasswordChanged = () => {
        toast('Sesión cerrada. Inicia sesión con tu nueva contraseña.', { icon: '🔒' });
        setTimeout(() => logout(), 2000);
    };

    if (loading) return (
        <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-slate-300" />
        </div>
    );

    const isEditable = activeTab === 'perfil' || activeTab === 'operativos';
    const onSubmit   = activeTab === 'perfil' ? handleSubmitPerfil : handleSubmitOperativos;

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Configuración</h1>
                <p className="text-sm text-slate-400 mt-1">Gestiona los parámetros y preferencias de tu organización.</p>
            </div>

            {/* Horizontal Tabs */}
            <div className="mb-8 border-b border-slate-200 overflow-x-auto hide-scrollbar">
                <nav className="flex space-x-8 min-w-max px-2">
                    {TABS.map(tab => {
                        const active = tab.id === activeTab;
                        return (
                            <button key={tab.id} id={`settings-tab-${tab.id}`}
                                onClick={() => { setActiveTab(tab.id); setFieldErrors({}); }}
                                className={`flex items-center gap-2 py-4 px-1 border-b-2 text-sm font-medium transition-all
                                            ${active
                                                ? 'border-[#00a7e1] text-[#00a7e1]'
                                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                                <span className={active ? 'text-[#00a7e1]' : 'text-slate-400'}>{tab.icon}</span>
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Content panel */}
            <form onSubmit={isEditable ? onSubmit : e => e.preventDefault()}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 min-h-[28rem]">

                {activeTab === 'perfil' && (
                    <PerfilClinica profile={profile} setProfile={setProfile} errors={fieldErrors} />
                )}
                {activeTab === 'operativos' && (
                    <DatosOperativos
                        numBoxes={numBoxes} setNumBoxes={setNumBoxes}
                        especialidades={especialidades} setEspecialidades={setEspecialidades}
                        teamSize={teamSize} setTeamSize={setTeamSize}
                        errors={fieldErrors}
                    />
                )}
                {activeTab === 'seguridad' && (
                    <SeguridadPanel onPasswordChanged={handlePasswordChanged} />
                )}
                {activeTab === 'facturacion' && (
                    <ComingSoon icon={<CreditCard className="w-6 h-6" />} title="Facturación"
                        description="Configura métodos de pago, emisión de facturas y ciclos de cobro." />
                )}
                {activeTab === 'usuarios' && (
                    <ComingSoon icon={<Users className="w-6 h-6" />} title="Usuarios y Permisos"
                        description="Gestiona el acceso y los roles del equipo dentro de la plataforma." />
                )}
                {activeTab === 'notificaciones' && (
                    <ComingSoon icon={<Bell className="w-6 h-6" />} title="Notificaciones"
                        description="Personaliza alertas, recordatorios y preferencias de comunicación." />
                )}

                {/* Save button — only for editable tabs */}
                {isEditable && (
                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                        <button type="submit" id="settings-save-btn" disabled={saving}
                            className="inline-flex items-center gap-2 bg-[#00a7e1] hover:bg-[#008bc0] disabled:opacity-60
                                       text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-colors shadow-sm
                                       focus:outline-none focus:ring-2 focus:ring-[#00a7e1] focus:ring-offset-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default Settings;
