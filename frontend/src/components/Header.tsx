import { Bell, User as UserIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

const Header = () => {
    const { user: authUser } = useAuth();

    // Mock data for gamification
    const gamification = {
        level: "Gold Member",
        points: 75,
        progress: 75
    };

    if (!authUser) {
        return (
            <header className="h-16 bg-white border-b border-slate-200/60 flex items-center justify-between px-6 fixed top-0 right-0 left-64 z-40">
                <div className="animate-pulse bg-slate-200 h-4 w-48 rounded"></div>
            </header>
        );
    }

    const displayName = authUser.first_name && authUser.last_name 
        ? `${authUser.first_name} ${authUser.last_name}` 
        : authUser.email || authUser.username;
        
    // Assuming clinic info might be added later, fallback for now
    const displayClinic = (authUser as any).clinica_nombre || "Clínica Dental Premium";
    
    // Get up to 2 characters for initials
    const initial = displayName.substring(0, 2).toUpperCase();

    return (
        <header className="h-16 bg-white border-b border-slate-200/60 flex items-center justify-between px-6 fixed top-0 right-0 left-64 z-40">
            {/* Left side */}
            <div className="text-slate-500 text-xs font-medium tracking-tight">
                <span className="text-slate-400">Bienvenido,</span> <span className="text-slate-900 font-semibold">{displayName}</span>
            </div>

            {/* Right Side: Gamification & Profile */}
            <div className="flex items-center gap-4">

                {/* Gamification Widget */}
                <div className="hidden md:flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60 transition-colors hover:bg-slate-100 cursor-default">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-900 uppercase tracking-widest">{gamification.level}</span>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 font-medium tracking-tight">{gamification.points} pts</span>
                        </div>
                    </div>
                    <div className="relative w-7 h-7 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="14" cy="14" r="12" stroke="#f1f5f9" strokeWidth="2" fill="none" />
                            <circle cx="14" cy="14" r="12" stroke="#f59e0b" strokeWidth="2" fill="none" strokeDasharray="75" strokeDashoffset={75 - (gamification.progress * 0.75)} />
                        </svg>
                        <span className="absolute text-[8px] font-bold text-slate-800 shadow-sm">75%</span>
                    </div>
                </div>

                {/* Notifications */}
                <button className="relative p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-amber-500 rounded-full border border-white"></span>
                </button>

                {/* Vertical Divider */}
                <div className="h-5 w-px bg-slate-200 mx-1"></div>

                {/* Profile Dropdown Trigger */}
                <Link to="/settings" className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-md transition-colors group">
                    <div className="w-7 h-7 rounded bg-slate-950 text-white flex items-center justify-center font-bold text-[10px]">
                        {initial}
                    </div>
                    <div className="hidden lg:block text-left">
                        <p className="text-xs font-semibold text-slate-900 tracking-tight leading-none group-hover:text-amber-600 transition-colors">{displayName}</p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[100px] mt-0.5">{displayClinic}</p>
                    </div>
                    <UserIcon className="w-4 h-4 text-slate-400 group-hover:text-slate-600 ml-1" />
                </Link>
            </div>
        </header>
    );
};

export default Header;
