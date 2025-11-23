'use client';

import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus } from 'lucide-react';

export default function SalesPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        product_id: '',
        quantity: '',
        price: '',
        sale_date: new Date().toISOString().split('T')[0]
    });
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await api.get('/products');
            setProducts(res.data);
        } catch (error) {
            console.error('Error fetching products:', error);
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
            await api.post('/sales', formData);
            setMessage('Sale recorded successfully!');
            setFormData({
                product_id: '',
                quantity: '',
                price: '',
                sale_date: new Date().toISOString().split('T')[0]
            });
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error recording sale:', error);
            setMessage('Error recording sale');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900">Record Sale</h1>

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
                                    {p.name} ({p.unit})
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

                    <button
                        type="submit"
                        className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center justify-center transition-all transform hover:scale-105"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Record Sale
                    </button>
                </form>
            </div>
        </div>
    );
}
