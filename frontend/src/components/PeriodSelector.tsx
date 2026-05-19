import { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, ChevronDown, Zap, Clock, History } from 'lucide-react';
import api from '../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────

interface YearPeriod {
    year: number;
    quarters: number[]; // quarters that have data, e.g. [1, 2, 3]
}

interface AvailablePeriodsResponse {
    periods: YearPeriod[];
    latest: string | null; // "YYYY-QN"
}

export interface PeriodSelectorProps {
    /** Current period string, e.g. "2025-Q1", "2025-Q1,2025-Q2", "2025" */
    value: string;
    onChange: (period: string) => void;
    clinicId?: string | number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePeriodString(periodStr: string): Array<[number, number]> {
    const s = periodStr.trim();
    // Full year
    if (/^\d{4}$/.test(s)) {
        const y = parseInt(s);
        return [[y, 1], [y, 2], [y, 3], [y, 4]];
    }
    return s.split(',').map(part => {
        const m = part.trim().match(/^(\d{4})-Q([1-4])$/);
        if (!m) return null;
        return [parseInt(m[1]), parseInt(m[2])] as [number, number];
    }).filter(Boolean) as Array<[number, number]>;
}

function buildPeriodString(selected: Array<[number, number]>): string {
    if (selected.length === 0) return '';
    const sorted = [...selected].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return sorted.map(([y, q]) => `${y}-Q${q}`).join(',');
}

function formatPeriodLabel(periodStr: string): string {
    if (!periodStr) return 'Seleccionar periodo';
    const periods = parsePeriodString(periodStr);
    if (periods.length === 0) return 'Seleccionar periodo';

    const sorted = [...periods].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

    if (sorted.length === 1) {
        return `Q${sorted[0][1]} ${sorted[0][0]}`;
    }

    const years = [...new Set(sorted.map(([y]) => y))];
    if (years.length === 1) {
        const year = years[0];
        const quarters = sorted.map(([, q]) => q).sort();
        if (quarters.length === 4 && quarters[0] === 1 && quarters[3] === 4) {
            return `Año ${year}`;
        }
        return `Q${quarters[0]}-Q${quarters[quarters.length - 1]} ${year}`;
    }

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    return `Q${first[1]} ${first[0]} – Q${last[1]} ${last[0]}`;
}


function isQuarterSelected(selected: Array<[number, number]>, year: number, quarter: number): boolean {
    return selected.some(([y, q]) => y === year && q === quarter);
}

const QUARTER_NAMES = ['', 'Q1', 'Q2', 'Q3', 'Q4'];

// ─── Component ───────────────────────────────────────────────────────────────

export default function PeriodSelector({ value, onChange, clinicId }: PeriodSelectorProps) {
    const [open, setOpen] = useState(false);
    const [availableData, setAvailableData] = useState<AvailablePeriodsResponse | null>(null);
    const [loadingPeriods, setLoadingPeriods] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const selected = parsePeriodString(value);

    // ── Fetch available periods from backend ───────────────────────────────
    useEffect(() => {
        const fetch = async () => {
            setLoadingPeriods(true);
            try {
                const params: Record<string, string> = {};
                if (clinicId) params.clinic_id = String(clinicId);
                const res = await api.get<AvailablePeriodsResponse>('/analytics/available-periods/', { params });
                setAvailableData(res.data);
                // Auto-select the latest period if none is selected yet
                if (!value && res.data.latest) {
                    onChange(res.data.latest);
                }
            } catch {
                // silently fail; UI falls back gracefully
            } finally {
                setLoadingPeriods(false);
            }
        };
        fetch();
    }, [clinicId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Close popover on outside click ────────────────────────────────────
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // ── Selection handlers ─────────────────────────────────────────────────
    const toggleQuarter = useCallback((year: number, quarter: number) => {
        const already = isQuarterSelected(selected, year, quarter);
        let next: Array<[number, number]>;
        if (already) {
            next = selected.filter(([y, q]) => !(y === year && q === quarter));
        } else {
            next = [...selected, [year, quarter]];
        }
        onChange(buildPeriodString(next));
    }, [selected, onChange]);

    const toggleYear = useCallback((year: number, availableQuarters: number[]) => {
        const allSelected = availableQuarters.every(q => isQuarterSelected(selected, year, q));
        let next: Array<[number, number]>;
        if (allSelected) {
            next = selected.filter(([y]) => y !== year);
        } else {
            const existing = selected.filter(([y]) => y !== year);
            const toAdd = availableQuarters.map(q => [year, q] as [number, number]);
            next = [...existing, ...toAdd];
        }
        onChange(buildPeriodString(next));
    }, [selected, onChange]);

    // ── Quick access handlers ──────────────────────────────────────────────
    const handleCurrentYear = useCallback(() => {
        const now = new Date();
        const year = now.getFullYear();
        const currentQ = Math.floor(now.getMonth() / 3) + 1;
        const yearData = availableData?.periods.find(p => p.year === year);
        const quarters = yearData
            ? yearData.quarters.filter(q => q <= currentQ)
            : Array.from({ length: currentQ }, (_, i) => i + 1);
        const periods = quarters.map(q => [year, q] as [number, number]);
        onChange(buildPeriodString(periods));
        setOpen(false);
    }, [availableData, onChange]);

    const handlePrevYear = useCallback(() => {
        const year = new Date().getFullYear() - 1;
        const yearData = availableData?.periods.find(p => p.year === year);
        const quarters = yearData ? yearData.quarters : [1, 2, 3, 4];
        const periods = quarters.map(q => [year, q] as [number, number]);
        onChange(buildPeriodString(periods));
        setOpen(false);
    }, [availableData, onChange]);

    const handleAllHistory = useCallback(() => {
        if (!availableData) return;
        const all: Array<[number, number]> = [];
        for (const { year, quarters } of availableData.periods) {
            for (const q of quarters) all.push([year, q]);
        }
        onChange(buildPeriodString(all));
        setOpen(false);
    }, [availableData, onChange]);

    const label = formatPeriodLabel(value);
    const hasSelection = selected.length > 0;

    return (
        <div className="relative inline-block">
            {/* Trigger button */}
            <button
                ref={buttonRef}
                onClick={() => setOpen(v => !v)}
                className={`
                    inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold
                    transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400
                    ${open
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-slate-400 hover:bg-slate-50 shadow-sm'
                    }
                `}
            >
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="tracking-tight">{label}</span>
                <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* Popover */}
            {open && (
                <div
                    ref={popoverRef}
                    className="absolute left-0 top-full mt-2 z-50 w-72 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                >
                    {/* Quick access */}
                    <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50">
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-2">Accesos Rápidos</p>
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                onClick={handleCurrentYear}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-150"
                            >
                                <Zap className="w-3 h-3" />
                                Año Actual
                            </button>
                            <button
                                onClick={handlePrevYear}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-150"
                            >
                                <Clock className="w-3 h-3" />
                                Año Anterior
                            </button>
                            <button
                                onClick={handleAllHistory}
                                disabled={!availableData}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <History className="w-3 h-3" />
                                Todo el Histórico
                            </button>
                        </div>
                    </div>

                    {/* Period list */}
                    <div className="max-h-64 overflow-y-auto py-1.5">
                        {loadingPeriods && (
                            <div className="flex justify-center py-6">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-600" />
                            </div>
                        )}

                        {!loadingPeriods && availableData && availableData.periods.length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-4">Sin datos disponibles</p>
                        )}

                        {!loadingPeriods && availableData && availableData.periods.map(({ year, quarters }) => {
                            const allYearSelected = quarters.every(q => isQuarterSelected(selected, year, q));
                            const someYearSelected = quarters.some(q => isQuarterSelected(selected, year, q));

                            return (
                                <div key={year} className="px-3 py-1.5">
                                    {/* Year row */}
                                    <button
                                        onClick={() => toggleYear(year, quarters)}
                                        className={`
                                            w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg
                                            text-xs font-bold tracking-tight transition-all duration-150
                                            ${allYearSelected
                                                ? 'bg-slate-900 text-white'
                                                : someYearSelected
                                                    ? 'bg-slate-100 text-slate-900 ring-1 ring-slate-300'
                                                    : 'text-slate-700 hover:bg-slate-50'
                                            }
                                        `}
                                    >
                                        <span>Año {year}</span>
                                        {quarters.length === 4 && (
                                            <span className={`text-[9px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                                                allYearSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                Completo
                                            </span>
                                        )}
                                    </button>

                                    {/* Quarter chips */}
                                    <div className="flex gap-1.5 mt-1.5 ml-1">
                                        {quarters.map(q => {
                                            const qSelected = isQuarterSelected(selected, year, q);
                                            return (
                                                <button
                                                    key={q}
                                                    onClick={() => toggleQuarter(year, q)}
                                                    className={`
                                                        flex-1 py-1 rounded-md text-[10px] font-bold tracking-tight
                                                        transition-all duration-150 border
                                                        ${qSelected
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
                                                        }
                                                    `}
                                                >
                                                    {QUARTER_NAMES[q]}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer: current selection summary + apply */}
                    {hasSelection && (
                        <div className="border-t border-slate-100 px-3 py-2 flex items-center justify-between bg-slate-50">
                            <span className="text-[10px] text-slate-500 font-medium truncate max-w-[160px]">
                                {label}
                            </span>
                            <button
                                onClick={() => setOpen(false)}
                                className="text-[10px] font-bold text-white bg-slate-900 hover:bg-slate-700 px-2.5 py-1 rounded-md transition-colors"
                            >
                                Aplicar
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
