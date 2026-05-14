'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '../../../utils/api';
import {
    TrendingUp,
    ShoppingCart,
    DollarSign,
    Package,
    Download,
    Trash2,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    BarChart3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';
import { generatePdfReport } from '../../../utils/generatePdfReport';

// interface DailyRecord removed (unused)

interface DailyStats {
    total_sales: number;
    total_counter_sales?: number;
    total_distribution_sales?: number;
    total_purchases: number;
    total_expenses: number;
    total_waste: number;
    profit: number;
}

export default function DailyReportPage() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [stats, setStats] = useState<DailyStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/reports/daily?date=${date}`);
            setStats(res.data);
        } catch (error) {
            console.warn('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    }, [date]);

    useEffect(() => {
        fetchStats();
    }, [date, fetchStats]);

    const downloadReport = async () => {
        setIsExporting(true);
        try {
            const res = await api.get(`/reports/daily/details?date=${date}`);
            const { records, totals } = res.data;

            await generatePdfReport({
                title: "Daily Inventory & Sales Report",
                date: date,
                companyName: "Dairy 01",
                summary: {
                    totalProducts: records.length,
                    totalPurchases: totals.total_purchase_value,
                    totalSales: totals.total_sales_value,
                    totalRevenue: totals.total_sales_value,
                    totalProfit: totals.net_profit
                },
                records: records,
                totals: totals
            });

            toast.success('PDF Report Generated Successfully');
        } catch (error) {
            console.warn('Error downloading report:', error);
            toast.error('Failed to generate PDF report');
        } finally {
            setIsExporting(false);
        }
    };

    const StatCard = ({ title, value, icon: Icon, type, delay }: { title: string; value?: number; icon: React.ElementType; type: 'positive' | 'negative' | 'neutral' | 'accent', delay: number }) => {
        const typeStyles = {
            positive: "from-emerald-500/20 to-emerald-500/5 text-emerald-600 ring-emerald-500/30 shadow-emerald-500/10",
            negative: "from-rose-500/20 to-rose-500/5 text-rose-600 ring-rose-500/30 shadow-rose-500/10",
            neutral: "from-blue-500/20 to-blue-500/5 text-blue-600 ring-blue-500/30 shadow-blue-500/10",
            accent: "from-amber-500/20 to-amber-500/5 text-amber-600 ring-amber-500/30 shadow-amber-500/10",
            iconBg: {
                positive: "bg-emerald-100/80 text-emerald-600",
                negative: "bg-rose-100/80 text-rose-600",
                neutral: "bg-blue-100/80 text-blue-600",
                accent: "bg-amber-100/80 text-amber-600"
            }
        };

        return (
            <div
                className="relative group bg-white/60 backdrop-blur-xl rounded-[2rem] p-6 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between animate-fade-in-up transition-all hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] overflow-hidden duration-500"
                style={{ animationDelay: `${delay}ms` }}
            >
                {/* Background mesh glow */}
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50 group-hover:opacity-100 transition-opacity duration-500", typeStyles[type])} />
                
                <div className="relative z-10 flex justify-between items-start mb-6">
                    <div className={cn("p-3.5 rounded-2xl shadow-inner", typeStyles.iconBg[type])}>
                        <Icon className="w-6 h-6" />
                    </div>
                    {type === 'positive' && <ArrowUpRight className="w-5 h-5 text-emerald-500" />}
                    {type === 'negative' && <ArrowDownRight className="w-5 h-5 text-rose-500" />}
                </div>
                <div className="relative z-10">
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">{title}</p>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">₹{value?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</h3>
                </div>
            </div>
        );
    };

    return (
        <div className="relative min-h-[calc(100vh-100px)] animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto overflow-hidden">
            {/* Ambient Background Glowing Orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-400/20 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 font-heading mb-1">Daily Performance</h1>
                    <p className="text-slate-500 font-medium whitespace-nowrap">Financial snapshot and metric breakdown for the selected day.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto p-2 bg-white/70 backdrop-blur-md rounded-2xl shadow-premium border border-slate-100">
                    <div className="flex items-center px-4 w-full sm:w-auto">
                        <Calendar className="w-4 h-4 text-slate-400 mr-2" />
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none w-full sm:w-auto"
                        />
                    </div>
                    <Button
                        onClick={downloadReport}
                        disabled={isExporting}
                        variant="gradient"
                        className="w-full sm:w-auto rounded-xl shadow-lg shadow-blue-500/20"
                    >
                        {isExporting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white animate-spin mr-2 rounded-full" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <Download className="w-4 h-4 mr-2" />
                                Export PDF Report
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-32 flex-col gap-4 bg-white/50 rounded-3xl border border-slate-100 backdrop-blur-sm">
                    <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Compiling Report...</span>
                </div>
            ) : (
                <>
                    {/* Top Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        <StatCard
                            title="Gross Sales"
                            value={stats?.total_sales}
                            icon={TrendingUp}
                            type="positive"
                            delay={0}
                        />
                        <StatCard
                            title="Counter Sales"
                            value={stats?.total_counter_sales || 0}
                            icon={ShoppingCart}
                            type="positive"
                            delay={100}
                        />
                        <StatCard
                            title="Dist. Sales"
                            value={stats?.total_distribution_sales || 0}
                            icon={Package}
                            type="positive"
                            delay={200}
                        />
                        <StatCard
                            title="Inv. Purchases"
                            value={stats?.total_purchases}
                            icon={ShoppingCart}
                            type="neutral"
                            delay={300}
                        />
                        <StatCard
                            title="Op. Expenses"
                            value={stats?.total_expenses}
                            icon={DollarSign}
                            type="negative"
                            delay={400}
                        />
                    </div>

                    {/* Profit Calculation Section */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        <div className="xl:col-span-2">
                            <Card className="h-full border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl overflow-hidden relative rounded-[2rem]">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-emerald-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                                <CardHeader className="pb-8 relative z-10">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2.5 rounded-2xl bg-white shadow-sm text-blue-600 border border-slate-100">
                                            <BarChart3 className="w-5 h-5" />
                                        </div>
                                        <CardTitle className="text-2xl font-black text-slate-800">Net Profit Ledger</CardTitle>
                                    </div>
                                    <CardDescription className="text-slate-500 font-medium">Step-by-step calculation breakdown</CardDescription>
                                </CardHeader>
                                <CardContent className="relative z-10">
                                    <div className="space-y-4">
                                        {/* Revenue Row */}
                                        <div className="flex justify-between items-center p-5 rounded-2xl bg-white/80 border border-white shadow-sm transition-all hover:shadow-md hover:scale-[1.01] duration-300 group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-emerald-100/80 flex items-center justify-center relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-emerald-400/20 group-hover:scale-150 transition-transform duration-500 rounded-full blur-md" />
                                                    <TrendingUp className="w-4 h-4 text-emerald-600 relative z-10" />
                                                </div>
                                                <span className="font-bold text-slate-700">Gross Sales Revenue</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-lg font-black text-emerald-600">+ ₹{stats?.total_sales?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                                <div className="text-[10px] font-bold text-slate-400 mt-1">
                                                    Counter: ₹{(stats?.total_counter_sales || 0).toLocaleString()} • Dist: ₹{(stats?.total_distribution_sales || 0).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Purchases Row */}
                                        <div className="flex justify-between items-center p-5 rounded-2xl bg-white/80 border border-white shadow-sm transition-all hover:shadow-md hover:scale-[1.01] duration-300 group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-blue-100/80 flex items-center justify-center relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-blue-400/20 group-hover:scale-150 transition-transform duration-500 rounded-full blur-md" />
                                                    <ShoppingCart className="w-4 h-4 text-blue-600 relative z-10" />
                                                </div>
                                                <span className="font-bold text-slate-700">Cost of Goods (Purchases)</span>
                                            </div>
                                            <span className="text-lg font-black text-blue-600">- ₹{stats?.total_purchases?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>

                                        {/* Expenses Row */}
                                        <div className="flex justify-between items-center p-5 rounded-2xl bg-white/80 border border-white shadow-sm transition-all hover:shadow-md hover:scale-[1.01] duration-300 group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-rose-100/80 flex items-center justify-center relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-rose-400/20 group-hover:scale-150 transition-transform duration-500 rounded-full blur-md" />
                                                    <DollarSign className="w-4 h-4 text-rose-600 relative z-10" />
                                                </div>
                                                <span className="font-bold text-slate-700">Operational Expenses</span>
                                            </div>
                                            <span className="text-lg font-black text-rose-600">- ₹{stats?.total_expenses?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>

                                        {/* Waste Row */}
                                        <div className="flex justify-between items-center p-5 rounded-2xl bg-white/80 border border-white shadow-sm transition-all hover:shadow-md hover:scale-[1.01] duration-300 group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-amber-100/80 flex items-center justify-center relative overflow-hidden">
                                                    <div className="absolute inset-0 bg-amber-400/20 group-hover:scale-150 transition-transform duration-500 rounded-full blur-md" />
                                                    <Trash2 className="w-4 h-4 text-amber-600 relative z-10" />
                                                </div>
                                                <span className="font-bold text-slate-700">Shrinkage & Waste Loss</span>
                                            </div>
                                            <span className="text-lg font-black text-amber-600">- ₹{stats?.total_waste?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Net Position Summary */}
                        <div className="xl:col-span-1">
                            <Card className="h-full border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl relative overflow-hidden flex flex-col justify-center rounded-[2rem] group hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-500">
                                <div className={cn(
                                    "absolute inset-0 opacity-40 transition-opacity duration-700 group-hover:opacity-70",
                                    (stats?.profit || 0) > 0 ? "bg-gradient-to-br from-emerald-400/30 to-emerald-300/10" :
                                        (stats?.profit || 0) < 0 ? "bg-gradient-to-br from-rose-400/30 to-rose-300/10" :
                                            "bg-gradient-to-br from-blue-400/30 to-blue-300/10"
                                )} />
                                
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none mix-blend-overlay" />

                                <CardContent className="p-10 relative z-10 flex flex-col items-center text-center">
                                    <div className={cn(
                                        "p-4 rounded-3xl mb-8 shadow-inner backdrop-blur-md transition-transform duration-500 group-hover:scale-110",
                                        (stats?.profit || 0) > 0 ? "bg-emerald-100/50 text-emerald-600" :
                                            (stats?.profit || 0) < 0 ? "bg-rose-100/50 text-rose-600" :
                                                "bg-blue-100/50 text-blue-600"
                                    )}>
                                        <Package className="w-10 h-10" />
                                    </div>
                                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3">Net Daily Position</p>
                                    <h2 className={cn(
                                        "text-5xl font-black tracking-tighter mb-8",
                                        (stats?.profit || 0) > 0 ? "text-emerald-600" :
                                            (stats?.profit || 0) < 0 ? "text-rose-600" :
                                                "text-blue-600"
                                    )}>
                                        ₹{stats?.profit?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </h2>

                                    <div className={cn(
                                        "px-8 py-3 rounded-2xl text-sm font-black tracking-wide border backdrop-blur-md transition-all duration-300 shadow-sm",
                                        (stats?.profit || 0) > 0 ? "bg-emerald-100/80 text-emerald-700 border-emerald-200/50" :
                                            (stats?.profit || 0) < 0 ? "bg-rose-100/80 text-rose-700 border-rose-200/50" :
                                                "bg-blue-100/80 text-blue-700 border-blue-200/50"
                                    )}>
                                        {(stats?.profit || 0) > 0 ? 'Operating at a Profit' :
                                            (stats?.profit || 0) < 0 ? 'Operating at a Loss' :
                                                'Operating at Break Even'}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </>
            )}
            </div>
        </div>
    );
}
