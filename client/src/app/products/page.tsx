'use client';

import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Trash2, Edit2, AlertTriangle } from 'lucide-react';

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        unit: 'litre',
        selling_price: '',
        cost_price: '',
        min_stock: '',
        track_expiry: false,
        expiry_days: ''
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
                min_stock: '',
                track_expiry: false,
                expiry_days: ''
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
            } catch (error: any) {
                console.error('Error deleting product:', error);
                if (error.response && error.response.status === 400) {
                    alert('Cannot delete this product because it is associated with existing sales or purchases. Please delete the related records first.');
                } else {
                    alert('Failed to delete product. Please try again.');
                }
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
            min_stock: product.min_stock,
            track_expiry: product.track_expiry || false,
            expiry_days: product.expiry_days || ''
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
                        placeholder="Category (e.g., Milk, Curd, Paneer)"
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
                        <option value="packet">Packet</option>
                        <option value="piece">Piece</option>
                        <option value="unit">Unit</option>
                    </select>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="Selling Price"
                        value={formData.selling_price}
                        onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                        className="border p-2 rounded"
                        required
                    />
                    <input
                        type="number"
                        step="0.01"
                        placeholder="Cost Price"
                        value={formData.cost_price}
                        onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                        className="border p-2 rounded"
                    />
                    <input
                        type="number"
                        placeholder="Minimum Stock Level"
                        value={formData.min_stock}
                        onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                        className="border p-2 rounded"
                    />

                    {/* Expiry Tracking Section */}
                    <div className="md:col-span-3 border-t pt-4 mt-2">
                        <div className="flex items-center mb-3">
                            <input
                                type="checkbox"
                                id="track_expiry"
                                checked={formData.track_expiry}
                                onChange={(e) => setFormData({ ...formData, track_expiry: e.target.checked, expiry_days: e.target.checked ? formData.expiry_days : '' })}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="track_expiry" className="ml-2 text-sm font-medium text-gray-700">
                                Track Expiry for this product
                            </label>
                        </div>

                        {formData.track_expiry && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Shelf Life (days)
                                </label>
                                <input
                                    type="number"
                                    placeholder="e.g., 7 for milk, 30 for paneer"
                                    value={formData.expiry_days}
                                    onChange={(e) => setFormData({ ...formData, expiry_days: e.target.value })}
                                    className="border p-2 rounded w-full md:w-1/3"
                                />
                                <p className="text-xs text-gray-600 mt-2">
                                    This will help calculate expiry dates when recording purchases
                                </p>
                            </div>
                        )}
                    </div>

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
                                        min_stock: '',
                                        track_expiry: false,
                                        expiry_days: ''
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Category</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Unit</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Min Stock</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Expiry</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {products.map((product) => (
                            <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {product.name}
                                    <div className="md:hidden text-xs text-gray-500 mt-1">{product.category}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                                    <span className="px-2 py-1 rounded-full bg-gray-100 text-xs">{product.category || 'N/A'}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{product.unit}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{product.selling_price}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                                    <span className="flex items-center">
                                        {product.min_stock > 0 && <AlertTriangle className="w-3 h-3 text-amber-500 mr-1" />}
                                        {product.min_stock}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                                    {product.track_expiry ? (
                                        <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                                            {product.expiry_days} days
                                        </span>
                                    ) : (
                                        <span className="text-gray-400 text-xs">Not tracked</span>
                                    )}
                                </td>
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
