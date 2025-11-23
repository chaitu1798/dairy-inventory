'use client';

import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { DollarSign, ShoppingCart, TrendingUp, Package, AlertTriangle, Clock, TrendingDown } from 'lucide-react';

export default function Dashboard() {
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [inventory, setInventory] = useState<any[]>([]);
    const [expiringItems, setExpiringItems] = useState<any[]>([]);
    const [lowStockItems, setLowStockItems] = useState<any[]>([]);

    useEffect(() => {
        fetchDashboardData();
        fetchInventory();
        fetchExpiringItems();
        fetchLowStockItems();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const res = await api.get('/reports/dashboard');
            setDashboardData(res.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
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

    const fetchExpiringItems = async () => {
        try {
            const res = await api.get('/reports/expiring');
            setExpiringItems(res.data);
        } catch (error) {
            console.error('Error fetching expiring items:', error);
        }
    };

    const fetchLowStockItems = async () => {
        try {
            const res = await api.get('/reports/low-stock');
            setLowStockItems(res.data);
        } catch (error) {
            console.error('Error fetching low stock items:', error);
        }
    };

    const StatCard = ({ title, value, icon: Icon, color, gradient, suffix = '' }: any) => (
        <div className={`relative overflow-hidden p-6 rounded-xl shadow-lg text-white ${gradient}`}>
            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <p className="text-blue-100 text-sm font-medium mb-1">{title}</p>
                    <h3 className="text-3xl font-bold">{suffix}{typeof value === 'number' ? value.toFixed(2) : value || '0'}</h3>
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

            {/* Today's Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Today's Sales"
                    value={dashboardData?.today?.total_sales}
                    icon={TrendingUp}
                    gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
                    suffix="₹"
                />
                <StatCard
                    title="Today's Purchases"
                    value={dashboardData?.today?.total_purchases}
                    icon={ShoppingCart}
                    gradient="bg-gradient-to-br from-blue-500 to-blue-700"
                    suffix="₹"
                />
                <StatCard
                    title="Today's Expenses"
                    value={dashboardData?.today?.total_expenses}
                    icon={DollarSign}
                    gradient="bg-gradient-to-br from-rose-500 to-rose-700"
                    suffix="₹"
                />
                <StatCard
                    title="Net Profit (Today)"
                    value={dashboardData?.today?.net}
                    icon={Package}
                    gradient={dashboardData?.today?.net >= 0
                        ? "bg-gradient-to-br from-indigo-500 to-indigo-700"
                        : "bg-gradient-to-br from-orange-500 to-orange-700"}
                    suffix="₹"
                />
            </div>

            {/* Stock & Alerts Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Stock Value"
                    value={dashboardData?.total_stock_value}
                    icon={Package}
                    gradient="bg-gradient-to-br from-purple-500 to-purple-700"
                    suffix="₹"
                />
                <StatCard
                    title="Low Stock Items"
                    value={dashboardData?.low_stock_count || 0}
                    icon={AlertTriangle}
                    gradient="bg-gradient-to-br from-amber-500 to-amber-700"
                />
                <StatCard
                    title="Expiring Soon"
                    value={dashboardData?.expiring_count || 0}
                    icon={Clock}
                    gradient="bg-gradient-to-br from-red-500 to-red-700"
                />
            </div>

            {/* Alerts Section */}
            {(lowStockItems.length > 0 || expiringItems.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Low Stock Alerts */}
                    {lowStockItems.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border-l-4 border-amber-500 overflow-hidden">
                            <div className="p-6 bg-amber-50 border-b border-amber-100">
                                <div className="flex items-center">
                                    <AlertTriangle className="w-6 h-6 text-amber-600 mr-2" />
                                    <h2 className="text-xl font-bold text-amber-900">Low Stock Alerts</h2>
                                </div>
                            </div>
                            <div className="p-4 max-h-64 overflow-y-auto">
                                {lowStockItems.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                                        <div>
                                            <p className="font-semibold text-gray-900">{item.name}</p>
                                            <p className="text-sm text-gray-500">{item.category}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-amber-600">{item.current_stock} {item.unit}</p>
                                            <p className="text-xs text-gray-500">Min: {item.min_stock}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Expiring Soon Alerts */}
                    {expiringItems.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border-l-4 border-red-500 overflow-hidden">
                            <div className="p-6 bg-red-50 border-b border-red-100">
                                <div className="flex items-center">
                                    <Clock className="w-6 h-6 text-red-600 mr-2" />
                                    <h2 className="text-xl font-bold text-red-900">Expiring Soon</h2>
                                </div>
                            </div>
                            <div className="p-4 max-h-64 overflow-y-auto">
                                {expiringItems.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                                        <div>
                                            <p className="font-semibold text-gray-900">{item.name}</p>
                                            <p className="text-sm text-gray-500">{item.category}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-red-600">{item.days_until_expiry} days</p>
                                            <p className="text-xs text-gray-500">{new Date(item.expiry_date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Top Selling Products */}
            {dashboardData?.top_selling_products && dashboardData.top_selling_products.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center">
                            <TrendingUp className="w-6 h-6 text-green-600 mr-2" />
                            Top Selling Products
                        </h2>
                    </div>
                    <div className="p-6">
                        <div className="space-y-4">
                            {dashboardData.top_selling_products.map((product: any, idx: number) => (
                                <div key={product.id} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white font-bold text-sm">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{product.name}</p>
                                            <p className="text-sm text-gray-500">{product.category}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-600">₹{product.total_revenue?.toFixed(2)}</p>
                                        <p className="text-sm text-gray-500">{product.total_quantity_sold} units sold</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Current Inventory */}
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
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Value</th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {inventory.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className="px-2 py-1 rounded-full bg-gray-100 text-xs font-medium">{item.category || 'N/A'}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.current_stock} {item.unit}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">₹{item.stock_value?.toFixed(2)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {item.is_low_stock ? (
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center w-fit">
                                                <AlertTriangle className="w-3 h-3 mr-1" />
                                                Low Stock
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                In Stock
                                            </span>
                                        )}
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
