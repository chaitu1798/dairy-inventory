'use client';

import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Trash2, Edit2 } from 'lucide-react';

export default function SalesPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [sales, setSales] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        product_id: '',
        quantity: '',
        price: '',
        sale_date: new Date().toISOString().split('T')[0]
    });
    const [message, setMessage] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchProducts();
        fetchSales();
    }, [dateRange]);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products');
            setProducts(res.data);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchSales = async () => {
        try {
            const res = await api.get(`/sales?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
            setSales(res.data);
        } catch (error) {
            console.error('Error fetching sales:', error);
        }
    };

    const handleProductChange = (productId: string) => {
        const product = products.find(p => p.id.toString() === productId);
        setFormData({
            ...formData,
            product_id: productId,
            price: product ? product.selling_price : ''
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing && editId) {
                await api.put(`/sales/${editId}`, formData);
                setMessage('Sale updated successfully!');
            } else {
                await api.post('/sales', formData);
                setMessage('Sale recorded successfully!');
            }

            setFormData({
                product_id: '',
                quantity: '',
                price: '',
                sale_date: new Date().toISOString().split('T')[0]
            });
            setIsEditing(false);
            setEditId(null);
            fetchSales();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error recording sale:', error);
            setMessage('Error recording sale');
        }
    };

    const handleEdit = (sale: any) => {
        setFormData({
            product_id: sale.product_id,
            quantity: sale.quantity,
            price: sale.price,
            sale_date: sale.sale_date
        });
        setIsEditing(true);
        setEditId(sale.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this sale record?')) {
            try {
                await api.delete(`/sales/${id}`);
                fetchSales();
            } catch (error) {
                console.error('Error deleting sale:', error);
                alert('Failed to delete sale record');
            }
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        setFormData({
            product_id: '',
            quantity: '',
            price: '',
            sale_date: new Date().toISOString().split('T')[0]
        });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900">Sales</h1>

            <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl transform transition-all duration-300 hover:shadow-lg">
                <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Sale' : 'Record New Sale'}</h2>
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
                            onChange={(e) => handleProductChange(e.target.value)}
                            className="w-full mt-1 border p-2 rounded"
                            required
                        >
                            <option value="">Select Product</option>
                            {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.unit})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <label className="block text-sm font-medium text-gray-700">Selling Price</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                className="w-full mt-1 border p-2 rounded"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date</label>
                        <input
                            type="date"
                            value={formData.sale_date}
                            onChange={(e) => setFormData({ ...formData, sale_date: e.target.value })}
                            className="w-full mt-1 border p-2 rounded"
                            required
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center justify-center transition-all transform hover:scale-105"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {isEditing ? 'Update Sale' : 'Record Sale'}
                        </button>
                        {isEditing && (
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-all"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 border-b flex flex-col md:flex-row justify-between items-center gap-4">
                    <h2 className="text-xl font-bold">Recent Sales</h2>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                            className="border p-2 rounded text-sm"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                            type="date"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                            className="border p-2 rounded text-sm"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sales.map((sale) => (
                                <tr key={sale.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(sale.sale_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {sale.products?.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {sale.quantity} {sale.products?.unit}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ₹{sale.price}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                                        ₹{(sale.quantity * sale.price).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(sale)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(sale.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {sales.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                                        No sales recorded yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
