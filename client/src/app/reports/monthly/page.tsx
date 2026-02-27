'use client';

import { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { TrendingUp, ShoppingCart, DollarSign, Trash2, TrendingDown } from 'lucide-react';

interface MonthlyReportData {
    month: string;
    total_sales?: number;
    total_purchases?: number;
    total_expenses?: number;
    total_waste?: number;
    profit?: number;
}

export default function MonthlyReportPage() {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [reportData, setReportData] = useState<MonthlyReportData[]>([]);

    useEffect(() => {
        fetchReport();
    }, [month, year]);

    const fetchReport = async () => {
        try {
            const res = await api.get(`/reports/monthly?month=${month}&year=${year}`);
            setReportData(res.data);
        } catch (error) {
            console.warn('Error fetching report:', error);
        }
    };

    const totalSales = reportData.reduce((acc, curr) => acc + (curr.total_sales || 0), 0);
    const totalPurchases = reportData.reduce((acc, curr) => acc + (curr.total_purchases || 0), 0);
    const totalExpenses = reportData.reduce((acc, curr) => acc + (curr.total_expenses || 0), 0);
    const totalWaste = reportData.reduce((acc, curr) => acc + (curr.total_waste || 0), 0);
    const netProfit = totalSales - totalPurchases - totalExpenses - totalWaste;

    const StatCard = ({ title, value, icon: Icon, color }: { title: string; value: number; icon: React.ElementType; color: string }) => (
        <div className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 mb-1">{title}</p>
                    <p className={`text-2xl font-bold ${color}`}>₹{value.toFixed(2)}</p>
                </div>
                <Icon className={`w-10 h-10 ${color} opacity-20`} />
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Monthly Report</h1>
                    <p className="text-gray-500 mt-1">Financial overview for selected month</p>
                </div>
                <div className="flex space-x-4">
                    <select
                        value={month}
                        onChange={(e) => setMonth(Number.parseInt(e.target.value, 10))}
                        className="border p-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>
                                {new Date(0, m - 1).toLocaleString('default', { month: 'long' })}
                            </option>
                        ))}
                    </select>
                    <select
                        value={year}
                        onChange={(e) => setYear(Number.parseInt(e.target.value, 10))}
                        className="border p-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard
                    title="Total Sales"
                    value={totalSales}
                    icon={TrendingUp}
                    color="text-green-600"
                />
                <StatCard
                    title="Total Purchases"
                    value={totalPurchases}
                    icon={ShoppingCart}
                    color="text-blue-600"
                />
                <StatCard
                    title="Total Expenses"
                    value={totalExpenses}
                    icon={DollarSign}
                    color="text-rose-600"
                />
                <StatCard
                    title="Total Waste"
                    value={totalWaste}
                    icon={Trash2}
                    color="text-orange-600"
                />
                <StatCard
                    title="Net Profit"
                    value={netProfit}
                    icon={netProfit >= 0 ? TrendingUp : TrendingDown}
                    color={netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}
                />
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Monthly Breakdown</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchases</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waste</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.map((row, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {new Date(row.month).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">₹{row.total_sales?.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">₹{row.total_purchases?.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-rose-600">₹{row.total_expenses?.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">₹{row.total_waste?.toFixed(2)}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${(row.profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                        ₹{row.profit?.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                            {reportData.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        No data found for this month
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
