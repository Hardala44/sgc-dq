import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { ArrowUpRight } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend
);

const CuadroMando = () => {
    const barData = {
        labels: ['Implants', 'Orthodontics', 'Disposables', 'Equipment', 'Lab'],
        datasets: [{
            label: 'Gasto por Categoría',
            data: [12000, 19000, 3000, 5000, 2000],
            backgroundColor: '#4B5563', // gray-600
            borderRadius: 8,
        }],
    };

    const lineData = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            {
                label: '2026',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: '#2563EB', // blue-600
                backgroundColor: 'rgba(37, 99, 235, 0.5)',
                tension: 0.4,
            },
            {
                label: '2025',
                data: [10, 15, 5, 8, 5, 6],
                borderColor: '#9CA3AF', // gray-400
                backgroundColor: 'rgba(156, 163, 175, 0.5)',
                tension: 0.4,
                borderDash: [5, 5],
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { position: 'bottom' as const },
        },
        scales: {
            y: { beginAtZero: true, grid: { display: false } },
            x: { grid: { display: false } },
        }
    };

    return (
        <div className="container mx-auto px-6 py-12">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                {/* Card 1 */}
                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow">
                    <p className="text-gray-500 font-medium mb-2">Gasto Q1</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-bold text-black">€12.450</h3>
                        <span className="flex items-center text-green-500 text-sm font-bold bg-green-50 px-2 py-1 rounded-lg">
                            <ArrowUpRight size={14} className="mr-1" />
                            12%
                        </span>
                    </div>
                </div>

                {/* Card 2 */}
                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow">
                    <p className="text-gray-500 font-medium mb-2">Ahorro</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-4xl font-bold text-black">€1.850</h3>
                        <span className="text-blue-600 text-sm font-bold bg-blue-50 px-2 py-1 rounded-lg">
                            15% target
                        </span>
                    </div>
                </div>

                {/* Card 3 */}
                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow">
                    <p className="text-gray-500 font-medium mb-2">Cat. mayor</p>
                    <h3 className="text-2xl font-bold text-black truncate">Implantología</h3>
                    <p className="text-gray-400 mt-1">€8.200</p>
                </div>

                {/* Card 4 */}
                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow">
                    <p className="text-gray-500 font-medium mb-2">Puntos</p>
                    <h3 className="text-4xl font-bold text-blue-600">75 pts</h3>
                    <p className="text-gray-400 mt-1">Nivel Oro</p>
                </div>
            </div>

            {/* Selector */}
            <div className="flex flex-wrap gap-6 items-center mb-12 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <select className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-700 outline-none focus:border-blue-500">
                    <option>2026</option>
                    <option>2025</option>
                </select>
                <select className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-700 outline-none focus:border-blue-500">
                    <option>Q1</option>
                    <option>Q2</option>
                    <option>Q3</option>
                    <option>Q4</option>
                </select>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl text-sm font-semibold transition-colors">
                    Actualizar
                </button>
            </div>

            {/* Charts & Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                    <h3 className="text-xl font-bold text-black mb-6">Gasto por Categoría</h3>
                    <Bar options={options} data={barData} />
                </div>

                <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm">
                    <h3 className="text-xl font-bold text-black mb-6">Comparativa Anual</h3>
                    <Line options={options} data={lineData} />
                </div>

                <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-gray-100">
                        <h3 className="text-xl font-bold text-black">Histórico de Movimientos</h3>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-sm">
                            <tr>
                                <th className="px-8 py-4 font-medium">Fecha</th>
                                <th className="px-8 py-4 font-medium">Concepto</th>
                                <th className="px-8 py-4 font-medium">Categoría</th>
                                <th className="px-8 py-4 font-medium text-right">Importe</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            <tr className="hover:bg-gray-50 transition-colors">
                                <td className="px-8 py-4 text-gray-600">12 Feb 2026</td>
                                <td className="px-8 py-4 font-medium text-black">Pedido #12345</td>
                                <td className="px-8 py-4 text-gray-500">Consumibles</td>
                                <td className="px-8 py-4 text-right font-bold text-black">€450.00</td>
                            </tr>
                            <tr className="hover:bg-gray-50 transition-colors">
                                <td className="px-8 py-4 text-gray-600">10 Feb 2026</td>
                                <td className="px-8 py-4 font-medium text-black">Implantes Straumann</td>
                                <td className="px-8 py-4 text-gray-500">Implantología</td>
                                <td className="px-8 py-4 text-right font-bold text-black">€2,100.00</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CuadroMando;
