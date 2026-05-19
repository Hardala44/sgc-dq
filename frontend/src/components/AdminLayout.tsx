import { NavLink } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import {
    Home,
    Building2,
    ShoppingBag,
    Truck,
    Gift,
    LogOut,
    ShieldCheck,
    ClipboardList,
    ImageIcon,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import AuditBanner from './AuditBanner';
import logoDQ from '../assets/logo-dq.png';

// ─── Nav config ───────────────────────────────────────────────────────────────
const ADMIN_NAV = [
    { icon: Home,       label: 'Inicio',        path: '/admin/inicio',       end: true },
    { icon: Building2,  label: 'Clínicas',       path: '/admin/clinicas' },
    { icon: ShoppingBag,label: 'Marketplace',    path: '/admin/marketplace' },
    { icon: Truck,      label: 'Proveedores',    path: '/admin/proveedores' },
    { icon: Gift,       label: 'Fidelización',   path: '/admin/fidelizacion' },
    { icon: ClipboardList, label: 'Peticiones',   path: '/admin/peticiones' },
    { icon: ImageIcon,  label: 'Ofertas Home',   path: '/admin/ofertas' },
];

// ─── AdminNavItem — mirrors clinic NavItem exactly ────────────────────────────
const AdminNavItem = ({
    icon: Icon,
    label,
    path,
    end,
}: {
    icon: React.ElementType;
    label: string;
    path: string;
    end?: boolean;
}) => (
    <NavLink
        to={path}
        end={end}
        className={({ isActive }) =>
            `relative flex items-center gap-3 pl-[22px] pr-3 py-3.5 rounded-xl transition-all duration-200 group/link
            ${isActive
                ? 'text-slate-900'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/70'
            }`
        }
    >
        {({ isActive }) => (
            <>
                <span
                    aria-hidden
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 rounded-r-full bg-[#00a7e1] transition-all duration-200 ${
                        isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                />
                <Icon
                    className={`w-5 h-5 shrink-0 transition-colors duration-200 ${
                        isActive
                            ? 'text-[#00a7e1]'
                            : 'text-slate-400 group-hover/link:text-slate-600'
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span
                    className={`text-sm font-medium whitespace-nowrap overflow-hidden transition-all duration-300
                        opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto
                        ${isActive ? 'text-slate-900' : ''}`}
                >
                    {label}
                </span>
            </>
        )}
    </NavLink>
);

// ─── AdminLayout ──────────────────────────────────────────────────────────────
const AdminLayout = () => {
    const { user, logout } = useAuth();

    const displayName = user?.first_name && user?.last_name
        ? `${user.first_name} ${user.last_name}`
        : user?.username || '';
    const displayEmail = user?.email || '';
    const initial = (displayName || displayEmail).substring(0, 2).toUpperCase();

    return (
        <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden selection:bg-[#00a7e1]/20">

            {/* ── Admin Sidebar — identical behaviour to clinic Sidebar ──── */}
            <aside className="group h-screen w-[72px] hover:w-64 flex flex-col flex-shrink-0 bg-white border-r border-slate-200 transition-[width] duration-300 ease-in-out overflow-hidden">

                {/* Brand logo */}
                <div className="h-24 flex items-center justify-center shrink-0">
                    <img
                        src={logoDQ}
                        alt="DentalQuality"
                        className="object-contain object-center transition-all duration-300 ease-in-out
                                   w-12 max-h-8
                                   group-hover:w-[160px] group-hover:max-h-14"
                    />
                </div>

                {/* Admin badge — collapsed: shield icon; expanded: "ADMIN" label */}
                <div className="flex items-center justify-center px-2.5 mb-2 shrink-0">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/5 w-full justify-center group-hover:justify-start">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#00a7e1] shrink-0" strokeWidth={2} />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[#00a7e1] whitespace-nowrap overflow-hidden opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto transition-all duration-300">
                            Control Admin
                        </span>
                    </div>
                </div>

                {/* Core navigation */}
                <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
                    {ADMIN_NAV.map(item => (
                        <AdminNavItem key={item.path} {...item} />
                    ))}
                </nav>

                {/* User + Logout */}
                <div className="border-t border-slate-100 py-3 space-y-1 px-2.5 shrink-0">
                    {/* Avatar row */}
                    <div className="flex items-center gap-2.5 pl-[22px] pr-3 py-2 rounded-xl">
                        <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {initial}
                        </div>
                        <div className="min-w-0 flex-1 overflow-hidden opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto transition-all duration-300">
                            {displayName && (
                                <p className="text-xs font-semibold text-slate-800 leading-none truncate whitespace-nowrap">{displayName}</p>
                            )}
                            {displayEmail && (
                                <p className="text-[10px] text-slate-400 truncate whitespace-nowrap mt-0.5">{displayEmail}</p>
                            )}
                        </div>
                    </div>
                    {/* Logout */}
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 w-full pl-[22px] pr-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/70 transition-all duration-200"
                    >
                        <LogOut className="w-5 h-5 shrink-0" strokeWidth={1.8} />
                        <span className="text-sm font-medium whitespace-nowrap overflow-hidden opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto transition-all duration-300">
                            Cerrar Sesión
                        </span>
                    </button>
                </div>
            </aside>

            {/* ── Main content ────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Audit banner (visible when view-as is active) */}
                <AuditBanner />

                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
                    <div className="w-full px-6 md:px-8 lg:px-10 py-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
