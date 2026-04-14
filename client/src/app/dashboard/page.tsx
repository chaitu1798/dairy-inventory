'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '../../utils/api';
import { 
    DollarSign, 
    ShoppingCart, 
    TrendingUp, 
    Package, 
    AlertTriangle, 
    Clock, 
    Search, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown, 
    ChevronLeft, 
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Activity
} from 'lucide-react';
import { DashboardStats, Product } from '../../types';
import Input from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import Modal from '../../components/ui/Modal';
import { toast } from 'sonner';
import { generatePdfReport } from '../../utils/generatePdfReport';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '../../components/ui/Table';
import { cn } from '../../lib/utils';

interface StatCardProps {
    readonly title: string;
    readonly value: number | string;
    readonly icon: React.ElementType;
    readonly trend?: {
        value: string;
        isUp: boolean;
    };
    readonly suffix?: string;
    readonly description?: string;
    readonly gradient?: string;
}

const StatCard = ({ title, value, icon: Icon, trend, suffix = '', description, gradient }: StatCardProps) => (
    <Card className="overflow-hidden group">
        <CardContent className="p-0">
            <div className={cn("p-6", gradient && `bg-gradient-to-br ${gradient} text-white`)}>
                <div className="flex items-center justify-between mb-4">
                    <div className={cn(
                        "p-2.5 rounded-xl",
                        gradient ? "bg-white/20 backdrop-blur-md" : "bg-primary/10 text-primary"
                    )}>
                        <Icon className="w-5 h-5" />
                    </div>
                    {trend && (
                        <div className={cn(
                            "flex items-center text-xs font-bold px-2 py-1 rounded-full",
                            gradient 
                                ? "bg-white/20 backdrop-blur-md" 
                                : trend.isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        )}>
                            {trend.isUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                            {trend.value}
                        </div>
                    )}
                </div>
                <div>
                    <p className={cn(
                        "text-sm font-semibold uppercase tracking-wider mb-1",
                        gradient ? "text-white/80" : "text-slate-500"
                    )}>{title}</p>
                    <h3 className="text-3xl font-extrabold tracking-tight">
                        {suffix}{typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value || '0'}
                    </h3>
                    {description && (
                        <p className={cn(
                            "text-xs mt-2 font-medium",
                            gradient ? "text-white/70" : "text-slate-400"
                        )}>{description}</p>
                    )}
                </div>
            </div>
        </CardContent>
    </Card>
);

const SortIcon = ({ field, sortBy, sortOrder }: { field: string, sortBy: string, sortOrder: 'asc' | 'desc' }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-4 h-4 ml-2 text-slate-300 transition-colors group-hover:text-slate-400" />;
    return sortOrder === 'asc' ? <ArrowUp className="w-4 h-4 ml-2 text-primary animate-in fade-in zoom-in duration-300" /> : <ArrowDown className="w-4 h-4 ml-2 text-primary animate-in fade-in zoom-in duration-300" />;
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

    // Dashboard Actions State
    const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const fetchDashboardData = useCallback(async () => {
        try {
            const res = await api.get('/reports/dashboard');
            setDashboardData(res.data);
        } catch (error: unknown) {
            console.warn('Error fetching dashboard data:', error);
        }
    }, []);

    const fetchExpiringItems = useCallback(async () => {
        try {
            const res = await api.get('/reports/expiring');
            setExpiringItems(res.data);
        } catch (error: unknown) {
            console.warn('Error fetching expiring items:', error);
        }
    }, []);

    const fetchLowStockItems = useCallback(async () => {
        try {
            const res = await api.get('/reports/low-stock');
            setLowStockItems(res.data);
        } catch (error: unknown) {
            console.warn('Error fetching low stock items:', error);
        }
    }, []);

    const fetchInventory = useCallback(async () => {
        setIsLoadingInventory(true);
        try {
            const res = await api.get(`/reports/inventory?page=${page}&limit=10&search=${search}&sortBy=${sortBy}&sortOrder=${sortOrder}`);
            if (Array.isArray(res.data)) {
                setInventory(res.data);
            } else {
                setInventory(res.data.data);
                setTotalPages(res.data.totalPages);
            }
        } catch (error: unknown) {
            console.warn('Error fetching inventory:', error);
        } finally {
            setIsLoadingInventory(false);
        }
    }, [page, search, sortBy, sortOrder]);

    useEffect(() => {
        fetchDashboardData();
        fetchExpiringItems();
        fetchLowStockItems();
    }, [fetchDashboardData, fetchExpiringItems, fetchLowStockItems]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchInventory();
        }, 500);
        return () => clearTimeout(timer);
    }, [search, page, sortBy, sortOrder, fetchInventory]);

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    const handleViewAnalytics = () => {
        if (!dashboardData) {
            toast.error('Analytics data is still loading.');
            return;
        }
        setIsAnalyticsModalOpen(true);
    };

    const handleDownloadSummary = async () => {
        if (isDownloading) return;
        setIsDownloading(true);
        toast.info('Initiating report generation...', { id: 'pdf-gen' });
        
        try {
            const today = new Date().toISOString().split('T')[0];
            const res = await api.get(`/reports/daily/details?date=${today}`);
            const { records, totals } = res.data;

            await generatePdfReport({
                title: "Executive Dashboard Summary",
                date: today,
                companyName: "Chaitanya Dairy",
                summary: {
                    totalProducts: dashboardData?.low_stock_count || records?.length || 0,
                    totalPurchases: dashboardData?.today?.total_purchases || 0,
                    totalSales: dashboardData?.today?.total_sales || 0,
                    totalRevenue: dashboardData?.today?.total_sales || 0,
                    totalProfit: dashboardData?.today?.net || 0
                },
                records: records || [],
                totals: totals || {
                    total_purchase_value: 0,
                    total_sales_value: 0,
                    total_gross_profit: 0,
                    total_expenses: 0,
                    net_profit: 0
                }
            });

            toast.success('Summary downloaded successfully!', { id: 'pdf-gen' });
        } catch (error) {
            console.error('Failed to download summary:', error);
            toast.error('Failed to generate summary file', { id: 'pdf-gen' });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="space-y-10 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Hero Welcome Section */}
            <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-8 py-10 md:px-12 md:py-16 text-white shadow-2xl">
                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 font-heading">
                        Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Manager</span>
                    </h1>
                    <p className="text-lg text-slate-300 font-medium leading-relaxed">
                        Your dairy inventory is looking good today. You have {dashboardData?.low_stock_count || 0} low stock items that might need your attention.
                    </p>
                    <div className="flex flex-wrap gap-4 mt-8">
                        <Button 
                            variant="gradient" 
                            size="lg" 
                            className="rounded-full shadow-lg shadow-blue-500/25 group transition-transform hover:scale-105 disabled:opacity-50"
                            onClick={handleViewAnalytics}
                        >
                            <Activity className="w-5 h-5 mr-2 group-hover:animate-pulse" />
                            View Analytics
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="lg" 
                            className="rounded-full bg-white/10 hover:bg-white/20 border-white/10 text-white transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleDownloadSummary}
                            disabled={isDownloading}
                            title="Download PDF report of current data"
                        >
                            {isDownloading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin mr-2 rounded-full" />
                                    Generating...
                                </>
                            ) : (
                                "Download Summary"
                            )}
                        </Button>
                    </div>
                </div>
                {/* Decorative background elements */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 right-0 translate-y-1/2 -translate-x-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-[80px]" />
            </div>

            {/* Today's Performance Grid */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-heading">Today&apos;s Insights</h2>
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Sales"
                        value={dashboardData?.today?.total_sales ?? 0}
                        icon={TrendingUp}
                        trend={{ value: "12%", isUp: true }}
                        suffix="₹"
                        gradient="from-blue-600 to-blue-500"
                    />
                    <StatCard
                        title="Purchases"
                        value={dashboardData?.today?.total_purchases ?? 0}
                        icon={ShoppingCart}
                        suffix="₹"
                        gradient="from-indigo-600 to-indigo-500"
                    />
                    <StatCard
                        title="Expenses"
                        value={dashboardData?.today?.total_expenses ?? 0}
                        icon={DollarSign}
                        suffix="₹"
                        gradient="from-slate-800 to-slate-700"
                    />
                    <StatCard
                        title="Net Profit"
                        value={dashboardData?.today?.net ?? 0}
                        icon={TrendingUp}
                        suffix="₹"
                        description="Net margin calculation"
                        gradient={(dashboardData?.today?.net ?? 0) >= 0 ? "from-emerald-600 to-emerald-500" : "from-rose-600 to-rose-500"}
                    />
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Inventory Status & Alerts */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Secondary Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <Card isGlass={false} className="border-none bg-slate-50">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-white shadow-sm text-blue-600">
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Stock Value</p>
                                        <h4 className="text-xl font-extrabold text-slate-900">₹{dashboardData?.total_stock_value?.toLocaleString() || '0'}</h4>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card isGlass={false} className="border-none bg-amber-50">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-white shadow-sm text-amber-600">
                                        <AlertTriangle className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Low Stock</p>
                                        <h4 className="text-xl font-extrabold text-slate-900">{dashboardData?.low_stock_count || 0} Items</h4>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card isGlass={false} className="border-none bg-rose-50">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-2xl bg-white shadow-sm text-rose-600">
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-rose-500 uppercase tracking-wider">Expiring</p>
                                        <h4 className="text-xl font-extrabold text-slate-900">{dashboardData?.expiring_count || 0} Items</h4>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Alerts Layout */}
                    {(lowStockItems.length > 0 || expiringItems.length > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {lowStockItems.length > 0 && (
                                <Card className="border-none shadow-premium bg-white/50">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg flex items-center text-amber-900">
                                                <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
                                                Low Stock Alerts
                                            </CardTitle>
                                            <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black uppercase tracking-widest">
                                                {lowStockItems.length} critical
                                            </span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {lowStockItems.slice(0, 4).map((item) => (
                                                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-slate-100/50 hover:bg-white transition-all cursor-default group">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-800">{item.name}</span>
                                                        <span className="text-[10px] font-medium text-slate-400">{item.category}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block text-sm font-black text-amber-600">{item.current_stock} {item.unit}</span>
                                                        <span className="block text-[10px] font-bold text-slate-300">Min: {item.min_stock}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {lowStockItems.length > 4 && (
                                                <Button variant="ghost" size="sm" className="w-full text-slate-400 hover:text-primary text-xs font-bold">
                                                    View All Low Stock Items
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {expiringItems.length > 0 && (
                                <Card className="border-none shadow-premium bg-white/50">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-lg flex items-center text-rose-900">
                                                <Clock className="w-5 h-5 mr-2 text-rose-500" />
                                                Expiring Soon
                                            </CardTitle>
                                            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-widest">
                                                Next 7 Days
                                            </span>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {expiringItems.slice(0, 4).map((item) => (
                                                <div key={item.id || `${item.name}-${item.expiry_date}`} className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-slate-100/50 hover:bg-white transition-all cursor-default group">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-slate-800">{item.name}</span>
                                                        <span className="text-[10px] font-medium text-slate-400">Expires: {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-600 text-[11px] font-bold">
                                                            {item.days_until_expiry}d left
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                            {expiringItems.length > 4 && (
                                                <Button variant="ghost" size="sm" className="w-full text-slate-400 hover:text-primary text-xs font-bold">
                                                    View All Expiring Items
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Side: Top Selling & Activity */}
                <Card className="border-none bg-white shadow-premium flex flex-col h-full overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <CardTitle className="text-lg flex items-center mb-1">
                            <TrendingUp className="w-5 h-5 mr-2 text-emerald-500" />
                            Top Performers
                        </CardTitle>
                        <CardDescription>Most sold products this month</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 overflow-y-auto max-h-[600px] scrollbar-modern">
                        <div className="divide-y divide-slate-50 px-6">
                            {dashboardData?.top_selling_products?.map((product, idx: number) => (
                                <div key={product.id || idx} className="py-5 flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-100 text-slate-500 font-black text-xs group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                            {idx + 1}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900 leading-tight">{product.name}</span>
                                            <span className="text-[11px] font-semibold text-slate-400 leading-tight">{product.category}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-sm font-black text-slate-900">₹{product.total_revenue?.toLocaleString()}</span>
                                        <span className="block text-[11px] font-bold text-emerald-500">{product.total_quantity_sold} sold</span>
                                    </div>
                                </div>
                            )) || (
                                <div className="py-10 text-center text-slate-400 text-sm font-medium">No performance data yet.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Current Inventory Table Section */}
            <section className="space-y-6 pb-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-heading">Inventory Overview</h2>
                        <p className="text-sm text-slate-500 font-medium">Detailed tracking of all available dairy products</p>
                    </div>
                    <div className="relative w-full sm:w-80 group">
                        <Input
                            label=""
                            placeholder="Search inventory..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            startAdornment={<Search className="w-4 h-4" />}
                            className="h-11 shadow-sm bg-white"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="cursor-pointer group" onClick={() => handleSort('name')}>
                                    <div className="flex items-center">Product <SortIcon field="name" sortBy={sortBy} sortOrder={sortOrder} /></div>
                                </TableHead>
                                <TableHead className="cursor-pointer group" onClick={() => handleSort('category')}>
                                    <div className="flex items-center">Category <SortIcon field="category" sortBy={sortBy} sortOrder={sortOrder} /></div>
                                </TableHead>
                                <TableHead className="cursor-pointer group text-right" onClick={() => handleSort('current_stock')}>
                                    <div className="flex items-center justify-end">Stock <SortIcon field="current_stock" sortBy={sortBy} sortOrder={sortOrder} /></div>
                                </TableHead>
                                <TableHead className="cursor-pointer group text-right" onClick={() => handleSort('stock_value')}>
                                    <div className="flex items-center justify-end">Value <SortIcon field="stock_value" sortBy={sortBy} sortOrder={sortOrder} /></div>
                                </TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingInventory ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-20 text-center overflow-hidden relative">
                                        <div className="absolute inset-x-0 top-0 h-1 bg-blue-100 overflow-hidden">
                                            <div className="h-full bg-primary animate-progress w-full transition-all" />
                                        </div>
                                        <span className="text-slate-400 font-bold tracking-widest uppercase text-xs">Synchronizing Data...</span>
                                    </TableCell>
                                </TableRow>
                            ) : inventory.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="p-4 rounded-full bg-slate-50 text-slate-300">
                                                <Package className="w-12 h-12" />
                                            </div>
                                            <span className="text-slate-400 font-bold">No products found match your search criteria.</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                inventory.map((item) => (
                                    <TableRow key={item.id} className="group">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center font-bold text-slate-400 text-[10px] group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                                                    {item.name.charAt(0)}
                                                </div>
                                                <span className="font-bold text-slate-900">{item.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                                                {item.category || 'Legacy'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col">
                                                <span className="text-slate-900 font-extrabold">{item.current_stock}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.unit}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="text-slate-900 font-extrabold">₹{item.stock_value?.toLocaleString()}</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.is_low_stock ? (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-500/10">
                                                    Low Stock
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-500/10">
                                                    Healthy
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Modern Pagination Bar */}
                    <div className="bg-slate-50 border-t border-slate-100 px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
                            Showing page <span className="text-slate-900">{page}</span> of <span className="text-slate-900">{totalPages}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl h-9 w-9 p-0 bg-white"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || isLoadingInventory}
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            {/* Page numbers could go here for more direct navigation */}
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl h-9 w-9 p-0 bg-white"
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages || isLoadingInventory}
                            >
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Analytics Modal Section */}
            {isAnalyticsModalOpen && (
                <Modal 
                    isOpen={isAnalyticsModalOpen} 
                    onClose={() => setIsAnalyticsModalOpen(false)}
                    className="max-w-4xl w-full p-0 rounded-3xl overflow-hidden"
                >
                    <div className="bg-slate-900 px-8 py-6 text-white flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black font-heading flex items-center">
                                <Activity className="w-6 h-6 mr-3 text-blue-400" />
                                Deep Analytics
                            </h2>
                            <p className="text-slate-400 text-sm mt-1">Holistic view of all operations</p>
                        </div>
                    </div>
                    <div className="p-8 space-y-8 bg-slate-50/50 max-h-[80vh] overflow-y-auto w-full">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            <div className="p-4 rounded-2xl bg-white shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Revenue</span>
                                <span className="text-2xl font-black text-blue-600">₹{(dashboardData?.today?.total_sales || 0).toLocaleString()}</span>
                            </div>
                            <div className="p-4 rounded-2xl bg-white shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Expiring</span>
                                <span className="text-2xl font-black text-rose-600">{dashboardData?.expiring_count || 0}</span>
                            </div>
                            <div className="p-4 rounded-2xl bg-white shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Total Stock Val</span>
                                <span className="text-2xl font-black text-emerald-600">₹{dashboardData?.total_stock_value?.toLocaleString() || 0}</span>
                            </div>
                            <div className="p-4 rounded-2xl bg-white shadow-sm border border-slate-100 flex flex-col justify-center items-center text-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Low Stock</span>
                                <span className="text-2xl font-black text-amber-600">{dashboardData?.low_stock_count || 0}</span>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Top Fast Moving Items</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {dashboardData?.top_selling_products?.slice(0,4).map((p, i) => (
                                    <div key={p.id || i} className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-900">#{i+1} {p.name}</span>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{p.category}</span>
                                        </div>
                                        <div className="text-right flex flex-col">
                                            <span className="font-black text-slate-900">₹{p.total_revenue?.toLocaleString()}</span>
                                            <span className="text-[10px] text-emerald-500 font-bold">{p.total_quantity_sold} moving</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-end pt-4 border-t border-slate-200">
                            <Button variant="outline" onClick={() => setIsAnalyticsModalOpen(false)} className="rounded-xl font-bold">
                                Close Analytics
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
