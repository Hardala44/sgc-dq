/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, type ReactNode } from 'react';

export interface User {
    username: string;
    email: string;
    first_name?: string;
    last_name?: string;
}

export interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string, refreshToken: string, user: User) => void;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            try {
                return JSON.parse(savedUser);
            } catch (e) {
                console.error("Failed to parse user data", e);
                localStorage.removeItem('user');
            }
        }
        return null;
    });
    const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
        !!(localStorage.getItem('access_token') && localStorage.getItem('user'))
    );
    const [isLoading] = useState(false);

    const login = (token: string, refreshToken: string, userData: User) => {
        localStorage.setItem('access_token', token);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(token);
        setIsAuthenticated(true);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        setToken(null);
        setIsAuthenticated(false);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
