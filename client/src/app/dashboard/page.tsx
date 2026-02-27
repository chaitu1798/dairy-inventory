'use client';

import { useEffect, useState } from 'react';
import api from '../../utils/api';
import { DollarSign, ShoppingCart, TrendingUp, Package, AlertTriangle, Clock, TrendingDown, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { DashboardStats, Product } from '../../types';
import Input from '../../components/ui/Input';
import Tooltip from '../../components/ui/Tooltip'; // [NEW]
import { Button } from '../../components/ui/Button';

interface StatCardProps {
    readonly title: string;
    readonly value: number | string;
    readonly icon: React.ElementType;
    readonly color: string;
    readonly suffix?: string;
    readonly tooltip?: string;
}

const StatCard = ({ title, value, icon: Icon, color, suffix = '', tooltip }: StatCardProps) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
            <div>
                <div className="flex items-center mb-1">
                    <p className="text-gray-500 text-sm font-medium uppercase tracking-wider mr-2">{title}</p>
                    {tooltip && <Tooltip content={tooltip} />}
                </div>
                <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{suffix}{typeof value === 'number' ? value.toFixed(2) : value || '0'}</h3>
            </div>
            <div className={`p-4 rounded-xl ${color}`}>
                <Icon className="w-6 h-6" />
            </div>
        </div>
    </div>
);

interface SortIconProps {
    readonly field: string;
    readonly sortBy: string;
    readonly sortOrder: 'asc' | 'desc';
}

const SortIcon = ({ field, sortBy, sortOrder }: SortIconProps) => {
    if (sortBy !== field) return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400 opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-4 h-4 ml-1 text-primary" /> : <ArrowDown className="w-4 h-4 ml-1 text-primary" />;
};

export default function Dashboard() {
    const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
    const [inventory, setInventory] = useState<Product[]>([]);
    const [expiringItems, setExpiringItems] = useState<Product[]>([]);
    const [lowStockItems, setLowStockItems] = useState<Product[]>([]);

    // Inventory Table State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [isLoadingInventory, setIsLoadingInventory] = useState(false);

    useEffect(() => {
        fetchDashboardData();
        fetchExpiringItems();
        fetchLowStockItems();
    }, []);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchInventory();
        }, 500);
        return () => clearTimeout(timer);
    }, [search, page, sortBy, sortOrder]);

    const fetchDashboardData = async () => {
        try {
            const res = await api.get('/reports/dashboard');
            setDashboardData(res.data);
        } catch (error) {
            console.warn('Error fetching dashboard data:', error);
        }
    };

    const fetchInventory = async () => {
        setIsLoadingInventory(true);
        try {
            const res = await api.get(`/reports/inventory?page=${page}&limit=10&search=${search}&sortBy=${sortBy}&sortOrder=${sortOrder}`);
            // Handle both old array format (fallback) and new paginated object format
            if (Array.isArray(res.data)) {
                setInventory(res.data);
            } else {
                setInventory(res.data.data);
                setTotalPages(res.data.totalPages);
            }
        } catch (error) {
            console.warn('Error fetching inventory:', error);
        } finally {
            setIsLoadingInventory(false);
        }
    };

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const fetchExpiringItems = async () => {
        try {
            const res = await api.get('/reports/expiring');
            setExpiringItems(res.data);
        } catch (error) {
            console.warn('Error fetching expiring items:', error);
        }
    };

    const fetchLowStockItems = async () => {
        try {
            const res = await api.get('/reports/low-stock');
            setLowStockItems(res.data);
        } catch (error) {
            console.warn('Error fetching low stock items:', error);
        }
    };

    return (
        <div className="space-y-12 max-w-7xl mx-auto">
            <div>
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
                <p className="text-lg text-gray-500 mt-2 font-medium">Welcome back! Here's an overview of your dairy business.</p>
            </div>

            {/* Today's Stats */}

            <section className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Today's Performance</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <StatCard
                        title="Sales"
                        value={dashboardData?.today?.total_sales ?? 0}
                        icon={TrendingUp}
                        color="bg-emerald-50 text-emerald-600"
                        suffix="₹"
                    />
                    <StatCard
                        title="Purchases"
                        value={dashboardData?.today?.total_purchases ?? 0}
                        icon={ShoppingCart}
                        color="bg-blue-50 text-blue-600"
                        suffix="₹"
                    />
                    <StatCard
                        title="Expenses"
                        value={dashboardData?.today?.total_expenses ?? 0}
                        icon={DollarSign}
                        color="bg-rose-50 text-rose-600"
                        suffix="₹"
                    />
                    <StatCard
                        title="Net Profit"
                        value={dashboardData?.today?.net ?? 0}
                        icon={Package}
                        color={(dashboardData?.today?.net ?? 0) >= 0
                            ? "bg-indigo-50 text-indigo-600"
                            : "bg-orange-50 text-orange-600"}
                        suffix="₹"
                        tooltip="Total Sales - (Total Purchases + Total Expenses)"
                    />
                </div>
            </section>

            {/* Stock & Alerts Overview */}

            <section className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 tracking-tight">Inventory Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <StatCard
                        title="Total Stock Value"
                        value={dashboardData?.total_stock_value ?? 0}
                        icon={Package}
                        color="bg-purple-50 text-purple-600"
                        suffix="₹"
                        tooltip="Total value of current inventory calculated using Cost Price."
                    />
                    <StatCard
                        title="Low Stock Items"
                        value={dashboardData?.low_stock_count || 0}
                        icon={AlertTriangle}
                        color="bg-amber-50 text-amber-600"
                    />
                    <StatCard
                        title="Expiring Soon"
                        value={dashboardData?.expiring_count || 0}
                        icon={Clock}
                        color="bg-red-50 text-red-600"
                    />
                </div>
            </section>

            {/* Alerts Section */}
            {(lowStockItems.length > 0 || expiringItems.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Low Stock Alerts */}
                    {lowStockItems.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border-l-4 border-amber-500 overflow-hidden">
                            <div className="p-6 bg-amber-50 border-b border-amber-100 flex justify-between items-center">
                                <div className="flex items-center">
                                    <AlertTriangle className="w-6 h-6 text-amber-600 mr-2" />
                                    <h2 className="text-xl font-bold text-amber-900">Low Stock</h2>
                                </div>
                                <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{lowStockItems.length} items</span>
                            </div>
                            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                                {lowStockItems.map((item) => (
                                    <div key={item.id} className="p-4 hover:bg-amber-50/30 transition-colors">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="font-semibold text-gray-900">{item.name}</p>
                                            <p className="text-sm font-bold text-amber-600">{item.current_stock} {item.unit}</p>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-gray-500">
                                            <span>{item.category}</span>
                                            <span>Min: {item.min_stock}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Expiring Soon Alerts */}
                    {expiringItems.length > 0 && (
                        <div className="bg-white rounded-xl shadow-sm border-l-4 border-red-500 overflow-hidden">
                            <div className="p-6 bg-red-50 border-b border-red-100 flex justify-between items-center">
                                <div className="flex items-center">
                                    <Clock className="w-6 h-6 text-red-600 mr-2" />
                                    <h2 className="text-xl font-bold text-red-900">Expiring Soon</h2>
                                </div>
                                <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{expiringItems.length} items</span>
                            </div>
                            <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                                {expiringItems.map((item) => (
                                    <div key={item.id || `${item.name}-${item.expiry_date}`} className="p-4 hover:bg-red-50/30 transition-colors">
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="font-semibold text-gray-900">{item.name}</p>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                {item.days_until_expiry} days
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-gray-500">
                                            <span>{item.category}</span>
                                            <span>Expires: {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}</span>
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
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-100">
                        <h2 className="text-xl font-bold text-gray-900 flex items-center tracking-tight">
                            <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                            Top Selling Products
                        </h2>
                    </div>
                    <div className="p-8">
                        <div className="space-y-6">
                            {dashboardData.top_selling_products.map((product, idx: number) => (
                                <div key={product.id || idx} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-6">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-50 text-green-600 font-bold text-sm">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 text-lg">{product.name}</p>
                                            <p className="text-sm text-gray-500 mt-1">{product.category}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-600 text-lg">₹{product.total_revenue?.toFixed(2)}</p>
                                        <p className="text-sm text-gray-500 mt-1">{product.total_quantity_sold} units sold</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Current Inventory - Responsive */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">Current Inventory</h2>
                    <div className="relative max-w-sm w-full sm:w-72">
                        <Input
                            label="Search Products"
                            placeholder="Search by name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            startAdornment={<Search className="w-4 h-4" />}
                            className="bg-gray-50"
                        />
                    </div>
                </div>

                {/* Mobile View: Card Stack */}
                <div className="md:hidden divide-y divide-gray-100">
                    {inventory.map((item) => (
                        <div key={item.id} className="p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-lg">{item.name}</h3>
                                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                                        {item.category || 'Uncategorized'}
                                    </span>
                                </div>
                                <div className="text-right">
                                    {item.is_low_stock ? (
                                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center">
                                            <AlertTriangle className="w-3 h-3 mr-1" aria-hidden="true" />
                                            Low
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                            OK
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase font-semibold">Stock</p>
                                    <p className="text-lg font-bold text-gray-900">{item.current_stock} <span className="text-sm font-normal text-gray-500">{item.unit}</span></p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <p className="text-xs text-gray-500 uppercase font-semibold">Value</p>
                                    <p className="text-lg font-bold text-gray-900">₹{item.stock_value?.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {inventory.length === 0 && (
                        <div className="p-8 text-center text-gray-500">No inventory items found.</div>
                    )}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th
                                    className="px-8 py-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 transition-colors"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center">Product <SortIcon field="name" sortBy={sortBy} sortOrder={sortOrder} /></div>
                                </th>
                                <th
                                    className="px-8 py-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 transition-colors"
                                    onClick={() => handleSort('category')}
                                >
                                    <div className="flex items-center">Category <SortIcon field="category" sortBy={sortBy} sortOrder={sortOrder} /></div>
                                </th>
                                <th
                                    className="px-8 py-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 transition-colors"
                                    onClick={() => handleSort('current_stock')}
                                >
                                    <div className="flex items-center">Stock <SortIcon field="current_stock" sortBy={sortBy} sortOrder={sortOrder} /></div>
                                </th>
                                <th
                                    className="px-8 py-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-900 transition-colors"
                                    onClick={() => handleSort('stock_value')}
                                >
                                    <div className="flex items-center">Stock Value <SortIcon field="stock_value" sortBy={sortBy} sortOrder={sortOrder} /></div>
                                </th>
                                <th className="px-8 py-5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {isLoadingInventory ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        Loading inventory data...
                                    </td>
                                </tr>
                            ) : inventory.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No inventory items found.
                                    </td>
                                </tr>
                            ) : (
                                inventory.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-5 whitespace-nowrap text-sm font-semibold text-gray-900">
                                            {item.name}
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-500">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {item.category || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-600 font-medium">{item.current_stock} <span className="text-gray-400 font-normal">{item.unit}</span></td>
                                        <td className="px-8 py-5 whitespace-nowrap text-sm font-semibold text-gray-900">₹{item.stock_value?.toFixed(2)}</td>
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            {item.is_low_stock ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
                                                    Low
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                    Optimal
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Stats & Controls */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || isLoadingInventory}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || isLoadingInventory}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
