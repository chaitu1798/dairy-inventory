'use client';

import { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { TrendingUp, ShoppingCart, DollarSign, Package, Download, Trash2 } from 'lucide-react';

export default function DailyReportPage() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, [date]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/reports/daily?date=${date}`);
            setStats(res.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const downloadReport = async () => {
        try {
            const res = await api.get(`/reports/daily/details?date=${date}`);
            const { records, totals } = res.data;

            const header = ['Date', 'Product Name', 'Opening Stock', 'Purchases (Qty)', 'Sales (Qty)', 'Closing Stock', 'Total Purchase Value', 'Total Sales Value', 'Gross Profit', 'Net Profit (after expenses)', 'Notes'];

            const rows = records.map((r: any) => [
                r.date,
                r.product_name,
                r.opening_stock,
                r.purchases_qty,
                r.sales_qty,
                r.closing_stock,
                r.total_purchase_value.toFixed(2),
                r.total_sales_value.toFixed(2),
                r.gross_profit.toFixed(2),
                '', // Net Profit empty for product rows
                r.notes
            ]);

            // Total Row
            const totalRow = [
                'TOTALS',
                '',
                '',
                '',
                '',
                '',
                totals.total_purchase_value.toFixed(2),
                totals.total_sales_value.toFixed(2),
                totals.total_gross_profit.toFixed(2),
                totals.net_profit.toFixed(2),
                `Expenses: ${totals.total_expenses.toFixed(2)}`
            ];

            const csvContent = [
                header.join(','),
                ...rows.map((r: any[]) => r.join(',')),
                totalRow.join(',')
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `Daily_Report_${date}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Error downloading report:', error);
            alert('Failed to download report');
        }
    };

    const StatCard = ({ title, value, icon: Icon, gradient, delay }: any) => (
        <div
            className={`relative overflow-hidden p-6 rounded-xl shadow-lg text-white ${gradient} transform transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-fade-in-up`}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <p className="text-blue-100 text-sm font-medium mb-1">{title}</p>
                    <h3 className="text-3xl font-bold">₹{value?.toFixed(2) || '0.00'}</h3>
                </div>
                <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm">
                    <Icon className="w-8 h-8 text-white" />
                </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Daily Report</h1>
                    <p className="text-gray-500 mt-1">View financial summary for {date}</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="border border-gray-300 p-2 rounded-lg w-full md:w-auto focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <button
                        onClick={downloadReport}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center gap-2 whitespace-nowrap transition-all transform hover:scale-105 active:scale-95"
                    >
                        <Download className="w-4 h-4" />
                        Download CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard
                    title="Total Sales"
                    value={stats?.total_sales}
                    icon={TrendingUp}
                    gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
                    delay={0}
                />
                <StatCard
                    title="Total Purchases"
                    value={stats?.total_purchases}
                    icon={ShoppingCart}
                    gradient="bg-gradient-to-br from-blue-500 to-blue-700"
                    delay={100}
                />
                <StatCard
                    title="Total Expenses"
                    value={stats?.total_expenses}
                    icon={DollarSign}
                    gradient="bg-gradient-to-br from-rose-500 to-rose-700"
                    delay={200}
                />
                <StatCard
                    title="Total Waste"
                    value={stats?.total_waste}
                    icon={Trash2}
                    gradient="bg-gradient-to-br from-orange-500 to-orange-700"
                    delay={250}
                />
                <StatCard
                    title="Profit"
                    value={stats?.profit}
                    icon={Package}
                    gradient={stats?.profit >= 0
                        ? "bg-gradient-to-br from-indigo-500 to-indigo-700"
                        : "bg-gradient-to-br from-red-600 to-red-800"}
                    delay={300}
                />
            </div>

            {/* Profit Breakdown */}
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Profit Calculation</h2>
                <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2">
                        <span className="text-gray-600">Sales Revenue</span>
                        <span className="font-semibold text-green-600">+₹{stats?.total_sales?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-t pt-2">
                        <span className="text-gray-600">Purchases</span>
                        <span className="font-semibold text-red-600">-₹{stats?.total_purchases?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2">
                        <span className="text-gray-600">Expenses</span>
                        <span className="font-semibold text-red-600">-₹{stats?.total_expenses?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2">
                        <span className="text-gray-600">Waste/Loss</span>
                        <span className="font-semibold text-red-600">-₹{stats?.total_waste?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300">
                        <span className="text-lg font-bold text-gray-900">Net Profit</span>
                        <span className={`text-2xl font-bold ${stats?.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ₹{stats?.profit?.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
