import { Bell, User as UserIcon, Building2, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useClinic } from '../context/ClinicContext';
import { Link } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import type { ClinicOption } from '../context/ClinicContext';

// ─── ClinicSelector (admin only) ──────────────────────────────────────────────

const ClinicSelector = () => {
    const { allClinics, activeClinicId, activeClinicName, isViewingAs, setActiveClinic, resetToOwnClinic } = useClinic();
    const { user } = useAuth();
    const [open, setOpen]     = useState(false);
    const [query, setQuery]   = useState('');
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    if (!user?.is_staff && user?.rol !== 'admin_dq') return null;

    const ownClinicId = user?.clinic_id;
    const filtered = query
        ? allClinics.filter(c => c.nombre.toLowerCase().includes(query.toLowerCase()))
        : allClinics;

    const select = (c: ClinicOption) => { setActiveClinic(c); setOpen(false); setQuery(''); };

    return (
        <div ref={ref} className="relative">
            <button
                id="clinic-selector-btn"
                onClick={() => setOpen(o => !o)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all
                    ${isViewingAs
                        ? 'border-[#00a7e1]/40 bg-[#00a7e1]/8 text-[#00a7e1]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
            >
                <Building2 className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
                <span className="max-w-[160px] truncate text-xs">{activeClinicName || 'Seleccionar clínica'}</span>
                {isViewingAs && (
                    <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-[#00a7e1] bg-[#00a7e1]/10 px-1.5 py-0.5 rounded-full">
                        View-as
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-2xl shadow-lg z-50 overflow-hidden">
                    {/* Search */}
                    <div className="p-3 border-b border-slate-100">
                        <input
                            autoFocus
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Buscar clínica..."
                            className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#00a7e1] focus:ring-2 focus:ring-[#00a7e1]/20"
                        />
                    </div>

                    {/* Reset to own clinic */}
                    {isViewingAs && (
                        <button
                            onClick={() => { resetToOwnClinic(); setOpen(false); }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 border-b border-slate-100 transition-colors"
                        >
                            <X className="w-3 h-3" />
                            Volver a mi vista
                        </button>
                    )}

                    {/* Clinic list */}
                    <div className="max-h-64 overflow-y-auto py-1.5">
                        {filtered.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">Sin resultados</p>
                        ) : filtered.map(c => (
                            <button
                                key={c.id}
                                onClick={() => select(c)}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors text-left
                                    ${c.id === activeClinicId
                                        ? 'bg-[#00a7e1]/8 text-[#00a7e1] font-semibold'
                                        : 'text-slate-700 hover:bg-slate-50'
                                    }`}
                            >
                                <span className="truncate">{c.nombre}</span>
                                {c.id === ownClinicId && (
                                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 ml-2 shrink-0">Tuya</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Header ───────────────────────────────────────────────────────────────────

const Header = () => {
    const { user: authUser } = useAuth();

    if (!authUser) {
        return (
            <header className="h-14 bg-white border-b border-slate-200/70 flex items-center px-6 z-40 flex-shrink-0">
                <div className="animate-pulse bg-slate-100 h-4 w-32 rounded-full" />
            </header>
        );
    }

    const displayName = authUser.first_name && authUser.last_name
        ? `${authUser.first_name} ${authUser.last_name}`
        : authUser.email || authUser.username;
    const initial = displayName.substring(0, 2).toUpperCase();

    return (
        <header className="h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/70 flex items-center justify-between px-6 z-40 flex-shrink-0 sticky top-0">
            {/* Left: ClinicSelector (admin only — renders nothing for regular users) */}
            <div className="flex items-center">
                <ClinicSelector />
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1.5">
                {/* Notifications */}
                <button aria-label="Notificaciones"
                    className="relative p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200">
                    <Bell className="w-[18px] h-[18px]" strokeWidth={1.8} />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full border-2 border-white" />
                </button>
                <div className="h-5 w-px bg-slate-200 mx-1.5" />
                <Link to="/settings"
                    className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-100 transition-all duration-200 group">
                    <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shadow-sm">
                        {initial}
                    </div>
                    <UserIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" strokeWidth={1.8} />
                </Link>
            </div>
        </header>
    );
};

export default Header;
