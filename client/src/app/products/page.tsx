'use client';

import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Trash2, Edit2 } from 'lucide-react';

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        unit: 'litre',
        selling_price: '',
        cost_price: '',
        min_stock: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing && editId) {
                await api.put(`/products/${editId}`, formData);
            } else {
                await api.post('/products', formData);
            }
            setFormData({
                name: '',
                category: '',
                unit: 'litre',
                selling_price: '',
                cost_price: '',
                min_stock: ''
            });
            setIsEditing(false);
            setEditId(null);
            fetchProducts();
        } catch (error) {
            console.error('Error saving product:', error);
        }
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this product?')) {
            try {
                await api.delete(`/products/${id}`);
                fetchProducts();
            } catch (error) {
                console.error('Error deleting product:', error);
            }
        }
    };

    const handleEdit = (product: any) => {
        setFormData({
            name: product.name,
            category: product.category,
            unit: product.unit,
            selling_price: product.selling_price,
            cost_price: product.cost_price,
            min_stock: product.min_stock
        });
        setIsEditing(true);
        setEditId(product.id);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>

            <div className="bg-white p-6 rounded-lg shadow-md transform transition-all duration-300 hover:shadow-lg">
                <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Product' : 'Add New Product'}</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        placeholder="Product Name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="border p-2 rounded"
                        required
                    />
                    <input
                        type="text"
                        placeholder="Category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="border p-2 rounded"
                    />
                    <select
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="border p-2 rounded"
                    >
                        <option value="litre">Litre</option>
                        <option value="kg">Kg</option>
                        <option value="unit">Unit</option>
                    </select>
                    <input
                        type="number"
                        placeholder="Selling Price"
                        value={formData.selling_price}
                        onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                        className="border p-2 rounded"
                        required
                    />
                    <input
                        type="number"
                        placeholder="Cost Price"
                        value={formData.cost_price}
                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                        className="border p-2 rounded"
                    />
                    <input
                        type="number"
                        placeholder="Min Stock"
                        value={formData.min_stock}
                        onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                        className="border p-2 rounded"
                    />
                    <div className="md:col-span-3">
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center transition-all transform hover:scale-105"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {isEditing ? 'Update Product' : 'Add Product'}
                        </button>
                        {isEditing && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditId(null);
                                    setFormData({
                                        name: '',
                                        category: '',
                                        unit: 'litre',
                                        selling_price: '',
                                        cost_price: '',
                                        min_stock: ''
                                    });
                                }}
                                className="ml-2 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {products.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.unit}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{product.selling_price}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button
                                        onClick={() => handleEdit(product)}
                                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(product.id)}
                                        className="text-red-600 hover:text-red-900"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
