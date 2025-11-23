'use client';

import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

export default function WastePage() {
    const [products, setProducts] = useState<any[]>([]);
    const [wasteRecords, setWasteRecords] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [formData, setFormData] = useState({
        product_id: '',
        quantity: '',
        reason: 'expired',
        cost_value: '',
        waste_date: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchProducts();
        fetchWasteRecords();
        fetchSummary();
    }, []);

    useEffect(() => {
        // Auto-calculate cost value when product and quantity change
        if (formData.product_id && formData.quantity) {
            const product = products.find(p => p.id === parseInt(formData.product_id));
            if (product) {
                const costValue = parseFloat(formData.quantity) * parseFloat(product.cost_price);
                setFormData(prev => ({ ...prev, cost_value: costValue.toFixed(2) }));
            }
        }
    }, [formData.product_id, formData.quantity, products]);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products');
            setProducts(res.data);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchWasteRecords = async () => {
        try {
            const res = await api.get('/waste');
            setWasteRecords(res.data);
        } catch (error) {
            console.error('Error fetching waste records:', error);
        }
    };

    const fetchSummary = async () => {
        try {
            const res = await api.get('/waste/summary');
            setSummary(res.data);
        } catch (error) {
            console.error('Error fetching summary:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/waste', formData);
            setMessage('Waste record created successfully!');
            setFormData({
                product_id: '',
                quantity: '',
                reason: 'expired',
                cost_value: '',
                waste_date: new Date().toISOString().split('T')[0],
                notes: ''
            });
            fetchWasteRecords();
            fetchSummary();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error recording waste:', error);
            setMessage('Error recording waste');
        }
    };

    const getReasonBadge = (reason: string) => {
        const colors: any = {
            expired: 'bg-red-100 text-red-700',
            damaged: 'bg-orange-100 text-orange-700',
            other: 'bg-gray-100 text-gray-700'
        };
        return colors[reason] || colors.other;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Waste Management</h1>
                <p className="text-gray-500 mt-1">Track spoiled, expired, or damaged items</p>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-red-500 to-red-700 p-6 rounded-xl shadow-lg text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-red-100 text-sm font-medium mb-1">Total Waste Value</p>
                                <h3 className="text-3xl font-bold">₹{summary.total_waste_value?.toFixed(2)}</h3>
                            </div>
                            <div className="p-3 rounded-lg bg-white/20 backdrop-blur-sm">
                                <Trash2 className="w-8 h-8 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-600 mb-3">Waste by Reason</h3>
                        <div className="space-y-2">
                            {summary.waste_by_reason && Object.entries(summary.waste_by_reason).map(([reason, value]: any) => (
                                <div key={reason} className="flex justify-between items-center">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getReasonBadge(reason)}`}>
                                        {reason.charAt(0).toUpperCase() + reason.slice(1)}
                                    </span>
                                    <span className="font-semibold text-gray-900">₹{value.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-600 mb-3">Recent Records</h3>
                        <div className="text-center">
                            <p className="text-4xl font-bold text-gray-900">{wasteRecords.length}</p>
                            <p className="text-sm text-gray-500">Total records</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Waste Entry Form */}
            <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl">
                <h2 className="text-xl font-bold mb-4 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 text-red-600" />
                    Record Waste/Loss
                </h2>
                {message && (
                    <div className={`p-4 mb-4 rounded ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {message}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Product</label>
                        <select
                            value={formData.product_id}
                            onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                            className="w-full mt-1 border p-2 rounded"
                            required
                        >
                            <option value="">Select Product</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} (Cost: ₹{p.cost_price}/{p.unit})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Quantity</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                className="w-full mt-1 border p-2 rounded"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Reason</label>
                            <select
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                className="w-full mt-1 border p-2 rounded"
                                required
                            >
                                <option value="expired">Expired</option>
                                <option value="damaged">Damaged</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Cost Value</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.cost_value}
                                onChange={(e) => setFormData({ ...formData, cost_value: e.target.value })}
                                className="w-full mt-1 border p-2 rounded bg-gray-50"
                                required
                                readOnly
                            />
                            <p className="text-xs text-gray-500 mt-1">Auto-calculated from product cost</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Date</label>
                            <input
                                type="date"
                                value={formData.waste_date}
                                onChange={(e) => setFormData({ ...formData, waste_date: e.target.value })}
                                className="w-full mt-1 border p-2 rounded"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full mt-1 border p-2 rounded"
                            rows={3}
                            placeholder="Additional details about the waste..."
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center justify-center transition-all transform hover:scale-105"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Record Waste
                    </button>
                </form>
            </div>

            {/* Waste Records Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Waste Records</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Value</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {wasteRecords.map((record) => (
                                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(record.waste_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {record.products?.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {record.quantity} {record.products?.unit}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getReasonBadge(record.reason)}`}>
                                            {record.reason.charAt(0).toUpperCase() + record.reason.slice(1)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                                        ₹{record.cost_value?.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {record.notes || '-'}
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
