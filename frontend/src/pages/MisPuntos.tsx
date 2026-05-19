import { Gift, Sparkles, Target, Trophy } from 'lucide-react';

interface Premio {
    id: number;
    nombre: string;
    descripcion: string;
    coste: number;
    categoria: string;
}

interface MovimientoPuntos {
    id: number;
    fecha: string;
    concepto: string;
    puntos: number;
}

import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';

const historial: MovimientoPuntos[] = [
    {
        id: 1,
        fecha: '24 abr 2026',
        concepto: 'Compra mensual de implantes y biomateriales',
        puntos: 180,
    },
    {
        id: 2,
        fecha: '15 abr 2026',
        concepto: 'Pedido de consumibles de ortodoncia',
        puntos: 95,
    },
    {
        id: 3,
        fecha: '03 abr 2026',
        concepto: 'Reposicion de instrumental rotatorio',
        puntos: 130,
    },
];

const formatPoints = (value: number) => new Intl.NumberFormat('es-ES').format(value);

const MisPuntos = () => {
    const [premios, setPremios] = useState<Premio[]>([]);

    useEffect(() => {
        const fetchPremios = async () => {
            try {
                const response = await api.get('/incentivos/premios/');
                // Only show active rewards to the user
                setPremios(response.data.filter((p: any) => p.activo));
            } catch (error) {
                console.error("Error fetching premios:", error);
                toast.error("Error cargando el catálogo de premios.");
            }
        };

        fetchPremios();
    }, []);

    const saldoActual = 1250;
    const siguientePremio = premios.length > 0 ? premios[0] : null;
    const puntosRestantes = siguientePremio ? Math.max(siguientePremio.coste - saldoActual, 0) : 0;
    const progreso = siguientePremio ? Math.min((saldoActual / siguientePremio.coste) * 100, 100) : 0;
    return (
        <div className="mx-auto w-full max-w-7xl py-10">
            <div className="mb-8 flex flex-col gap-2">
                <span className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">Fidelizacion</span>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Mis Puntos</h1>
                <p className="max-w-3xl text-sm text-slate-500">
                    Gestiona el saldo acumulado de tu clinica, revisa el progreso hacia el siguiente premio y consulta los ultimos movimientos de fidelizacion.
                </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-amber-700 shadow-sm">
                            <Trophy className="h-4 w-4" />
                            Saldo disponible
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Clinica DentalQuality Prime</p>
                            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-amber-600 md:text-5xl">
                                {formatPoints(saldoActual)} DQ Coins
                            </h2>
                        </div>
                        <p className="max-w-2xl text-sm leading-6 text-slate-500">
                            Tus compras en proveedores homologados convierten cada pedido en beneficios tangibles para el equipo y la operativa de la clinica.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Ultimo trimestre</p>
                                    <p className="text-lg font-semibold text-slate-900">+405 puntos</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                                    <Gift className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Canje favorito</p>
                                    <p className="text-lg font-semibold text-slate-900">Tecnologia</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <Target className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-slate-900">Progreso hacia tu siguiente premio</h3>
                        <p className="text-sm text-slate-500">
                            {siguientePremio 
                                ? `Te faltan ${formatPoints(puntosRestantes)} puntos para: ${siguientePremio.nombre}`
                                : 'Cargando catálogo de premios...'}
                        </p>
                    </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-blue-600"
                        style={{ width: `${progreso}%` }}
                    />
                </div>
            </div>

            <section className="mt-10">
                <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-semibold text-slate-900">Catalogo de premios</h3>
                        <p className="mt-1 text-sm text-slate-500">Seleccion pensada para aportar valor real al equipo, la formacion y la experiencia clinica.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {premios.map((premio) => {
                        const canjearDisponible = saldoActual >= premio.coste;

                        return (
                            <article
                                key={premio.id}
                                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                            >
                                <div className="flex h-40 items-center justify-center bg-slate-100 px-6">
                                    <div className="text-center">
                                        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                                            <Gift className="h-6 w-6" />
                                        </div>
                                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{premio.categoria}</p>
                                    </div>
                                </div>
                                <div className="space-y-4 p-5">
                                    <div>
                                        <h4 className="text-lg font-semibold text-slate-900">{premio.nombre}</h4>
                                        <p className="mt-2 text-sm leading-6 text-slate-500">{premio.descripcion}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Coste en puntos</p>
                                        <p className="mt-1 text-2xl font-semibold text-amber-600">{formatPoints(premio.coste)} pts</p>
                                    </div>
                                    <button
                                        type="button"
                                        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                        disabled={!canjearDisponible}
                                    >
                                        Canjear Premio
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </section>

            <section className="mt-10 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-5">
                    <h3 className="text-xl font-semibold text-slate-900">Ultimos movimientos</h3>
                    <p className="mt-1 text-sm text-slate-500">Resumen de las ultimas compras que han generado saldo para tu programa de fidelizacion.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left font-medium uppercase tracking-[0.16em] text-slate-500">Fecha</th>
                                <th className="px-6 py-4 text-left font-medium uppercase tracking-[0.16em] text-slate-500">Concepto</th>
                                <th className="px-6 py-4 text-right font-medium uppercase tracking-[0.16em] text-slate-500">Puntos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                            {historial.map((movimiento) => (
                                <tr key={movimiento.id} className="transition-colors hover:bg-slate-50">
                                    <td className="whitespace-nowrap px-6 py-4 text-slate-500">{movimiento.fecha}</td>
                                    <td className="px-6 py-4 text-slate-900">{movimiento.concepto}</td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-600">
                                            +{formatPoints(movimiento.puntos)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default MisPuntos;
