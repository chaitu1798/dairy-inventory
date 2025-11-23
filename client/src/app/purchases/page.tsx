'use client';

import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Calendar } from 'lucide-react';

export default function PurchasesPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        product_id: '',
        quantity: '',
        price: '',
        purchase_date: new Date().toISOString().split('T')[0],
        expiry_date: ''
    });
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

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

    const handleProductChange = (productId: string) => {
        const product = products.find(p => p.id === parseInt(productId));
        setSelectedProduct(product);
        setFormData({ ...formData, product_id: productId });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/purchases', formData);
            setMessage('Purchase recorded successfully!');
            setFormData({
                product_id: '',
                quantity: '',
                price: '',
                purchase_date: new Date().toISOString().split('T')[0],
                expiry_date: ''
            });
            setSelectedProduct(null);
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error recording purchase:', error);
            setMessage('Error recording purchase');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900">Record Purchase</h1>

            <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl transform transition-all duration-300 hover:shadow-lg">
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
                            <label className="block text-sm font-medium text-gray-700">Price per Unit</label>
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
                        <label className="block text-sm font-medium text-gray-700">Purchase Date</label>
                        <input
                            type="date"
                            value={formData.purchase_date}
                            onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                            className="w-full mt-1 border p-2 rounded"
                            required
                        />
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

                    {formData.quantity && formData.price && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Total Amount</p>
                            <p className="text-2xl font-bold text-gray-900">
                                ₹{(parseFloat(formData.quantity) * parseFloat(formData.price)).toFixed(2)}
                            </p>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center justify-center transition-all transform hover:scale-105"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Record Purchase
                    </button>
                </form>
            </div>
        </div>
    );
}
