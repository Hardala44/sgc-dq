/* eslint-disable react-refresh/only-export-components */
import {
    createContext,
    useState,
    useContext,
    useEffect,
    type ReactNode,
} from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ClinicOption {
    id: string;
    nombre: string;
}

export interface ClinicContextType {
    /** ID of the clinic currently being viewed (defaults to user's own clinic) */
    activeClinicId: string;
    /** Display name of the active clinic */
    activeClinicName: string;
    /** True when an admin is viewing a clinic that is not their own */
    isViewingAs: boolean;
    /** All clinics available for admin selection */
    allClinics: ClinicOption[];
    /** Switch the active clinic (admin only) */
    setActiveClinic: (clinic: ClinicOption) => void;
    /** Reset to the admin's own clinic */
    resetToOwnClinic: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

const SESSION_KEY = 'dq_active_clinic';

export const ClinicProvider = ({ children }: { children: ReactNode }) => {
    const { user, isAuthenticated } = useAuth();

    const isAdmin: boolean =
        !!(user as unknown as { is_staff?: boolean; rol?: string })?.is_staff ||
        (user as unknown as { rol?: string })?.rol === 'admin_dq';

    // ── State ──────────────────────────────────────────────────────────────────
    const [ownClinicId,   setOwnClinicId]   = useState('');
    const [ownClinicName, setOwnClinicName] = useState('');
    const [activeClinic,  setActiveClinicState] = useState<ClinicOption>({ id: '', nombre: '' });
    const [allClinics,    setAllClinics]    = useState<ClinicOption[]>([]);

    // ── Load own clinic info from /api/core/me/ ────────────────────────────────
    useEffect(() => {
        if (!isAuthenticated) return;

        const load = async () => {
            try {
                const res = await api.get('/core/me/');
                const { clinic_id, clinic_nombre } = res.data;
                if (clinic_id) {
                    setOwnClinicId(clinic_id);
                    setOwnClinicName(clinic_nombre || '');

                    // Restore session-stored selection (admin only)
                    const stored = sessionStorage.getItem(SESSION_KEY);
                    if (isAdmin && stored) {
                        try {
                            const parsed: ClinicOption = JSON.parse(stored);
                            setActiveClinicState(parsed);
                        } catch {
                            setActiveClinicState({ id: clinic_id, nombre: clinic_nombre || '' });
                        }
                    } else {
                        setActiveClinicState({ id: clinic_id, nombre: clinic_nombre || '' });
                    }
                }
            } catch {
                // silently fail — user may not have a clinic
            }
        };
        load();
    }, [isAuthenticated, isAdmin]);

    // ── Load all clinics for admin selector ────────────────────────────────────
    useEffect(() => {
        if (!isAdmin || !isAuthenticated) return;
        const load = async () => {
            try {
                const res = await api.get('/core/admin/clinics/');
                setAllClinics(res.data);
            } catch {
                // silently fail
            }
        };
        load();
    }, [isAdmin, isAuthenticated]);

    // ── Actions ────────────────────────────────────────────────────────────────
    const setActiveClinic = (clinic: ClinicOption) => {
        setActiveClinicState(clinic);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(clinic));
        // Notify all Dashboard/Puntos listeners
        window.dispatchEvent(new CustomEvent('clinic-context-changed', { detail: clinic }));
    };

    const resetToOwnClinic = () => {
        const own: ClinicOption = { id: ownClinicId, nombre: ownClinicName };
        setActiveClinicState(own);
        sessionStorage.removeItem(SESSION_KEY);
        window.dispatchEvent(new CustomEvent('clinic-context-changed', { detail: own }));
    };

    const isViewingAs = isAdmin && activeClinic.id !== '' && activeClinic.id !== ownClinicId;

    return (
        <ClinicContext.Provider value={{
            activeClinicId:   activeClinic.id,
            activeClinicName: activeClinic.nombre,
            isViewingAs,
            allClinics,
            setActiveClinic,
            resetToOwnClinic,
        }}>
            {children}
        </ClinicContext.Provider>
    );
};

export const useClinic = () => {
    const ctx = useContext(ClinicContext);
    if (!ctx) throw new Error('useClinic must be used within ClinicProvider');
    return ctx;
};
