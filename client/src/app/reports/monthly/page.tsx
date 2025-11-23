'use client';

import { useState, useEffect } from 'react';
import api from '../../../utils/api';

export default function MonthlyReportPage() {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [reportData, setReportData] = useState<any[]>([]);

    useEffect(() => {
        fetchReport();
    }, [month, year]);

    const fetchReport = async () => {
        try {
            const res = await api.get(`/reports/monthly?month=${month}&year=${year}`);
            setReportData(res.data);
        } catch (error) {
            console.error('Error fetching report:', error);
        }
    };

    const totalSales = reportData.reduce((acc, curr) => acc + (curr.total_sales || 0), 0);
    const totalPurchases = reportData.reduce((acc, curr) => acc + (curr.total_purchases || 0), 0);
    const totalExpenses = reportData.reduce((acc, curr) => acc + (curr.total_expenses || 0), 0);
    const netProfit = totalSales - totalPurchases - totalExpenses;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Monthly Report</h1>
                <div className="flex space-x-4">
                    <select
                        value={month}
                        onChange={(e) => setMonth(parseInt(e.target.value))}
                        className="border p-2 rounded"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>
                                {new Date(0, m - 1).toLocaleString('default', { month: 'long' })}
                            </option>
                        ))}
                    </select>
                    <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="border p-2 rounded"
                    >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <p className="text-sm text-gray-500">Total Sales</p>
                    <p className="text-2xl font-bold text-green-600">₹{totalSales.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <p className="text-sm text-gray-500">Total Purchases</p>
                    <p className="text-2xl font-bold text-blue-600">₹{totalPurchases.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <p className="text-sm text-gray-500">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-600">₹{totalExpenses.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <p className="text-sm text-gray-500">Net Profit</p>
                    <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        ₹{netProfit.toFixed(2)}
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchases</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {reportData.map((row, index) => (
                            <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {new Date(row.month).toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">₹{row.total_sales}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">₹{row.total_purchases}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">₹{row.total_expenses}</td>
                            </tr>
                        ))}
                        {reportData.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No data found for this month</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
