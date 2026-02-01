'use client';

import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Trash2, Edit2, Search, Filter, Camera, X, ArrowLeft, ArrowRight, PlusCircle, MinusCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Tooltip from '../../components/ui/Tooltip';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

// ... (Keep existing schema definitions)
const productSchema = z.object({
    name: z.string().min(1, 'Product name is required'),
    unit: z.string().min(1, 'Unit is required'),
    price: z.coerce.number().min(0.01, 'Selling price must be greater than 0'),
    cost_price: z.coerce.number().min(0.01, 'Cost price must be greater than 0'),
    type: z.enum(['feed', 'medicine', 'supplement', 'other']),
    expiry_date: z.string().optional(),
    track_expiry: z.boolean().optional(),
    low_stock_threshold: z.number().optional()
}).refine((data) => {
    if (data.track_expiry && !data.expiry_date) {
        return false;
    }
    return true;
}, {
    message: "Expiry date is required when tracking expiry",
    path: ["expiry_date"]
});

type ProductFormData = z.infer<typeof productSchema>;

const stockUpdateSchema = z.object({
    quantity: z.coerce.number().min(0.01, 'Quantity must be greater than 0'),
    notes: z.string().optional(),
    image: z.any().optional()
});

type StockUpdateFormData = z.infer<typeof stockUpdateSchema>;

export default function ProductsPage() {
    // ... (Keep existing state)
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const ITEMS_PER_PAGE = 50;

    // Editing State
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);

    // Stock Update State
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [stockAction, setStockAction] = useState<'in' | 'out'>('in');

    // Camera/Image State
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [analyzing, setAnalyzing] = useState(false);

    // Delete Confirmation State
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Form Hooks
    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<ProductFormData>({
        resolver: zodResolver(productSchema) as any,
        defaultValues: {
            track_expiry: false,
            type: 'other'
        }
    });

    const {
        register: registerStock,
        handleSubmit: handleSubmitStock,
        reset: resetStock,
        setValue: setStockValue,
        formState: { errors: stockErrors, isSubmitting: isStockSubmitting }
    } = useForm<StockUpdateFormData>({
        resolver: zodResolver(stockUpdateSchema) as any
    });

    const trackExpiry = watch('track_expiry');

    useEffect(() => {
        fetchProducts(currentPage);
    }, [currentPage, searchQuery, typeFilter]);

    // ... (Keep existing fetch/handler functions)
    const fetchProducts = async (page = 1) => {
        try {
            setLoading(true);
            let url = `/products?page=${page}&limit=${ITEMS_PER_PAGE}`;
            if (searchQuery) url += `&search=${searchQuery}`;
            if (typeFilter !== 'all') url += `&type=${typeFilter}`;

            const res = await api.get(url);
            if (res.data.data) {
                setProducts(res.data.data);
                setTotalPages(res.data.totalPages);
                setTotalItems(res.data.count);
            } else {
                setProducts(res.data);
            }
        } catch (err) {
            setError('Failed to load products');
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: ProductFormData) => {
        try {
            const payload = {
                ...data,
                expiry_date: data.track_expiry ? data.expiry_date : null
            };

            if (isEditing && editId) {
                await api.put(`/products/${editId}`, payload);
                toast.success('Product updated successfully');
            } else {
                await api.post('/products', payload);
                toast.success('Product created successfully');
            }

            reset({
                name: '',
                unit: '',
                price: 0,
                type: 'other',
                track_expiry: false,
                expiry_date: ''
            });
            setIsEditing(false);
            setEditId(null);
            fetchProducts(currentPage);
        } catch (error) {
            console.error('Error saving product:', error);
            toast.error('Failed to save product');
        }
    };

    const handleEdit = (product: any) => {
        setIsEditing(true);
        setEditId(product.id);
        reset({
            name: product.name,
            unit: product.unit,
            price: product.price,
            cost_price: product.cost_price || 0,
            type: product.type || 'other',
            track_expiry: product.track_expiry || false,
            expiry_date: product.expiry_date ? product.expiry_date.split('T')[0] : ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDeleteClick = (id: number) => {
        setDeleteId(id);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/products/${deleteId}`);
            toast.success('Product deleted successfully');
            fetchProducts(currentPage);
        } catch (error) {
            console.error('Error deleting product:', error);
            toast.error('Failed to delete product');
        } finally {
            setIsDeleteDialogOpen(false);
            setDeleteId(null);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        reset({
            name: '',
            unit: '',
            price: 0,
            type: 'other',
            track_expiry: false,
            expiry_date: ''
        });
    };

    const openStockModal = (product: any, action: 'in' | 'out') => {
        setSelectedProduct(product);
        setStockAction(action);
        setIsStockModalOpen(true);
        resetStock();
        setCapturedImage(null);
    };

    const onStockSubmit = async (data: StockUpdateFormData) => {
        // ... (Keep existing stock submit logic)
        try {
            const endpoint = stockAction === 'in' ? '/products/stock/in' : '/products/stock/out';

            // Create FormData object to handle file upload
            const formData = new FormData();
            formData.append('product_id', String(selectedProduct.id));
            formData.append('quantity', String(data.quantity));
            formData.append('notes', data.notes || '');

            // Handle image upload - prioritizing captured image blob if available
            if (capturedImage) {
                // Convert base64 to blob
                const fetchRes = await fetch(capturedImage);
                const blob = await fetchRes.blob();
                formData.append('image', blob, 'capture.jpg');
            } else if (data.image && data.image[0]) {
                formData.append('image', data.image[0]);
            }

            await api.post(endpoint, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            toast.success(`Stock ${stockAction === 'in' ? 'added' : 'removed'} successfully`);
            setIsStockModalOpen(false);
            fetchProducts(currentPage);
        } catch (error) {
            console.error('Error updating stock:', error);
            toast.error('Failed to update stock');
        }
    };

    // Camera Handlers (Keep existing)
    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setStream(mediaStream);
            setIsCameraOpen(true);
        } catch (err) {
            console.error("Error accessing camera:", err);
            toast.error("Could not access camera");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        const video = document.getElementById('camera-preview') as HTMLVideoElement;
        const canvas = document.createElement('canvas');
        if (video) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d')?.drawImage(video, 0, 0);
            const imageUrl = canvas.toDataURL('image/jpeg');
            setCapturedImage(imageUrl);
            stopCamera();
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCapturedImage(reader.result as string);
                setStockValue('image', e.target.files);
            };
            reader.readAsDataURL(file);
        }
    };


    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900" tabIndex={0}>Products Inventory</h1>
                <div className="flex gap-2 w-full md:w-auto">
                    {/* Placeholder for future action buttons */}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</CardTitle>
                            <CardDescription>
                                {isEditing ? 'Update product details below.' : 'Create a new product to track in inventory.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <Input
                                    label="Product Name"
                                    type="text"
                                    {...register('name')}
                                    error={errors.name}
                                    placeholder="e.g., Milk 1L Packet"
                                    autoFocus
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Unit"
                                        type="text"
                                        placeholder="e.g., L, kg, pkt"
                                        {...register('unit')}
                                        error={errors.unit}
                                    />
                                    <div>
                                        <div className="flex items-center mb-1">
                                            <label htmlFor="cost_price" className="block text-sm font-medium text-gray-700 mr-2">Cost Price</label>
                                            <Tooltip content="The price you pay to acquire this product. Used for profit calculations." />
                                        </div>
                                        <Input
                                            id="cost_price" // Add id for accessibility with custom label
                                            label="" // Empty label since we rendered custom one above
                                            type="number"
                                            step="0.01"
                                            {...register('cost_price', { valueAsNumber: true })}
                                            error={errors.cost_price}
                                            placeholder="0.00"
                                            startAdornment={<span className="text-gray-500 font-medium">₹</span>}
                                        />
                                    </div>
                                    <Input
                                        label="Selling Price"
                                        type="number"
                                        step="0.01"
                                        {...register('price', { valueAsNumber: true })}
                                        error={errors.price}
                                        placeholder="0.00"
                                        startAdornment={<span className="text-gray-500 font-medium">₹</span>}
                                    />
                                    <div>
                                        <div className="flex items-center mb-1">
                                            <label htmlFor="low_stock_threshold" className="block text-sm font-medium text-gray-700 mr-2">Low Stock Threshold</label>
                                            <Tooltip content="Receive alerts when stock quantity falls below this number." />
                                        </div>
                                        <Input
                                            id="low_stock_threshold"
                                            label=""
                                            type="number"
                                            step="1"
                                            {...register('low_stock_threshold', { valueAsNumber: true })}
                                            error={errors.low_stock_threshold}
                                            placeholder="10"
                                        />
                                    </div>
                                </div>

                                <Select
                                    label="Category"
                                    {...register('type')}
                                    error={errors.type}
                                    options={[
                                        { value: 'feed', label: 'Feed' },
                                        { value: 'medicine', label: 'Medicine' },
                                        { value: 'supplement', label: 'Supplement' },
                                        { value: 'other', label: 'Other/Consumable' }
                                    ]}
                                />

                                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="track_expiry"
                                            {...register('track_expiry')}
                                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                        />
                                        <label htmlFor="track_expiry" className="text-sm font-medium leading-none cursor-pointer">
                                            Track Expiry Date?
                                        </label>
                                    </div>

                                    {trackExpiry && (
                                        <Input
                                            label="Expiry Date"
                                            type="date"
                                            {...register('expiry_date')}
                                            error={errors.expiry_date}
                                        />
                                    )}
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        type="submit"
                                        className="flex-1 bg-sky-500 hover:bg-sky-600"
                                        disabled={isSubmitting}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        {isEditing ? 'Update Product' : 'Create Product'}
                                    </Button>
                                    {isEditing && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={handleCancelEdit}
                                        >
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* List Section */}
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <CardTitle>Product List</CardTitle>
                                <div className="flex items-center gap-2 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Search products..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                    <select
                                        value={typeFilter}
                                        onChange={(e) => setTypeFilter(e.target.value)}
                                        className="border p-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="all">All Types</option>
                                        <option value="feed">Feed</option>
                                        <option value="medicine">Medicine</option>
                                        <option value="supplement">Supplement</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="p-8 text-center text-muted-foreground">Loading products...</div>
                            ) : error ? (
                                <div className="p-8 text-center text-destructive">{error}</div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Mobile View: Card Stack */}
                                    <div className="md:hidden divide-y divide-gray-100">
                                        {products.map((product) => (
                                            <div key={product.id} className="p-4 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900 text-lg">{product.name}</h3>
                                                        <div className="flex gap-2 mt-1">
                                                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{product.unit}</span>
                                                            <Badge variant="secondary" className="capitalize text-[10px] h-5">
                                                                {product.type}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-primary"
                                                            onClick={() => handleEdit(product)}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-destructive"
                                                            onClick={() => handleDeleteClick(product.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg">
                                                    <div>
                                                        <p className="text-xs text-gray-500 uppercase font-semibold">Stock</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className={cn(
                                                                "text-lg font-bold",
                                                                Number(product.stock_quantity) < 10 ? "text-destructive" : "text-emerald-600"
                                                            )}>
                                                                {product.stock_quantity}
                                                            </span>
                                                            <div className="flex gap-1">
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="h-6 w-6"
                                                                    onClick={() => openStockModal(product, 'in')}
                                                                >
                                                                    <PlusCircle className="w-4 h-4 text-emerald-600" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="h-6 w-6"
                                                                    onClick={() => openStockModal(product, 'out')}
                                                                >
                                                                    <MinusCircle className="w-4 h-4 text-amber-600" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 uppercase font-semibold">Price</p>
                                                        <p className="text-lg font-bold text-gray-900 mt-1">₹{product.price}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Desktop View: Table */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Name</TableHead>
                                                    <TableHead>Category</TableHead>
                                                    <TableHead>Stock</TableHead>
                                                    <TableHead>Price</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {products.map((product) => (
                                                    <TableRow key={product.id}>
                                                        <TableCell className="font-medium">
                                                            <div>{product.name}</div>
                                                            <div className="text-xs text-muted-foreground">{product.unit}</div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary" className="capitalize">
                                                                {product.type}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn(
                                                                    "font-bold",
                                                                    Number(product.stock_quantity) < 10 ? "text-destructive" : "text-emerald-600"
                                                                )}>
                                                                    {product.stock_quantity}
                                                                </span>
                                                                <div className="flex gap-1">
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-6 w-6 text-emerald-600"
                                                                        onClick={() => openStockModal(product, 'in')}
                                                                        title="Stock In"
                                                                        aria-label={`Stock In for ${product.name}`}
                                                                    >
                                                                        <PlusCircle className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-6 w-6 text-amber-600"
                                                                        onClick={() => openStockModal(product, 'out')}
                                                                        title="Stock Out"
                                                                        aria-label={`Stock Out for ${product.name}`}
                                                                    >
                                                                        <MinusCircle className="w-4 h-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>₹{product.price}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-primary"
                                                                onClick={() => handleEdit(product)}
                                                                aria-label={`Edit ${product.name}`}
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive"
                                                                onClick={() => handleDeleteClick(product.id)}
                                                                aria-label={`Delete ${product.name}`}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {products.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                            No products found.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
                            <span className="text-sm text-muted-foreground">
                                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems} entries
                            </span>
                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="flex items-center px-4 font-medium text-sm border rounded-md bg-muted/50">
                                    {currentPage} / {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Stock Modal - Using Standard Modal (requires refactor of Modal component too, but using current for now) */}
            <Modal
                isOpen={isStockModalOpen}
                onClose={() => setIsStockModalOpen(false)}
                title={`Stock ${stockAction === 'in' ? 'In' : 'Out'} - ${selectedProduct?.name}`}
            >
                <form onSubmit={handleSubmitStock(onStockSubmit)} className="space-y-4">
                    <Input
                        label="Quantity"
                        type="number"
                        step="0.01"
                        {...registerStock('quantity')}
                        error={stockErrors.quantity}
                        autoFocus
                    />

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Notes (Optional)</label>
                        <textarea
                            {...registerStock('notes')}
                            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            placeholder="Reason for stock update..."
                        />
                    </div>

                    {/* Camera/Image Section (Simplified styles) */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Capture or Upload Image</label>

                        {!isCameraOpen && !capturedImage && (
                            <div className="flex flex-col gap-2">
                                <Button type="button" variant="outline" onClick={startCamera} className="w-full">
                                    <Camera className="w-4 h-4 mr-2" />
                                    Open Camera
                                </Button>
                                <div className="text-center text-xs text-muted-foreground">- OR -</div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleFileUpload}
                                    className="block w-full text-sm text-slate-500
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-violet-50 file:text-violet-700
                                        hover:file:bg-violet-100"
                                />
                            </div>
                        )}

                        {isCameraOpen && (
                            <div className="relative rounded-lg overflow-hidden bg-black">
                                <video id="camera-preview" autoPlay playsInline className="w-full h-64 object-cover" ref={video => {
                                    if (video && stream) video.srcObject = stream;
                                }} />
                                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                                    <Button type="button" onClick={capturePhoto} variant="default">Capture</Button>
                                    <Button type="button" onClick={stopCamera} variant="destructive">Cancel</Button>
                                </div>
                            </div>
                        )}

                        {capturedImage && (
                            <div className="relative mt-2">
                                <img src={capturedImage} alt="Captured" className="w-full h-48 object-cover rounded-md border" />
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="destructive"
                                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                                    onClick={() => {
                                        setCapturedImage(null);
                                        setStockValue('image', undefined);
                                    }}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => setIsStockModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isStockSubmitting}>
                            {isStockSubmitting ? 'Saving...' : 'Save Update'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Product"
                description="Are you sure you want to delete this product? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
