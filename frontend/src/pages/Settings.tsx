import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
    Loader2,
    Building2,
    Wrench,
    CreditCard,
    Users,
    Bell,
    ChevronRight,
    Construction,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type TabId = 'perfil' | 'operativos' | 'facturacion' | 'usuarios' | 'notificaciones';

interface Tab {
    id: TabId;
    label: string;
    icon: React.ReactNode;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS: Tab[] = [
    { id: 'perfil',          label: 'Perfil de la Clínica',   icon: <Building2 className="w-4 h-4" /> },
    { id: 'operativos',      label: 'Datos Operativos',        icon: <Wrench className="w-4 h-4" /> },
    { id: 'facturacion',     label: 'Facturación',             icon: <CreditCard className="w-4 h-4" /> },
    { id: 'usuarios',        label: 'Usuarios y Permisos',     icon: <Users className="w-4 h-4" /> },
    { id: 'notificaciones',  label: 'Notificaciones',          icon: <Bell className="w-4 h-4" /> },
];

const ESPECIALIDADES = [
    'Implantología',
    'Ortodoncia',
    'Estética',
    'Cirugía Maxilofacial',
];

// ─── Reusable UI helpers ──────────────────────────────────────────────────────

const FieldGroup = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
        {children}
        {hint && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
    </div>
);

const TextInput = ({
    id,
    value,
    onChange,
    placeholder,
    type = 'text',
    min,
}: {
    id: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    min?: string;
}) => (
    <input
        id={id}
        type={type}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800
                   placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2
                   focus:ring-blue-500/20 transition-all"
    />
);

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <div className="mb-6 pb-4 border-b border-slate-100">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
);

const ComingSoon = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            {icon}
        </div>
        <div>
            <p className="text-sm font-semibold text-slate-500">{title}</p>
            <p className="text-xs text-slate-400 mt-1">{description}</p>
        </div>
        <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 border border-blue-100">
            <Construction className="w-3 h-3" />
            Sección en desarrollo
        </span>
    </div>
);

// ─── Tab Panels ───────────────────────────────────────────────────────────────

const PerfilClinica = ({
    razonSocial, setRazonSocial,
    cifNif, setCifNif,
    email, setEmail,
    direccion, setDireccion,
}: {
    razonSocial: string; setRazonSocial: (v: string) => void;
    cifNif: string; setCifNif: (v: string) => void;
    email: string; setEmail: (v: string) => void;
    direccion: string; setDireccion: (v: string) => void;
}) => (
    <div className="space-y-5">
        <SectionTitle
            title="Perfil de la Clínica"
            subtitle="Información legal y de contacto de tu organización."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FieldGroup label="Razón Social">
                <TextInput
                    id="razon-social"
                    value={razonSocial}
                    onChange={setRazonSocial}
                    placeholder="Clínica Dental Ejemplo S.L."
                />
            </FieldGroup>
            <FieldGroup label="CIF / NIF">
                <TextInput
                    id="cif-nif"
                    value={cifNif}
                    onChange={setCifNif}
                    placeholder="B-12345678"
                />
            </FieldGroup>
            <FieldGroup label="Email de Contacto">
                <TextInput
                    id="email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="contacto@clinica.com"
                />
            </FieldGroup>
        </div>
        <FieldGroup label="Dirección">
            <textarea
                id="direccion"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Calle Gran Vía 45, 2ª Planta, 28013 Madrid"
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800
                           placeholder:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2
                           focus:ring-blue-500/20 transition-all resize-none"
            />
        </FieldGroup>
    </div>
);

const DatosOperativos = ({
    numBoxes, setNumBoxes,
    especialidades, setEspecialidades,
    teamSize, setTeamSize,
}: {
    numBoxes: string; setNumBoxes: (v: string) => void;
    especialidades: string[]; setEspecialidades: (v: string[]) => void;
    teamSize: string; setTeamSize: (v: string) => void;
}) => {
    const toggleEsp = (esp: string) => {
        setEspecialidades(
            especialidades.includes(esp)
                ? especialidades.filter((e) => e !== esp)
                : [...especialidades, esp],
        );
    };

    return (
        <div className="space-y-6">
            <SectionTitle
                title="Datos Operativos"
                subtitle="Parámetros que definen la operativa diaria de tu clínica."
            />

            {/* Número de boxes */}
            <FieldGroup
                label="Número de Gabinetes (Boxes)"
                hint="Utilizado para calcular métricas de rentabilidad por box."
            >
                <TextInput
                    id="num-boxes"
                    type="number"
                    min="0"
                    value={numBoxes}
                    onChange={setNumBoxes}
                    placeholder="Ej: 4"
                />
            </FieldGroup>

            {/* Especialidades */}
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">
                    Especialidades Principales
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ESPECIALIDADES.map((esp) => {
                        const checked = especialidades.includes(esp);
                        return (
                            <label
                                key={esp}
                                htmlFor={`esp-${esp}`}
                                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all
                                    ${checked
                                        ? 'border-blue-500 bg-blue-50/60 text-blue-700'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors
                                    ${checked ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}
                                >
                                    {checked && (
                                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                                <input
                                    id={`esp-${esp}`}
                                    type="checkbox"
                                    className="sr-only"
                                    checked={checked}
                                    onChange={() => toggleEsp(esp)}
                                />
                                <span className="text-sm font-medium">{esp}</span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Tamaño del equipo */}
            <FieldGroup label="Tamaño del Equipo">
                <select
                    id="team-size"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    className="w-full sm:w-64 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800
                               focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none
                               bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22/%3E%3C/svg%3E')]
                               bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25rem] pr-10"
                >
                    <option value="">Selecciona un rango</option>
                    <option value="1-5">1 – 5 empleados</option>
                    <option value="6-10">6 – 10 empleados</option>
                    <option value="+10">Más de 10 empleados</option>
                </select>
            </FieldGroup>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Settings = () => {
    const [activeTab, setActiveTab] = useState<TabId>('perfil');
    const [loading, setLoading]     = useState(true);
    const [saving, setSaving]       = useState(false);

    // Perfil de Clínica fields
    const [razonSocial, setRazonSocial] = useState('');
    const [cifNif, setCifNif]           = useState('');
    const [email, setEmail]             = useState('');
    const [direccion, setDireccion]     = useState('');

    // Datos Operativos fields
    const [numBoxes, setNumBoxes]           = useState('');
    const [especialidades, setEspecialidades] = useState<string[]>([]);
    const [teamSize, setTeamSize]           = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await api.get('/core/clinics/me/');
                setNumBoxes(response.data.num_boxes?.toString() || '');
            } catch (err) {
                const error = err as { response?: { status?: number } };
                if (error.response?.status !== 400) {
                    toast.error('Error al cargar la configuración.');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.patch('/core/clinics/me/', { num_boxes: numBoxes || null });
            toast.success('Configuración guardada correctamente.');
        } catch (err) {
            const axiosError = err as { response?: { data?: { detail?: string } } };
            toast.error(axiosError.response?.data?.detail || 'Error al guardar los datos.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-7 h-7 animate-spin text-slate-300" />
            </div>
        );
    }

    const isSaveVisible = activeTab === 'perfil' || activeTab === 'operativos';

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            {/* Page Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Configuración</h1>
                <p className="text-sm text-slate-400 mt-1">
                    Gestiona los parámetros y preferencias de tu organización.
                </p>
            </div>

            {/* Layout: Sidebar + Content */}
            <div className="flex gap-6 items-start">

                {/* ── Left sidebar nav ── */}
                <nav className="w-56 shrink-0 bg-white rounded-2xl border border-slate-200 p-2 shadow-sm">
                    {TABS.map((tab) => {
                        const active = tab.id === activeTab;
                        return (
                            <button
                                key={tab.id}
                                id={`settings-tab-${tab.id}`}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-sm
                                            font-medium transition-all text-left group
                                            ${active
                                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                            }`}
                            >
                                <span className="flex items-center gap-2.5">
                                    <span className={active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}>
                                        {tab.icon}
                                    </span>
                                    {tab.label}
                                </span>
                                {active && <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-70" />}
                            </button>
                        );
                    })}
                </nav>

                {/* ── Content panel ── */}
                <form
                    onSubmit={handleSubmit}
                    className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[28rem]"
                >
                    {activeTab === 'perfil' && (
                        <PerfilClinica
                            razonSocial={razonSocial} setRazonSocial={setRazonSocial}
                            cifNif={cifNif} setCifNif={setCifNif}
                            email={email} setEmail={setEmail}
                            direccion={direccion} setDireccion={setDireccion}
                        />
                    )}

                    {activeTab === 'operativos' && (
                        <DatosOperativos
                            numBoxes={numBoxes} setNumBoxes={setNumBoxes}
                            especialidades={especialidades} setEspecialidades={setEspecialidades}
                            teamSize={teamSize} setTeamSize={setTeamSize}
                        />
                    )}

                    {activeTab === 'facturacion' && (
                        <ComingSoon
                            icon={<CreditCard className="w-6 h-6" />}
                            title="Facturación"
                            description="Configura métodos de pago, emisión de facturas y ciclos de cobro."
                        />
                    )}

                    {activeTab === 'usuarios' && (
                        <ComingSoon
                            icon={<Users className="w-6 h-6" />}
                            title="Usuarios y Permisos"
                            description="Gestiona el acceso y los roles del equipo dentro de la plataforma."
                        />
                    )}

                    {activeTab === 'notificaciones' && (
                        <ComingSoon
                            icon={<Bell className="w-6 h-6" />}
                            title="Notificaciones"
                            description="Personaliza alertas, recordatorios y preferencias de comunicación."
                        />
                    )}

                    {/* Save button — only shown for editable tabs */}
                    {isSaveVisible && (
                        <div className="mt-8 pt-5 border-t border-slate-100 flex justify-end">
                            <button
                                type="submit"
                                id="settings-save-btn"
                                disabled={saving}
                                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60
                                           text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors shadow-sm
                                           shadow-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Guardar Cambios
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};

export default Settings;
