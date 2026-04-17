import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut } from 'lucide-react';

const Navbar = () => {
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActive = (path: string) => location.pathname === path;

    return (
        <header className="h-20 bg-white border-b border-gray-200 shadow-lg sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-3">
                    <img
                        src="/src/assets/logo-dq.png"
                        alt="DentalQuality Logo"
                        className="h-10 w-auto object-contain"
                    />
                    {/* Fallback/Additional text if needed, effectively replaced by the logo image for branding */}
                    {/* <span className="text-2xl font-bold text-black tracking-tight">SGC-DQ</span> */}
                </Link>

                {/* Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    {isAuthenticated && [
                        { label: 'Inicio', path: '/' },
                        { label: 'Catálogo', path: '/catalogo' },
                        { label: 'Cuadro de mando', path: '/dashboard' },
                        { label: 'Proveedores', path: '/proveedores' }
                    ].map(item => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className="relative text-lg font-semibold text-gray-700 hover:text-black pb-1 transition-colors
                                       data-[active=true]:text-black data-[active=true]:after:absolute data-[active=true]:after:w-full data-[active=true]:after:h-0.5 data-[active=true]:after:bottom-0 data-[active=true]:after:left-0 data-[active=true]:after:bg-blue-600 data-[active=true]:after:rounded-full"
                            data-active={isActive(item.path)}
                        >
                            {item.label}
                        </Link>
                    ))}
                    {!isAuthenticated && (
                        <Link to="/login" className="text-blue-600 font-medium hover:underline">Acceder</Link>
                    )}
                </nav>

                {/* User */}
                <div className="flex items-center gap-4">
                    {isAuthenticated && (
                        <>
                            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 px-4 py-2 rounded-2xl text-sm font-semibold text-blue-800 shadow-sm">
                                <span>75</span>
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                                <span>pts</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center text-gray-600 font-semibold shadow-inner">
                                    TU
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                    title="Cerrar sesión"
                                >
                                    <LogOut size={20} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;
