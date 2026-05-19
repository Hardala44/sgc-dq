import { NavLink, Link } from 'react-router-dom';
import {
    Home,
    ShoppingBag,
    BarChart2,
    Settings,
    LogOut,
    Coins,
    ChevronRight,
    ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// ─── Types ─────────────────────────────────────────────────────────────────
interface NavItemDef {
    icon: React.ElementType;
    label: string;
    path: string;
    end?: boolean;
}

// ─── Data ──────────────────────────────────────────────────────────────────
const CORE_NAV: NavItemDef[] = [
    { icon: Home,        label: 'Inicio',      path: '/',          end: true },
    { icon: ShoppingBag, label: 'Marketplace', path: '/catalogo' },
    { icon: BarChart2,   label: 'Análisis',    path: '/dashboard' },
];

// Mock loyalty — replace with real hook later
const LOYALTY = {
    coins:    1250,
    level:    'Gold Member',
    progress: 75,
};

// ─── NavItem ───────────────────────────────────────────────────────────────
/** Single collapsible nav link with left active-indicator */
const NavItem = ({ icon: Icon, label, path, end }: NavItemDef) => (
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
                {/* 2px DQ-blue active pill */}
                <span
                    aria-hidden
                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 rounded-r-full bg-[#00a7e1] transition-all duration-200 ${
                        isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                />

                {/* Icon — always visible */}
                <Icon
                    className={`w-5 h-5 shrink-0 transition-colors duration-200 ${
                        isActive
                            ? 'text-[#00a7e1]'
                            : 'text-slate-400 group-hover/link:text-slate-600'
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                />

                {/* Label — hidden when collapsed, revealed on hover */}
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

// ─── LoyaltyWidget ─────────────────────────────────────────────────────────
/** Compact icon shown when sidebar is collapsed; full card when expanded */
const LoyaltyWidget = () => {
    const circumference = 2 * Math.PI * 14;
    const offset = circumference * (1 - LOYALTY.progress / 100);

    return (
        <Link to="/puntos" className="block mx-3 group/loyalty">
            {/* Collapsed: just the coin icon centered */}
            <div className="group-hover:hidden flex items-center justify-center py-2">
                <Coins className="w-5 h-5 text-amber-500" strokeWidth={2} />
            </div>

            {/* Expanded: full mini-card */}
            <div className="hidden group-hover:block">
                <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/60 p-3.5 hover:border-amber-300/80 hover:shadow-sm transition-all duration-300">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                            <Coins className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />
                            <span className="text-[9px] font-extrabold text-amber-700 uppercase tracking-[0.12em]">
                                DQ Loyalty
                            </span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-amber-300 group-hover/loyalty:text-amber-500 transition-colors duration-200" />
                    </div>

                    {/* Ring + text */}
                    <div className="flex items-center gap-3">
                        {/* SVG ring */}
                        <div className="relative shrink-0 w-9 h-9">
                            <svg className="-rotate-90 w-full h-full" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="14" stroke="#fde68a" strokeWidth="3" fill="none" />
                                <circle
                                    cx="18" cy="18" r="14"
                                    stroke="#f59e0b"
                                    strokeWidth="3"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                    className="transition-all duration-700"
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-amber-600">
                                {LOYALTY.progress}%
                            </span>
                        </div>

                        {/* Points + level */}
                        <div className="min-w-0">
                            <p className="text-base font-bold text-slate-900 leading-none tracking-tight">
                                {LOYALTY.coins.toLocaleString('es-ES')}
                                <span className="text-[10px] font-semibold text-slate-400 ml-1">pts</span>
                            </p>
                            <p className="text-[10px] text-amber-600 font-medium mt-0.5 truncate">{LOYALTY.level}</p>
                            <div className="mt-2 h-1 rounded-full bg-amber-100 overflow-hidden">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-700"
                                    style={{ width: `${LOYALTY.progress}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};

// ─── Sidebar ───────────────────────────────────────────────────────────────
const Sidebar = () => {
    const { user, logout, isAdmin } = useAuth();

    const displayName = user?.first_name && user?.last_name
        ? `${user.first_name} ${user.last_name}`
        : user?.username || '';
    const displayEmail = user?.email || '';
    const initial = (displayName || displayEmail).substring(0, 2).toUpperCase();

    return (
        /* group drives all child transitions via group-hover: */
        <aside className="group h-screen w-[72px] hover:w-64 flex flex-col flex-shrink-0 bg-white border-r border-slate-200 transition-[width] duration-300 ease-in-out overflow-hidden">

            {/* ── BLOCK 1: Brand mark ─────────────────────────────────── */}
            <div className="h-16 flex items-center justify-center shrink-0 border-b border-slate-100">
                {/* Collapsed: DQ monogram */}
                <span className="block group-hover:hidden text-lg font-black tracking-tight text-slate-900">DQ</span>
                {/* Expanded: Full brand name */}
                <span className="hidden group-hover:block text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">Dental Quality</span>
            </div>

            {/* ── BLOCK 2: Core Navigation ───────────────────────────────── */}
            <nav className="flex-1 px-2.5 py-8 space-y-2 overflow-y-auto overflow-x-hidden">
                {CORE_NAV.map((item) => (
                    <NavItem key={item.path} {...item} />
                ))}
            </nav>

            {/* ── BLOCK 3: Utility + Loyalty ─────────────────────────────── */}
            <div className="border-t border-slate-100 py-3 space-y-1 shrink-0">

                {/* DQ Loyalty widget */}
                <LoyaltyWidget />

                {/* Admin Hub — only for admins */}
                {isAdmin && (
                    <div className="px-2.5">
                        <NavLink
                            to="/admin"
                            className={({ isActive }) =>
                                `relative flex items-center gap-3 pl-[22px] pr-3 py-3 rounded-xl transition-all duration-200
                                ${isActive
                                    ? 'text-slate-900'
                                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/70'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <span aria-hidden
                                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 rounded-r-full bg-[#00a7e1] transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                                    />
                                    <ShieldCheck
                                        className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#00a7e1]' : 'text-slate-400'}`}
                                        strokeWidth={1.8}
                                    />
                                    <span className="text-sm font-medium whitespace-nowrap overflow-hidden opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto transition-all duration-300">
                                        Admin Hub
                                    </span>
                                </>
                            )}
                        </NavLink>
                    </div>
                )}

                {/* Settings */}
                <div className="px-2.5">
                    <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                            `relative flex items-center gap-3 pl-[22px] pr-3 py-3 rounded-xl transition-all duration-200
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
                                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 rounded-r-full bg-[#00a7e1] transition-all duration-200 ${isActive ? 'opacity-100' : 'opacity-0'}`}
                                />
                                <Settings
                                    className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#00a7e1]' : 'text-slate-400'}`}
                                    strokeWidth={1.8}
                                />
                                <span className="text-sm font-medium whitespace-nowrap overflow-hidden opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto transition-all duration-300">
                                    Configuración
                                </span>
                            </>
                        )}
                    </NavLink>
                </div>

                {/* User + Logout */}
                <div className="px-2.5 pt-1 border-t border-slate-100">
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
            </div>
        </aside>
    );
};

export default Sidebar;
