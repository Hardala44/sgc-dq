import { NavLink } from 'react-router-dom';
import {
    Home,
    Search,
    LayoutDashboard,
    Users,
    Settings,
    LogOut
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Sidebar = () => {
    const { user } = useAuth();
    const displayName = user?.first_name && user?.last_name
        ? `${user.first_name} ${user.last_name}`
        : user?.username || '';
    const displayEmail = user?.email || '';
    const initial = (displayName || displayEmail).substring(0, 2).toUpperCase();

    const navItems = [
        { icon: Home, label: 'Home', path: '/' },
        { icon: Search, label: 'Catálogo', path: '/catalogo' },
        { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
        { icon: Users, label: 'Proveedores', path: '/proveedores' },
        { icon: Settings, label: 'Configuración', path: '/settings' },
    ];

    return (
        <aside className="group h-screen w-20 hover:w-64 bg-[#F7F7F7] flex flex-col z-10 border-r border-slate-200 transition-all duration-300 ease-in-out flex-shrink-0">
            {/* Logo Area */}
            <div className="h-20 flex items-center px-6 border-b border-slate-200 overflow-hidden shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded shrink-0 bg-black flex items-center justify-center text-white font-bold text-sm shadow-sm transition-transform duration-300 group-hover:scale-105">
                        DQ
                    </div>
                    <span className="font-serif font-bold text-xl tracking-tight text-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">DentalQuality</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-8 space-y-3 overflow-x-hidden">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-4 px-3 py-3 rounded-lg transition-all duration-300 relative ${isActive
                                ? 'bg-klein-500/10 text-klein-600'
                                : 'text-slate-500 hover:bg-slate-200/50 hover:text-black'
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`w-1 h-6 rounded-r-lg absolute -left-4 top-1/2 -translate-y-1/2 transition-opacity duration-300 ${isActive ? 'bg-klein-500 opacity-100' : 'opacity-0'}`}></div>
                                <item.icon className={`w-5 h-5 shrink-0 transition-all duration-300 ${isActive ? 'text-klein-600' : ''}`} />
                                <span className="text-sm tracking-tight font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">{item.label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer / User / Logout */}
            <div className="p-4 border-t border-slate-200 overflow-hidden flex flex-col gap-2">
                {/* User profile row */}
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg overflow-hidden">
                    <div className="w-8 h-8 rounded bg-slate-950 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                        {initial}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 min-w-0">
                        {displayName && (
                            <p className="text-xs font-semibold text-slate-900 tracking-tight leading-none truncate whitespace-nowrap">{displayName}</p>
                        )}
                        {displayEmail && (
                            <p className="text-[10px] text-slate-400 truncate whitespace-nowrap mt-0.5">{displayEmail}</p>
                        )}
                    </div>
                </div>
                {/* Logout */}
                <button className="flex items-center gap-4 px-3 py-2 w-full rounded-lg text-slate-500 hover:bg-slate-200/50 hover:text-black transition-colors duration-300">
                    <LogOut className="w-5 h-5 shrink-0" />
                    <span className="text-sm tracking-tight font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
