/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import api from '../services/api';

export interface User {
    id?: number;
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
    rol?: string;
    is_staff?: boolean;
    is_superuser?: boolean;
    clinic_id?: string;
    clinic_nombre?: string;
    must_change_password?: boolean;
}

export interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isAdmin: boolean;
    login: (token: string, refreshToken: string, user: User) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(() => {
        const saved = localStorage.getItem('user');
        if (saved) { try { return JSON.parse(saved); } catch { localStorage.removeItem('user'); } }
        return null;
    });
    const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
        !!(localStorage.getItem('access_token') && localStorage.getItem('user'))
    );
    const [isLoading] = useState(false);

    const isAdmin = !!(user?.is_staff || user?.is_superuser || user?.rol === 'admin_dq');

    // Enrich user profile from /api/core/me/ after token is available
    const refreshUser = async () => {
        const storedToken = localStorage.getItem('access_token');
        if (!storedToken) return;
        try {
            const res = await api.get('/core/me/');
            const enriched: User = res.data;
            setUser(enriched);
            localStorage.setItem('user', JSON.stringify(enriched));
        } catch {
            // silently fail — user data may still be valid from localStorage
        }
    };

    // On mount: if we have a token but minimal user data, enrich it
    useEffect(() => {
        if (token && user && !user.is_staff && user.is_staff === undefined) {
            refreshUser();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const login = (accessToken: string, refreshToken: string, userData: User) => {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(accessToken);
        setIsAuthenticated(true);
        setUser(userData);
        // Enrich immediately after login
        setTimeout(() => refreshUser(), 100);
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('dq_active_clinic');
        setToken(null);
        setIsAuthenticated(false);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, isAdmin, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
    return context;
};
