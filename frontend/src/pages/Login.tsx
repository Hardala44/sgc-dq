import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

import logo from '../assets/logo-dq.png';

const Login = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const normalizedIdentifier = identifier.trim();
            const response = await api.post('/token/', { username: normalizedIdentifier, password });
            // Depending on backend, user info might need to be fetched separately or decoded
            // For now, preserve the identifier used for login until profile enrichment runs.
            login(response.data.access, response.data.refresh, { username: normalizedIdentifier, email: normalizedIdentifier });
            navigate('/');
        } catch (err) {
            const axiosError = err as { response?: { data?: { detail?: string } } };
            if (axiosError.response && axiosError.response.data && axiosError.response.data.detail) {
                setError(axiosError.response.data.detail);
            } else {
                setError('Login fallido. Por favor revise sus credenciales.');
            }
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg w-96">
                <div className="flex justify-center mb-4">
                    <img src={logo} alt="Logo" className="h-16 w-auto" />
                </div>
                <h3 className="text-2xl font-bold text-center">Login to your account</h3>
                <form onSubmit={handleSubmit} className="mt-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Usuario o email</label>
                        <input
                            type="text"
                            placeholder="Usuario o email"
                            className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            autoComplete="username"
                            required
                        />
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <div className="relative mt-2">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                className="w-full px-4 py-2 pr-10 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                    <div className="flex items-baseline justify-between">
                        <button className="px-6 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-900 w-full">Login</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
