'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { 
    Plus,
    PlusCircle, 
    MinusCircle, 
    Trash2,
    Edit2,
    Search,
    Filter,
    Camera,
    X,
    ChevronLeft, 
    ChevronRight,
    Package,
    LayoutGrid,
    List,
    History as HistoryIcon,
    Clock
} from 'lucide-react';
import { Product } from '../../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

import { CATEGORIES, getCategoryName } from '../../constants/categories';

const productSchema = z.object({
    name: z.string().min(1, 'Product name is required'),
    categoryId: z.string().min(1, 'Category is required'),
    categoryName: z.string().min(1, 'Category name is required'),
    unit: z.string().min(1, 'Unit is required'),
    price: z.coerce.number().min(0.01, 'Selling price must be greater than 0'),
    cost_price: z.coerce.number().min(0.01, 'Cost price must be greater than 0'),
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
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

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
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [stockAction, setStockAction] = useState<'in' | 'out'>('in');

    // Camera/Image State
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(productSchema) as any,
        defaultValues: {
            track_expiry: false,
            categoryId: 'products',
            categoryName: 'General Product'
        }
    });

    const {
        register: registerStock,
        handleSubmit: handleSubmitStock,
        reset: resetStock,
        setValue: setStockValue,
        formState: { errors: stockErrors, isSubmitting: isStockSubmitting }
    } = useForm<StockUpdateFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(stockUpdateSchema) as any
    });

    const trackExpiry = watch('track_expiry');

    const fetchProducts = useCallback(async (page = 1) => {
        try {
            setLoading(true);
            let url = `/products?page=${page}&limit=${ITEMS_PER_PAGE}`;
            if (searchQuery) url += `&search=${searchQuery}`;
            if (categoryFilter !== 'all') url += `&categoryId=${categoryFilter}`;

            const res = await api.get(url);
            if (res.data.data) {
                setProducts(
                    [...res.data.data].sort((a: Product, b: Product) =>
                        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
                    )
                );
                setTotalPages(res.data.totalPages);
                setTotalItems(res.data.count);
            } else {
                setProducts(
                    [...res.data].sort((a: Product, b: Product) =>
                        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
                    )
                );
            }
        } catch (err) {
            setError('Failed to load products');
            toast.error('Failed to load products');
        } finally {
            setLoading(false);
        }
    }, [searchQuery, categoryFilter]);

    useEffect(() => {
        fetchProducts(currentPage);
    }, [currentPage, fetchProducts]);

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
                cost_price: 0,
                categoryId: 'products',
                categoryName: 'General Product',
                track_expiry: false,
                expiry_date: ''
            });
            setIsEditing(false);
            setEditId(null);
            fetchProducts(currentPage);
        } catch (error: unknown) {
            console.warn('Error saving product:', error);
            const serverMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(serverMessage || 'Failed to save product');
        }
    };

    const handleEdit = (product: Product) => {
        setIsEditing(true);
        setEditId(product.id);
        reset({
            name: product.name,
            unit: product.unit,
            price: product.price,
            cost_price: product.cost_price || 0,
            categoryId: product.categoryId || product.category || 'products',
            categoryName: product.categoryName || getCategoryName(product.categoryId || product.category || 'products'),
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
        } catch (error: unknown) {
            console.warn('Error deleting product:', error);
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
            cost_price: 0,
            categoryId: 'products',
            categoryName: 'General Product',
            track_expiry: false,
            expiry_date: ''
        });
    };

    const openStockModal = (product: Product, action: 'in' | 'out') => {
        setSelectedProduct(product);
        setStockAction(action);
        setIsStockModalOpen(true);
        resetStock();
        setCapturedImage(null);
    };

    const onStockSubmit = async (data: StockUpdateFormData) => {
        try {
            const endpoint = stockAction === 'in' ? '/products/stock/in' : '/products/stock/out';
            const formData = new FormData();
            if (!selectedProduct) return;
            formData.append('product_id', String(selectedProduct.id));
            formData.append('quantity', String(data.quantity));
            formData.append('notes', data.notes || '');

            if (capturedImage) {
                const fetchRes = await fetch(capturedImage);
                const blob = await fetchRes.blob();
                formData.append('image', blob, 'capture.jpg');
            } else if (data.image && data.image[0]) {
                formData.append('image', data.image[0]);
            }

            await api.post(endpoint, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            toast.success(`Stock ${stockAction === 'in' ? 'added' : 'removed'} successfully`);
            setIsStockModalOpen(false);
            fetchProducts(currentPage);
        } catch (error: unknown) {
            console.warn('Error updating stock:', error);
            toast.error('Failed to update stock');
        }
    };

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setStream(mediaStream);
            setIsCameraOpen(true);
        } catch (err) {
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1800px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-heading">Inventory Management</h1>
                    <p className="text-slate-500 font-medium whitespace-nowrap">Track dairy supplies, feed, and medications in real-time.</p>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-2xl w-full md:w-auto">
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn("rounded-xl transition-all", viewMode === 'list' ? "bg-white shadow-sm text-primary" : "text-slate-500")}
                        onClick={() => setViewMode('list')}
                    >
                        <List className="w-4 h-4 mr-2" />
                        List
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className={cn("rounded-xl transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-primary" : "text-slate-500")}
                        onClick={() => setViewMode('grid')}
                    >
                        <LayoutGrid className="w-4 h-4 mr-2" />
                        Grid
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Form Section - Sticky Sidebar Style */}
                <div className="lg:col-span-4">
                    <Card className="sticky top-24 border-none shadow-premium bg-white/70 backdrop-blur-xl">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl flex items-center">
                                <PlusCircle className="w-5 h-5 mr-2 text-primary" />
                                {isEditing ? 'Edit Product' : 'Add New Product'}
                            </CardTitle>
                            <CardDescription>
                                {isEditing ? 'Change product details below' : 'Register a new item in your inventory'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                                <Input
                                    label="Product Name"
                                    type="text"
                                    {...register('name')}
                                    error={errors.name}
                                    placeholder="e.g., Organic Cow Feed"
                                    className="bg-white"
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Unit"
                                        type="text"
                                        placeholder="kg, L, bags"
                                        {...register('unit')}
                                        error={errors.unit}
                                        className="bg-white"
                                    />
                                    <Select
                                        label="Category"
                                        {...register('categoryId')}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setValue('categoryId', val);
                                            setValue('categoryName', getCategoryName(val));
                                        }}
                                        error={errors.categoryId}
                                        options={CATEGORIES.map(c => ({ value: c.id, label: c.name }))}
                                        className="bg-white"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Cost Price"
                                        type="number"
                                        step="0.01"
                                        {...register('cost_price', { valueAsNumber: true })}
                                        error={errors.cost_price}
                                        placeholder="0.00"
                                        startAdornment={<span className="text-slate-400 font-bold">₹</span>}
                                        className="bg-white"
                                    />
                                    <Input
                                        label="Sale Price"
                                        type="number"
                                        step="0.01"
                                        {...register('price', { valueAsNumber: true })}
                                        error={errors.price}
                                        placeholder="0.00"
                                        startAdornment={<span className="text-slate-400 font-bold">₹</span>}
                                        className="bg-white"
                                    />
                                </div>

                                <Input
                                    label="Low Stock Threshold"
                                    type="number"
                                    step="1"
                                    {...register('low_stock_threshold', { valueAsNumber: true })}
                                    error={errors.low_stock_threshold}
                                    placeholder="10"
                                    className="bg-white"
                                    helperText="Alert starts below this count"
                                />

                                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
                                    <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setValue('track_expiry', !trackExpiry)}>
                                        <div className={cn(
                                            "w-9 h-5 flex items-center rounded-full p-1 transition-colors duration-200",
                                            trackExpiry ? "bg-primary" : "bg-slate-300"
                                        )}>
                                            <div className={cn(
                                                "bg-white w-3 h-3 rounded-full shadow-sm transition-transform duration-200 transform",
                                                trackExpiry ? "translate-x-4" : "translate-x-0"
                                            )} />
                                        </div>
                                        <label className="text-sm font-bold text-slate-700 cursor-pointer">Track Expiry</label>
                                    </div>

                                    {trackExpiry && (
                                        <Input
                                            label="Expiry Date"
                                            type="date"
                                            {...register('expiry_date')}
                                            error={errors.expiry_date}
                                            className="bg-white"
                                        />
                                    )}
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        type="submit"
                                        variant="gradient"
                                        className="flex-1 h-11 rounded-xl font-bold shadow-lg shadow-blue-500/20"
                                        disabled={isSubmitting}
                                    >
                                        {isEditing ? 'Update Item' : 'Create Product'}
                                    </Button>
                                    {isEditing && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-11 rounded-xl font-bold"
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
                <div className="lg:col-span-8 space-y-6">
                    {/* Filter & Search Bar */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-white/70 backdrop-blur-md rounded-3xl shadow-premium border border-slate-100">
                        <div className="relative w-full md:w-96 group">
                            <Input
                                label=""
                                placeholder="Search products, batches, IDs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                startAdornment={<Search className="w-4 h-4" />}
                                className="h-11 bg-slate-50/50 border-none shadow-none focus:bg-white"
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100/50">
                                <Filter className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-black uppercase tracking-widest text-slate-400">Sort By</span>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                                >
                                    <option value="all">Every Category</option>
                                    {CATEGORIES.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Products Content */}
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-48 rounded-3xl bg-slate-50 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="animate-in fade-in duration-500">
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                    {products.map((product) => (
                                        <Card key={product.id} className="border-none shadow-premium hover:shadow-xl transition-shadow bg-white overflow-hidden group">
                                            <div className="h-2 bg-slate-100 group-hover:bg-primary/20 transition-colors" />
                                            <CardContent className="p-6">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div>
                                                        <Badge variant="secondary" className="mb-2">
                                                            {product.categoryName}
                                                        </Badge>
                                                        <h3 className="text-lg font-extrabold text-slate-900 group-hover:text-primary transition-colors">{product.name}</h3>
                                                        <p className="text-xs font-medium text-slate-400">Unit: {product.unit}</p>
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-primary bg-primary/5" onClick={() => handleEdit(product)}>
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500 bg-rose-50" onClick={() => handleDeleteClick(product.id)}>
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mb-6">
                                                    <div className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">In Stock</span>
                                                        <div className="flex items-center justify-between">
                                                            <span className={cn(
                                                                "text-xl font-black",
                                                                Number(product.stock_quantity) < (product.low_stock_threshold || 10) ? "text-rose-500" : "text-slate-900"
                                                            )}>
                                                                {product.stock_quantity}
                                                            </span>
                                                            <div className="flex gap-1">
                                                                <button onClick={() => openStockModal(product, 'in')} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors">
                                                                    <PlusCircle className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => openStockModal(product, 'out')} className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors">
                                                                    <MinusCircle className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">MSRP</span>
                                                        <span className="text-xl font-black text-slate-900">₹{product.price}</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                                    {product.track_expiry && product.expiry_date ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="w-3 h-3 text-slate-300" />
                                                            <span className="text-[10px] font-bold text-slate-400">{new Date(product.expiry_date).toLocaleDateString()}</span>
                                                        </div>
                                                    ) : <div />}
                                                    <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black uppercase text-slate-400 hover:text-primary">
                                                        <HistoryIcon className="w-3 h-3 mr-1" />
                                                        History
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead>Product</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Stock Level</TableHead>
                                                <TableHead>Value</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {products.map((product) => (
                                                <TableRow key={product.id} className="group">
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">{product.name}</span>
                                                            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">{product.unit}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">{product.categoryName}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-4">
                                                            <span className={cn(
                                                                "font-black text-base",
                                                                Number(product.stock_quantity) < (product.low_stock_threshold || 10) ? "text-rose-500" : "text-slate-900"
                                                            )}>
                                                                {product.stock_quantity}
                                                            </span>
                                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => openStockModal(product, 'in')} className="p-1 px-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center gap-1 text-[10px] font-bold tracking-tight">
                                                                    <Plus className="w-3 h-3" /> IN
                                                                </button>
                                                                <button onClick={() => openStockModal(product, 'out')} className="p-1 px-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center gap-1 text-[10px] font-bold tracking-tight">
                                                                    <MinusCircle className="w-3 h-3" /> OUT
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-extrabold text-slate-900">₹{product.price}</span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-primary/5" onClick={() => handleEdit(product)}>
                                                                <Edit2 className="w-4 h-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteClick(product.id)}>
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                            {products.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-bold">
                                                        No inventory items found.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                    
                                    {/* Pagination Controls */}
                                    {totalPages > 1 && (
                                        <div className="bg-slate-50 border-t border-slate-100 px-8 py-5 flex items-center justify-between">
                                            <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
                                                Page <span className="text-slate-900">{currentPage}</span> of <span className="text-slate-900">{totalPages}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="sm" className="rounded-xl h-9 w-9 p-0 bg-white" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                                    <ChevronLeft className="w-4 h-4" />
                                                </Button>
                                                <Button variant="outline" size="sm" className="rounded-xl h-9 w-9 p-0 bg-white" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                                    <ChevronRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Stock Modal - High-end Treatment */}
            <Modal
                isOpen={isStockModalOpen}
                onClose={() => setIsStockModalOpen(false)}
                className="max-w-lg rounded-3xl"
            >
                <div className="p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className={cn(
                            "p-4 rounded-3xl",
                            stockAction === 'in' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        )}>
                            <HistoryIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">{stockAction === 'in' ? 'Stock Entry' : 'Stock Dispatch'}</h2>
                            <p className="text-sm font-bold text-slate-400">{selectedProduct?.name}</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmitStock(onStockSubmit)} className="space-y-6">
                        <Input
                            label="Quantity to Update"
                            type="number"
                            step="0.01"
                            {...registerStock('quantity')}
                            error={stockErrors.quantity}
                            placeholder="0.00"
                            startAdornment={<span className="text-slate-400 font-bold">{selectedProduct?.unit}</span>}
                            className="h-12 bg-slate-50/50 border-none rounded-2xl"
                            autoFocus
                        />

                        <div className="space-y-2 group">
                            <label className="text-[13px] font-semibold text-slate-700 ml-1 group-focus-within:text-primary">Transaction Note</label>
                            <textarea
                                {...registerStock('notes')}
                                className="w-full min-h-[100px] rounded-2xl border-none bg-slate-50/50 p-4 text-sm focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                                placeholder="Add internal memo about this stock move..."
                            />
                        </div>

                        {/* Inventory Image/Document Capture */}
                        <div className="space-y-2">
                            <label className="text-[13px] font-semibold text-slate-700 ml-1">Attachment (Optional)</label>
                            
                            {!isCameraOpen && !capturedImage && (
                                <div className="grid grid-cols-2 gap-4">
                                    <button type="button" onClick={startCamera} className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group">
                                        <Camera className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary mt-2">Take Photo</span>
                                    </button>
                                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group cursor-pointer">
                                        <Plus className="w-6 h-6 text-slate-400 group-hover:text-primary transition-colors" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary mt-2">Upload File</span>
                                        <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                                    </label>
                                </div>
                            )}

                            {isCameraOpen && (
                                <div className="relative rounded-2xl overflow-hidden bg-slate-900 border-4 border-slate-900 shadow-2xl">
                                    <video id="camera-preview" autoPlay playsInline className="w-full aspect-video object-cover" ref={video => {
                                        if (video && stream) video.srcObject = stream;
                                    }} />
                                    <div className="absolute inset-x-0 bottom-6 flex justify-center gap-3">
                                        <Button type="button" onClick={capturePhoto} variant="gradient" className="rounded-full px-8 shadow-xl">Capture</Button>
                                        <Button type="button" onClick={stopCamera} variant="ghost" className="rounded-full bg-white/20 backdrop-blur-md text-white border-white/20">Exit</Button>
                                    </div>
                                </div>
                            )}

                            {capturedImage && (
                                <div className="relative rounded-2xl overflow-hidden border-2 border-slate-100 group">
                                    <img src={capturedImage} alt="Captured" className="w-full aspect-video object-cover" />
                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button
                                            type="button"
                                            size="icon"
                                            variant="destructive"
                                            className="h-12 w-12 rounded-full shadow-2xl"
                                            onClick={() => {
                                                setCapturedImage(null);
                                                setStockValue('image', undefined);
                                            }}
                                        >
                                            <Trash2 className="w-6 h-6" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button type="button" variant="outline" className="flex-1 h-12 rounded-2xl font-bold" onClick={() => setIsStockModalOpen(false)}>
                                Back
                            </Button>
                            <Button type="submit" variant="gradient" className={cn("flex-1 h-12 rounded-2xl font-bold shadow-xl", stockAction === 'in' ? "shadow-emerald-500/20" : "shadow-amber-500/20")} disabled={isStockSubmitting}>
                                {isStockSubmitting ? 'Journaling...' : `Confirm Stock ${stockAction === 'in' ? 'In' : 'Out'}`}
                            </Button>
                        </div>
                    </form>
                </div>
            </Modal>

            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Decommission Product"
                description="This will permanently remove the item from all active inventory records. Continue?"
                confirmText="Confirm Deletion"
                variant="danger"
            />
        </div>
    );
}
