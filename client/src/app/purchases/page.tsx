'use client';

import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { Plus, Calendar, Trash2, Edit2, Camera, X } from 'lucide-react';

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

    // Stock Update State
    const [showStockModal, setShowStockModal] = useState(false);
    const [stockImage, setStockImage] = useState('');
    const [stockAction, setStockAction] = useState<'IN' | 'OUT'>('IN');
    const [stockQuantity, setStockQuantity] = useState('');
    const [selectedProductId, setSelectedProductId] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadImage(file);
        }
    };

    const uploadImage = async (file: File) => {
        const formData = new FormData();
        formData.append('image', file);
        try {
            // 1. Upload Image
            const res = await api.post('/stock/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const imageUrl = res.data.url;
            const filePath = res.data.filePath;

            // 2. Analyze Image with Gemini
            setMessage('Analyzing image...');
            const analyzeRes = await api.post('/stock/analyze', { imageUrl, filePath });
            const { productName, quantity, date } = analyzeRes.data;

            // 3. Pre-fill Form
            setFormData(prev => ({
                ...prev,
                quantity: quantity || prev.quantity,
                purchase_date: date || prev.purchase_date
            }));

            // Try to match product name
            if (productName) {
                const matchedProduct = products.find(p =>
                    p.name.toLowerCase().includes(productName.toLowerCase()) ||
                    productName.toLowerCase().includes(p.name.toLowerCase())
                );
                if (matchedProduct) {
                    setSelectedProduct(matchedProduct);
                    setFormData(prev => ({ ...prev, product_id: matchedProduct.id.toString() }));
                    setMessage(`Matched product: ${matchedProduct.name}`);
                } else {
                    setMessage(`Could not auto-match product: ${productName}`);
                }
            } else {
                setMessage('Analysis complete. Please verify details.');
            }

            // Clear message after delay
            setTimeout(() => setMessage(''), 5000);

        } catch (error) {
            console.error('Upload/Analysis failed', error);
            setMessage('Failed to analyze image');
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleStockUpdate = async () => {
        if (!selectedProductId || !stockQuantity) {
            alert('Please select a product and enter quantity');
            return;
        }
        try {
            await api.post('/stock/update', {
                productId: selectedProductId,
                quantity: stockQuantity,
                actionType: stockAction,
                imageUrl: stockImage
            });
            setShowStockModal(false);
            setStockImage('');
            setStockQuantity('');
            setSelectedProductId('');
            setStockAction('IN');
            fetchPurchases(); // Refresh purchases list
            alert('Stock updated successfully!');
        } catch (error) {
            console.error('Stock update failed', error);
            alert('Failed to update stock');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">Purchases</h1>
                <div>
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleImageCapture}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center transition-all shadow-md"
                    >
                        <Camera className="w-5 h-5 mr-2" />
                        Capture / Upload
                    </button>
                </div>
            </div>

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

            {/* Stock Update Modal */}
            {showStockModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden animate-fade-in">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="text-lg font-bold">Update Stock from Image</h3>
                            <button onClick={() => setShowStockModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {stockImage && (
                                <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden mb-4">
                                    <img src={stockImage} alt="Captured Stock" className="w-full h-full object-contain" />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Product</label>
                                <select
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">-- Choose Product --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                                <div className="flex space-x-4">
                                    <button
                                        onClick={() => setStockAction('IN')}
                                        className={`flex-1 py-2 rounded font-medium ${stockAction === 'IN' ? 'bg-green-100 text-green-800 border-green-300 border' : 'bg-gray-100 text-gray-600'}`}
                                    >
                                        Stock IN (Purchase)
                                    </button>
                                    <button
                                        onClick={() => setStockAction('OUT')}
                                        className={`flex-1 py-2 rounded font-medium ${stockAction === 'OUT' ? 'bg-red-100 text-red-800 border-red-300 border' : 'bg-gray-100 text-gray-600'}`}
                                    >
                                        Stock OUT (Waste/Use)
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={stockQuantity}
                                    onChange={(e) => setStockQuantity(e.target.value)}
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-purple-500"
                                    placeholder="Enter quantity"
                                />
                            </div>

                            <button
                                onClick={handleStockUpdate}
                                className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors mt-4"
                            >
                                Confirm Update
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
