'use client';

import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Calendar, Trash2, Edit2 } from 'lucide-react';

export default function PurchasesPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        product_id: '',
        quantity: '',
        purchase_date: new Date().toISOString().split('T')[0],
        expiry_date: ''
    });
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [message, setMessage] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchProducts();
        fetchPurchases();
    }, [dateRange]);

    useEffect(() => {
        // Auto-calculate expiry date if product has expiry tracking
        if (selectedProduct?.track_expiry && selectedProduct?.expiry_days && formData.purchase_date) {
            const purchaseDate = new Date(formData.purchase_date);
            const expiryDate = new Date(purchaseDate);
            expiryDate.setDate(expiryDate.getDate() + parseInt(selectedProduct.expiry_days));
            setFormData(prev => ({
                ...prev,
                expiry_date: expiryDate.toISOString().split('T')[0]
            }));
        } else if (!selectedProduct?.track_expiry) {
            setFormData(prev => ({ ...prev, expiry_date: '' }));
        }
    }, [selectedProduct, formData.purchase_date]);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products');
            setProducts(res.data);
        } catch (error) {
            console.error('Error fetching products:', error);
        }
    };

    const fetchPurchases = async () => {
        try {
            const res = await api.get(`/purchases?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
            setPurchases(res.data);
        } catch (error) {
            console.error('Error fetching purchases:', error);
        }
    };

    const handleProductChange = (productId: string) => {
        const product = products.find(p => p.id === parseInt(productId));
        setSelectedProduct(product);
        setFormData({ ...formData, product_id: productId });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing && editId) {
                await api.put(`/purchases/${editId}`, formData);
                setMessage('Purchase updated successfully!');
            } else {
                await api.post('/purchases', formData);
                setMessage('Purchase recorded successfully!');
            }

            setFormData({
                product_id: '',
                quantity: '',
                purchase_date: new Date().toISOString().split('T')[0],
                expiry_date: ''
            });
            setSelectedProduct(null);
            setIsEditing(false);
            setEditId(null);
            fetchPurchases();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error recording purchase:', error);
            setMessage('Error recording purchase');
        }
    };

    const handleEdit = (purchase: any) => {
        const product = products.find(p => p.id === purchase.product_id);
        setSelectedProduct(product);
        setFormData({
            product_id: purchase.product_id,
            quantity: purchase.quantity,
            purchase_date: purchase.purchase_date,
            expiry_date: purchase.expiry_date || ''
        });
        setIsEditing(true);
        setEditId(purchase.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this purchase record?')) {
            try {
                await api.delete(`/purchases/${id}`);
                fetchPurchases();
            } catch (error) {
                console.error('Error deleting purchase:', error);
                alert('Failed to delete purchase record');
            }
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        setSelectedProduct(null);
        setFormData({
            product_id: '',
            quantity: '',
            purchase_date: new Date().toISOString().split('T')[0],
            expiry_date: ''
        });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900">Purchases</h1>

            <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl transform transition-all duration-300 hover:shadow-lg">
                <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Purchase' : 'Record New Purchase'}</h2>
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
                                    {p.name} ({p.unit}) {p.track_expiry ? '🕐' : ''}
                                </option>
                            ))}
                        </select>
                        {selectedProduct?.track_expiry && (
                            <p className="text-xs text-blue-600 mt-1">
                                ℹ️ This product has expiry tracking enabled ({selectedProduct.expiry_days} days shelf life)
                            </p>
                        )}
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
                            <label className="block text-sm font-medium text-gray-700">Purchase Date</label>
                            <input
                                type="date"
                                value={formData.purchase_date}
                                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                                className="w-full mt-1 border p-2 rounded"
                                required
                            />
                        </div>
                    </div>



                    {selectedProduct?.track_expiry && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                                <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                                Expiry Date
                            </label>
                            <input
                                type="date"
                                value={formData.expiry_date}
                                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                                className="w-full border p-2 rounded"
                                min={formData.purchase_date}
                            />
                            <p className="text-xs text-gray-600 mt-2">
                                Auto-calculated based on {selectedProduct.expiry_days} days shelf life. You can adjust if needed.
                            </p>
                        </div>
                    )}



                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center justify-center transition-all transform hover:scale-105"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {isEditing ? 'Update Purchase' : 'Record Purchase'}
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
                    <h2 className="text-xl font-bold">Recent Purchases</h2>
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {purchases.map((purchase) => (
                                <tr key={purchase.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(purchase.purchase_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {purchase.products?.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {purchase.quantity} {purchase.products?.unit}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ₹{purchase.price}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                                        ₹{(purchase.quantity * purchase.price).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {purchase.expiry_date ? new Date(purchase.expiry_date).toLocaleDateString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(purchase)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(purchase.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {purchases.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                                        No purchases recorded yet
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
