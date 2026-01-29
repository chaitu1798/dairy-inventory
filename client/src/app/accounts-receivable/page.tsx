'use client';

import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { DollarSign, Clock, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountsReceivablePage() {
    const [stats, setStats] = useState({
        totalReceivable: 0,
        overdueAmount: 0,
        pendingAmount: 0
    });
    const [invoices, setInvoices] = useState<any[]>([]);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');

    useEffect(() => {
        fetchStats();
        fetchInvoices();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/ar/stats');
            setStats(res.data);
        } catch (error) {
            console.error('Error fetching AR stats:', error);
        }
    };

    const fetchInvoices = async () => {
        try {
            // Fetch sales that are pending or overdue
            // We might need a specific endpoint for this or filter client-side for now
            // Ideally: GET /sales?status=pending,overdue
            // For now, let's just fetch all sales and filter (not efficient for large data but okay for MVP)
            const res = await api.get('/sales?limit=1000');

            let allSales = [];
            if (res.data && res.data.data) {
                allSales = res.data.data;
            } else if (Array.isArray(res.data)) {
                allSales = res.data;
            }

            const unpaidInvoices = allSales.filter((s: any) => s.status === 'pending' || s.status === 'overdue');
            setInvoices(unpaidInvoices);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            setInvoices([]);
        }
    };

    const handleRecordPayment = (invoice: any) => {
        setSelectedInvoice(invoice);
        setPaymentAmount((invoice.total - (invoice.amount_paid || 0)).toString());
        setPaymentModalOpen(true);
    };

    const submitPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedInvoice) return;

        try {
            await api.post('/payments', {
                sale_id: selectedInvoice.id,
                amount: parseFloat(paymentAmount),
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: paymentMethod,
                notes: 'Payment recorded via AR Dashboard'
            });

            setPaymentModalOpen(false);
            setSelectedInvoice(null);
            setPaymentAmount('');
            fetchStats();
            setPaymentAmount('');
            fetchStats();
            fetchInvoices();
            toast.success('Payment recorded successfully!');
        } catch (error) {
            console.error('Error recording payment:', error);
            toast.error('Failed to record payment');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900">Accounts Receivable</h1>

            {/* Stats Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 uppercase font-semibold">Total Receivable</p>
                            <p className="text-2xl font-bold text-gray-900 mt-1">₹{stats.totalReceivable.toFixed(2)}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full">
                            <DollarSign className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 uppercase font-semibold">Overdue Amount</p>
                            <p className="text-2xl font-bold text-red-600 mt-1">₹{stats.overdueAmount.toFixed(2)}</p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-full">
                            <AlertCircle className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 uppercase font-semibold">Pending Amount</p>
                            <p className="text-2xl font-bold text-yellow-600 mt-1">₹{stats.pendingAmount.toFixed(2)}</p>
                        </div>
                        <div className="p-3 bg-yellow-100 rounded-full">
                            <Clock className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold">Outstanding Invoices</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {invoices.map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {invoice.invoice_number || `INV-${invoice.id}`}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(invoice.sale_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {invoice.customers?.name || 'Walk-in Customer'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ₹{invoice.total}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                                        ₹{invoice.amount_paid || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                                        ₹{(invoice.total - (invoice.amount_paid || 0)).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'}`}>
                                            {invoice.status?.toUpperCase() || 'PENDING'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleRecordPayment(invoice)}
                                            className="text-blue-600 hover:text-blue-900 font-semibold"
                                        >
                                            Record Payment
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {invoices.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                                        No outstanding invoices found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payment Modal */}
            {paymentModalOpen && selectedInvoice && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">Record Payment</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Invoice: {selectedInvoice.invoice_number || `INV-${selectedInvoice.id}`}<br />
                            Customer: {selectedInvoice.customers?.name || 'Walk-in'}<br />
                            Total Due: ₹{(selectedInvoice.total - (selectedInvoice.amount_paid || 0)).toFixed(2)}
                        </p>
                        <form onSubmit={submitPayment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Amount</label>
                                <div className="relative mt-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                        className="w-full border p-2 pl-9 rounded"
                                        required
                                        max={selectedInvoice.total - (selectedInvoice.amount_paid || 0)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full mt-1 border p-2 rounded"
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Cheque">Cheque</option>
                                </select>
                            </div>
                            <div className="flex gap-2 justify-end mt-6">
                                <button
                                    type="button"
                                    onClick={() => setPaymentModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Save Payment
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
