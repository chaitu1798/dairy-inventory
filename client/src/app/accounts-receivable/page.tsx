'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { 
    DollarSign, 
    AlertCircle, 
    CheckCircle, 
    WalletCards,
    ArrowRight,
    Search,
    IndianRupee,
    CreditCard
} from 'lucide-react';
import { Sale } from '../../types';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '../../components/ui/Table';
import Modal from '../../components/ui/Modal';
import { cn } from '../../lib/utils';

export default function AccountsReceivablePage() {
    const [stats, setStats] = useState({
        totalReceivable: 0,
        overdueAmount: 0,
        pendingAmount: 0
    });
    const [invoices, setInvoices] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Sale | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            const res = await api.get('/finance/ar/stats');
            setStats(res.data);
        } catch (error) {
            console.warn('Error fetching AR stats:', error);
        }
    }, []);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/sales?limit=1000');

            let allSales = [];
            if (res.data && res.data.data) {
                allSales = res.data.data;
            } else if (Array.isArray(res.data)) {
                allSales = res.data;
            }

            const unpaidInvoices = allSales.filter((s: Sale) => s.status === 'pending' || s.status === 'overdue');
            setInvoices(unpaidInvoices);
        } catch (error) {
            console.warn('Error fetching invoices:', error);
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        fetchInvoices();
    }, [fetchStats, fetchInvoices]);

    const handleRecordPayment = (invoice: Sale) => {
        setSelectedInvoice(invoice);
        setPaymentAmount(((invoice.total || (invoice.quantity * invoice.price)) - (invoice.amount_paid || 0)).toString());
        setPaymentModalOpen(true);
    };

    const submitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInvoice) return;
        setIsSubmitting(true);

        try {
            await api.post('/finance/payments', {
                sale_id: selectedInvoice.id,
                amount: Number.parseFloat(paymentAmount),
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: paymentMethod,
                notes: 'Payment recorded via AR Dashboard'
            });

            setPaymentModalOpen(false);
            setSelectedInvoice(null);
            setPaymentAmount('');
            fetchStats();
            fetchInvoices();
            toast.success('Payment applied successfully');
        } catch (error: unknown) {
            console.warn('Error recording payment:', error);
            const serverMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(serverMessage || 'Failed to apply payment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredInvoices = invoices.filter(inv => {
        const query = searchQuery.toLowerCase();
        const invoiceNum = (inv.invoice_number || `INV-${inv.id}`).toLowerCase();
        const customerName = (inv.customers?.name || 'Walk-in Customer').toLowerCase();
        return invoiceNum.includes(query) || customerName.includes(query);
    });

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-heading">Accounts Receivable</h1>
                    <p className="text-slate-500 font-medium whitespace-nowrap">Manage outstanding balances and collect payments.</p>
                </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <Card isGlass className="border-none shadow-premium relative overflow-hidden bg-white/60">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/20 shadow-sm">
                                <WalletCards className="w-6 h-6" />
                            </div>
                            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Total Owed</Badge>
                        </div>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Receivable</p>
                            <h3 className="text-4xl font-black text-slate-900 tracking-tight">₹{stats.totalReceivable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card isGlass className="border-none shadow-premium relative overflow-hidden bg-white/60">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-500/20 shadow-sm">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50">Critical</Badge>
                        </div>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Overdue Amount</p>
                            <h3 className="text-4xl font-black text-rose-600 tracking-tight">₹{stats.overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        </div>
                    </CardContent>
                </Card>

                <Card isGlass className="border-none shadow-premium relative overflow-hidden bg-white/60">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-500/20 shadow-sm">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Pending</Badge>
                        </div>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1">Current Receivables</p>
                            <h3 className="text-4xl font-black text-amber-600 tracking-tight">₹{stats.pendingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Invoices List */}
            <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <h2 className="text-xl font-extrabold text-slate-900 font-heading">Outstanding Invoices</h2>
                    <div className="relative w-full sm:w-80">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by invoice or client..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                    </div>
                </div>
                
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead>Invoice Reference</TableHead>
                            <TableHead>Client</TableHead>
                            <TableHead className="text-right">Total Billed</TableHead>
                            <TableHead className="text-right">Paid to Date</TableHead>
                            <TableHead className="text-right">Remaining Due</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Collection</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="py-24 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-10 h-10 rounded-full border-4 border-slate-50 border-t-primary animate-spin" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Receivables...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredInvoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="py-20 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="p-5 rounded-full bg-slate-50 text-slate-200">
                                            <CheckCircle className="w-12 h-12 text-emerald-400" />
                                        </div>
                                        <div>
                                            <span className="text-slate-900 font-bold block mb-1">All Clear!</span>
                                            <span className="text-sm font-medium text-slate-500">No outstanding invoices at this time.</span>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredInvoices.map((invoice) => {
                                const total = invoice.total || (invoice.quantity * invoice.price);
                                const paid = invoice.amount_paid || 0;
                                const due = total - paid;

                                return (
                                <TableRow key={invoice.id} className="group">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-slate-900 font-bold">{invoice.invoice_number || `INV-${invoice.id.toString().padStart(4, '0')}`}</span>
                                            <span className="text-[10px] font-bold text-slate-400">{new Date(invoice.sale_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className={cn(
                                            "font-bold",
                                            invoice.customers ? "text-slate-900" : "text-slate-400 italic"
                                        )}>
                                            {invoice.customers?.name || 'Walk-in Client'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className="text-sm font-semibold text-slate-600">
                                            ₹{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className="text-sm font-semibold text-emerald-600">
                                            ₹{paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className={cn(
                                            "text-base font-black",
                                            invoice.status === 'overdue' ? "text-rose-600" : "text-amber-600"
                                        )}>
                                            ₹{due.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={invoice.status === 'overdue' ? 'destructive' : invoice.status === 'paid' ? 'success' : 'warning'} className="uppercase">
                                            {invoice.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            onClick={() => handleRecordPayment(invoice)}
                                            variant="outline"
                                            size="sm"
                                            className="font-bold border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground group-hover:shadow-md transition-all"
                                        >
                                            Collect
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            )})
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Payment Modal */}
            {paymentModalOpen && selectedInvoice && (
                <Modal
                    isOpen={paymentModalOpen}
                    onClose={() => !isSubmitting && setPaymentModalOpen(false)}
                    className="max-w-md rounded-3xl"
                >
                    <div className="p-8">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-4 rounded-3xl bg-blue-50 text-blue-600">
                                <CreditCard className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 leading-tight">Record<br/>Payment</h2>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-medium">Invoice Ref</span>
                                <span className="font-bold text-slate-900">{selectedInvoice.invoice_number || `INV-${selectedInvoice.id}`}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500 font-medium">Client</span>
                                <span className="font-bold text-slate-900">{selectedInvoice.customers?.name || 'Walk-in'}</span>
                            </div>
                            <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between items-center">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Total Due</span>
                                <span className="text-xl font-black text-rose-600">
                                    ₹{((selectedInvoice.total || (selectedInvoice.quantity * selectedInvoice.price)) - (selectedInvoice.amount_paid || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        <form onSubmit={submitPayment} className="space-y-5">
                            <div className="space-y-1.5 group">
                                <label className="text-[13px] font-semibold text-slate-700 ml-1 transition-colors group-focus-within:text-primary">
                                    Amount Collected
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <IndianRupee className="w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-lg font-black text-slate-900 transition-all focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none"
                                        required
                                        max={(selectedInvoice.total || (selectedInvoice.quantity * selectedInvoice.price)) - (selectedInvoice.amount_paid || 0)}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <Select
                                label="Payment Method"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                options={[
                                    { value: 'Cash', label: 'Cash' },
                                    { value: 'UPI', label: 'UPI' },
                                    { value: 'Bank Transfer', label: 'Bank Transfer' },
                                    { value: 'Cheque', label: 'Cheque' }
                                ]}
                                className="bg-white text-base"
                            />

                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="submit"
                                    variant="gradient"
                                    className="flex-1 h-12 rounded-xl font-bold text-base shadow-lg shadow-blue-500/20"
                                    disabled={isSubmitting}
                                >
                                    Apply Payment
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setPaymentModalOpen(false)}
                                    className="h-12 rounded-xl font-bold"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </div>
                </Modal>
            )}
        </div>
    );
}
