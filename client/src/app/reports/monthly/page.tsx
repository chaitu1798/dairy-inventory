'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '../../../utils/api';
import { 
    TrendingUp, 
    ShoppingCart, 
    DollarSign, 
    Trash2, 
    TrendingDown,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    BarChart3
} from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { cn } from '../../../lib/utils';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '../../../components/ui/Table';

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
    const [loading, setLoading] = useState(true);

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get(`/reports/monthly?month=${month}&year=${year}`);
            setReportData(res.data);
        } catch (error) {
            console.warn('Error fetching report:', error);
        } finally {
            setLoading(false);
        }
    }, [month, year]);

    useEffect(() => {
        fetchReport();
    }, [month, year, fetchReport]);

    const totalSales = reportData.reduce((acc, curr) => acc + (curr.total_sales || 0), 0);
    const totalPurchases = reportData.reduce((acc, curr) => acc + (curr.total_purchases || 0), 0);
    const totalExpenses = reportData.reduce((acc, curr) => acc + (curr.total_expenses || 0), 0);
    const totalWaste = reportData.reduce((acc, curr) => acc + (curr.total_waste || 0), 0);
    const netProfit = totalSales - totalPurchases - totalExpenses - totalWaste;

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
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-heading">Monthly Performance</h1>
                    <p className="text-slate-500 font-medium whitespace-nowrap">Macro financial overview and aggregated period metrics.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto p-2 bg-white/70 backdrop-blur-md rounded-2xl shadow-premium border border-slate-100">
                    <div className="flex items-center px-4 bg-slate-50/50 rounded-xl border border-slate-100/50">
                        <Calendar className="w-4 h-4 text-slate-400 mr-2" />
                        <select
                            value={month}
                            onChange={(e) => setMonth(Number.parseInt(e.target.value, 10))}
                            className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none w-28 py-2 cursor-pointer"
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                <option key={m} value={m}>
                                    {new Date(0, m - 1).toLocaleString('default', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center px-4 bg-slate-50/50 rounded-xl border border-slate-100/50">
                        <select
                            value={year}
                            onChange={(e) => setYear(Number.parseInt(e.target.value, 10))}
                            className="bg-transparent border-none text-sm font-bold text-slate-700 outline-none w-20 py-2 cursor-pointer"
                        >
                            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-32 flex-col gap-4 bg-white/50 rounded-3xl border border-slate-100 backdrop-blur-sm">
                    <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">Aggregating Monthly Data...</span>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="Gross Revenue"
                            value={totalSales}
                            icon={TrendingUp}
                            type="positive"
                            delay={0}
                        />
                        <StatCard
                            title="Total Investments"
                            value={totalPurchases}
                            icon={ShoppingCart}
                            type="neutral"
                            delay={100}
                        />
                        <StatCard
                            title="Operating Costs"
                            value={totalExpenses}
                            icon={DollarSign}
                            type="negative"
                            delay={200}
                        />
                        <StatCard
                            title="Asset Shrinkage"
                            value={totalWaste}
                            icon={Trash2}
                            type="negative"
                            delay={300}
                        />
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                        <div className="xl:col-span-1">
                            <Card className="h-full border-none shadow-premium relative overflow-hidden flex flex-col justify-center bg-white">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                                
                                <CardContent className="p-8 relative z-10 flex flex-col items-center text-center">
                                    <div className={cn(
                                        "p-4 rounded-3xl mb-6 ring-1",
                                        netProfit > 0 ? "bg-emerald-50 text-emerald-600 ring-emerald-100" : 
                                        netProfit < 0 ? "bg-rose-50 text-rose-600 ring-rose-100" : 
                                        "bg-blue-50 text-blue-600 ring-blue-100"
                                    )}>
                                        {netProfit > 0 ? <TrendingUp className="w-8 h-8" /> : 
                                         netProfit < 0 ? <TrendingDown className="w-8 h-8" /> : 
                                         <DollarSign className="w-8 h-8" />}
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Net Monthly Position</p>
                                    <h2 className={cn(
                                        "text-4xl font-black tracking-tighter mb-4",
                                        netProfit > 0 ? "text-emerald-600" : 
                                        netProfit < 0 ? "text-rose-600" : 
                                        "text-blue-600"
                                    )}>
                                        ₹{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </h2>
                                    
                                    <div className={cn(
                                        "px-5 py-2 rounded-full text-[11px] font-black tracking-widest border shadow-sm transition-all duration-300",
                                        netProfit > 0 ? "bg-[#DCFCE7] text-[#166534] border-[#86EFAC] shadow-emerald-100" :
                                        netProfit < 0 ? "bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5] shadow-rose-100" :
                                        "bg-[#E0F2FE] text-[#1D4ED8] border-[#93C5FD] shadow-blue-100"
                                    )}>
                                        {netProfit > 0 ? 'PROFITABLE PERIOD' : 
                                         netProfit < 0 ? 'OPERATING AT LOSS' : 
                                         'BREAK EVEN PERIOD'}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="xl:col-span-3">
                            <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden h-full flex flex-col">
                                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                                    <h2 className="text-xl font-extrabold text-slate-900 font-heading">Monthly Trajectory</h2>
                                    <div className="px-3 py-1 rounded-full bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Historical Data
                                    </div>
                                </div>
                                <div className="flex-1 overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead>Period</TableHead>
                                                <TableHead className="text-right">Sales Revenue</TableHead>
                                                <TableHead className="text-right">Procurement</TableHead>
                                                <TableHead className="text-right">Expenditure</TableHead>
                                                <TableHead className="text-right">Loss/Shrinkage</TableHead>
                                                <TableHead className="text-right">Net Income</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {reportData.map((row, index) => (
                                                <TableRow key={index} className="group">
                                                    <TableCell className="font-bold text-slate-900">
                                                        {new Date(row.month).toLocaleDateString('default', { month: 'short', year: 'numeric' }).toUpperCase()}
                                                    </TableCell>
                                                    <TableCell className="text-right font-black text-emerald-600">
                                                        ₹{row.total_sales?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-blue-600">
                                                        ₹{row.total_purchases?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-rose-600">
                                                        ₹{row.total_expenses?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold text-amber-600">
                                                        ₹{row.total_waste?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <span className={cn(
                                                            "font-black text-lg",
                                                            (row.profit || 0) >= 0 ? "text-emerald-600" : "text-rose-600"
                                                        )}>
                                                            ₹{row.profit?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {reportData.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="py-20 text-center">
                                                        <div className="flex flex-col items-center gap-4">
                                                            <div className="p-4 rounded-full bg-slate-50 text-slate-200">
                                                                <BarChart3 className="w-8 h-8" />
                                                            </div>
                                                            <span className="text-slate-400 font-bold">No aggregated data for the selected period.</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
