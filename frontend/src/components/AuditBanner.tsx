import { AlertTriangle, X } from 'lucide-react';
import { useClinic } from '../context/ClinicContext';

/**
 * Orange audit banner shown at the very top of admin content
 * when admin_dq is viewing a specific clinic's data.
 */
const AuditBanner = () => {
    const { isViewingAs, activeClinicName, resetToOwnClinic } = useClinic();

    if (!isViewingAs) return null;

    return (
        <div className="flex items-center justify-between gap-4 px-5 py-2.5 bg-amber-500 text-white text-sm font-medium shrink-0">
            <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" strokeWidth={2} />
                <span>
                    Modo Auditoría &mdash; viendo datos de{' '}
                    <span className="font-bold">{activeClinicName}</span>
                </span>
            </div>
            <button
                onClick={resetToOwnClinic}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors"
            >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                Salir de auditoría
            </button>
        </div>
    );
};

export default AuditBanner;
