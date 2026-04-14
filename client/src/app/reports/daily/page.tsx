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
            positive: "bg-emerald-50 text-emerald-600 ring-emerald-500/20",
            negative: "bg-rose-50 text-rose-600 ring-rose-500/20",
            neutral: "bg-blue-50 text-blue-600 ring-blue-500/20",
            accent: "bg-amber-50 text-amber-600 ring-amber-500/20"
        };

        return (
            <div
                className="bg-white rounded-3xl p-6 shadow-premium border border-slate-100 flex flex-col justify-between animate-fade-in-up transition-transform hover:-translate-y-1 duration-300"
                style={{ animationDelay: `${delay}ms` }}
            >
                <div className="flex justify-between items-start mb-6">
                    <div className={cn("p-3 rounded-2xl ring-1 shadow-sm", typeStyles[type])}>
                        <Icon className="w-6 h-6" />
                    </div>
                    {type === 'positive' && <ArrowUpRight className="w-5 h-5 text-emerald-500" />}
                    {type === 'negative' && <ArrowDownRight className="w-5 h-5 text-rose-500" />}
                </div>
                <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">{title}</p>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">₹{value?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</h3>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-heading">Daily Performance</h1>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="Gross Sales"
                            value={stats?.total_sales}
                            icon={TrendingUp}
                            type="positive"
                            delay={0}
                        />
                        <StatCard
                            title="Inventory Purchases"
                            value={stats?.total_purchases}
                            icon={ShoppingCart}
                            type="neutral"
                            delay={100}
                        />
                        <StatCard
                            title="Operational Expenses"
                            value={stats?.total_expenses}
                            icon={DollarSign}
                            type="negative"
                            delay={200}
                        />
                        <StatCard
                            title="Shrinkage & Waste"
                            value={stats?.total_waste}
                            icon={Trash2}
                            type="negative"
                            delay={300}
                        />
                    </div>

                    {/* Profit Calculation Section */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        <div className="xl:col-span-2">
                            <Card className="h-full border-none shadow-premium bg-white overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                                <CardHeader className="pb-8 relative z-10">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 rounded-xl bg-slate-50 text-slate-500">
                                            <BarChart3 className="w-5 h-5" />
                                        </div>
                                        <CardTitle className="text-2xl font-black">Net Profit Ledger</CardTitle>
                                    </div>
                                    <CardDescription>Step-by-step calculation breakdown</CardDescription>
                                </CardHeader>
                                <CardContent className="relative z-10">
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50/50 border border-slate-100 transition-colors hover:bg-slate-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                <span className="font-bold text-slate-700">Gross Sales Revenue</span>
                                            </div>
                                            <span className="text-lg font-black text-emerald-600">+ ₹{stats?.total_sales?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>

                                        <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50/50 border border-slate-100 transition-colors hover:bg-slate-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                <span className="font-bold text-slate-700">Cost of Goods (Purchases)</span>
                                            </div>
                                            <span className="text-lg font-black text-blue-600">- ₹{stats?.total_purchases?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>

                                        <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50/50 border border-slate-100 transition-colors hover:bg-slate-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-rose-500" />
                                                <span className="font-bold text-slate-700">Operational Expenses</span>
                                            </div>
                                            <span className="text-lg font-black text-rose-600">- ₹{stats?.total_expenses?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </div>

                                        <div className="flex justify-between items-center p-4 rounded-2xl bg-slate-50/50 border border-slate-100 transition-colors hover:bg-slate-50">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-amber-500" />
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
                            <Card className="h-full border-none shadow-premium relative overflow-hidden flex flex-col justify-center bg-white">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />

                                <CardContent className="p-10 relative z-10 flex flex-col items-center text-center">
                                    <div className={cn(
                                        "p-4 rounded-3xl mb-8 ring-1",
                                        (stats?.profit || 0) > 0 ? "bg-emerald-50 text-emerald-600 ring-emerald-100" :
                                            (stats?.profit || 0) < 0 ? "bg-rose-50 text-rose-600 ring-rose-100" :
                                                "bg-blue-50 text-blue-600 ring-blue-100"
                                    )}>
                                        <Package className="w-10 h-10" />
                                    </div>
                                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Net Daily Position</p>
                                    <h2 className={cn(
                                        "text-5xl font-black tracking-tighter mb-6",
                                        (stats?.profit || 0) > 0 ? "text-emerald-600" :
                                            (stats?.profit || 0) < 0 ? "text-rose-600" :
                                                "text-blue-600"
                                    )}>
                                        ₹{stats?.profit?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </h2>

                                    <div className={cn(
                                        "px-6 py-2.5 rounded-full text-sm font-black tracking-wide shadow-sm border transition-all duration-300",
                                        (stats?.profit || 0) > 0 ? "bg-[#DCFCE7] text-[#166534] border-[#86EFAC] shadow-emerald-100" :
                                            (stats?.profit || 0) < 0 ? "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5] shadow-rose-100" :
                                                "bg-[#E0F2FE] text-[#1D4ED8] border-[#93C5FD] shadow-blue-100"
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
    );
}
