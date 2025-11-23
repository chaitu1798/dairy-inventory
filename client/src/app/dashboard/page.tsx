'use client';

import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { DollarSign, ShoppingCart, TrendingUp, Package } from 'lucide-react';

export default function Dashboard() {
    const [stats, setStats] = useState<any>(null);
    const [inventory, setInventory] = useState<any[]>([]);

    useEffect(() => {
        fetchStats();
        fetchInventory();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/reports/daily');
            setStats(res.data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchInventory = async () => {
        try {
            const res = await api.get('/reports/inventory');
            setInventory(res.data);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        }
    };

    const StatCard = ({ title, value, icon: Icon, color, gradient }: any) => (
        <div className={`relative overflow-hidden p-6 rounded-xl shadow-lg text-white ${gradient}`}>
            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <p className="text-blue-100 text-sm font-medium mb-1">{title}</p>
                    <h3 className="text-3xl font-bold">₹{value?.toFixed(2) || '0.00'}</h3>
                </div>
                <div className={`p-3 rounded-lg bg-white/20 backdrop-blur-sm`}>
                    <Icon className="w-8 h-8 text-white" />
                </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
        </div>
    );

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-500 mt-1">Welcome back! Here's what's happening today.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Today's Sales"
                    value={stats?.total_sales}
                    icon={TrendingUp}
                    gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
                />
                <StatCard
                    title="Today's Purchases"
                    value={stats?.total_purchases}
                    icon={ShoppingCart}
                    gradient="bg-gradient-to-br from-blue-500 to-blue-700"
                />
                <StatCard
                    title="Today's Expenses"
                    value={stats?.total_expenses}
                    icon={DollarSign}
                    gradient="bg-gradient-to-br from-rose-500 to-rose-700"
                />
                <StatCard
                    title="Net Profit (Today)"
                    value={stats?.net}
                    icon={Package}
                    gradient={stats?.net >= 0
                        ? "bg-gradient-to-br from-indigo-500 to-indigo-700"
                        : "bg-gradient-to-br from-orange-500 to-orange-700"}
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Current Inventory</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Purchased</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sold</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {inventory.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className="px-2 py-1 rounded-full bg-gray-100 text-xs font-medium">{item.category || 'N/A'}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.total_purchased}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.total_sold}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${item.current_stock < 10
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-green-100 text-green-700'
                                            }`}>
                                            {item.current_stock}
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
}
