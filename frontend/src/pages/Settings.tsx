import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Loader2, Settings as SettingsIcon, Building } from 'lucide-react';

const Settings = () => {
    const [numBoxes, setNumBoxes] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const response = await api.get('/core/clinics/me/');
                setNumBoxes(response.data.num_boxes?.toString() || '');
            } catch (err: any) {
                if (err.response?.status !== 400) {
                    toast.error('Error fetching clinic profile.');
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
            toast.success('Perfil actualizado correctamente.');
            setTimeout(() => {
                window.location.href = '/';
            }, 1000);
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Error saving data.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-8">
            <div className="mb-8">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                        <SettingsIcon className="w-6 h-6 text-slate-700" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-serif text-slate-900 tracking-tight">Configuration</h1>
                        <p className="text-sm font-light text-slate-500">Configura los parámetros de tu clínica para mejorar la precisión analítica.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-[1rem] shadow-sm border border-slate-200 p-6 space-y-6">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
                        <Building className="w-4 h-4 text-slate-400" />
                        Perfil de Clínica
                    </h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Número de Boxes Operativos
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={numBoxes}
                                onChange={(e) => setNumBoxes(e.target.value)}
                                className="w-full sm:w-[50%] p-2.5 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-sm"
                                placeholder="Ej: 4"
                            />
                            <p className="mt-1.5 text-xs text-slate-500">
                                Introduzca el número total de boxes de su clínica. Este valor se utilizará para calcular los ingresos, costes y ahorro por box.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-slate-900 text-white hover:bg-slate-800 transition-colors px-6 py-2 rounded-lg text-sm font-medium tracking-wide flex items-center gap-2"
                    >
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Guardar Cambios
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Settings;
