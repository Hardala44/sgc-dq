// import { ArrowUpRight } from 'lucide-react';

const MisPuntos = () => {
    return (
        <div className="bg-white min-h-screen pb-20">
            {/* Hero Section */}
            <div className="container max-w-3xl mx-auto pt-12 px-6">
                <div className="mt-24 bg-gradient-to-br from-gray-50 to-white rounded-[2rem] p-16 text-center shadow-2xl border border-gray-200 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500"></div>

                    <h2 className="text-gray-500 font-medium tracking-wide uppercase mb-4">Saldo Actual</h2>
                    <h1 className="text-8xl font-black text-black mb-8 tracking-tighter">75 <span className="text-4xl text-gray-400 font-bold">pts</span></h1>

                    <div className="inline-block bg-blue-50 text-blue-800 px-8 py-4 rounded-2xl text-xl font-bold mb-12 border border-blue-100">
                        0 números sorteo
                    </div>

                    <div className="max-w-md mx-auto text-left">
                        <div className="flex justify-between text-sm font-semibold text-gray-600 mb-2">
                            <span>Nivel Plata</span>
                            <span>Próximo número en 25 pts</span>
                        </div>
                        <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-600 w-3/4 rounded-full shadow-lg shadow-blue-200"></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* History Table */}
            <div className="container max-w-4xl mx-auto px-6 mt-24">
                <h3 className="text-2xl font-bold text-black mb-8 pl-4 border-l-4 border-blue-600">Histórico de movimientos</h3>

                <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-white border-b border-gray-100">
                            <tr>
                                <th className="px-8 py-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Fecha</th>
                                <th className="px-8 py-6 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Movimiento</th>
                                <th className="px-8 py-6 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Puntos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {[1, 2, 3, 4].map((_, i) => (
                                <tr key={i} className="group hover:bg-gray-50 transition-colors">
                                    <td className="px-8 py-6 text-gray-500 font-medium">12 Feb 2026</td>
                                    <td className="px-8 py-6">
                                        <div className="font-bold text-black group-hover:text-blue-600 transition-colors">Pedido Straumann</div>
                                        <div className="text-xs text-gray-400 mt-1">ID: #482910</div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <span className={`font-bold px-3 py-1 rounded-lg ${i === 1 ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                                            {i === 1 ? '-50' : '+110'} pts
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MisPuntos;
