'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../utils/api';
import { 
    Calendar, 
    Trash2, 
    Edit2, 
    ChevronLeft,
    ChevronRight,
    Package,
    Clock,
    FileText,
    ArrowRight,
    PlusCircle,
    ScanLine,
    ShieldCheck
} from 'lucide-react';
import { Product, Purchase } from '../../types';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import { toast } from 'sonner';
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
import { cn } from '../../lib/utils';
import Modal from '../../components/ui/Modal';
import { useFilteredProducts } from '../../hooks/useFilteredProducts';
import { CATEGORIES } from '../../constants/categories';

const purchaseSchema = z.object({
    categoryId: z.string().min(1, 'Category is required'),
    product_id: z.string().min(1, 'Product is required'),
    quantity: z.coerce.number().min(0.01, 'Quantity must be greater than 0'),
    purchase_date: z.string().min(1, 'Purchase date is required'),
    expiry_date: z.string().optional(),
    image_url: z.string().optional()
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

export default function PurchasesPage() {
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const { products: filteredProducts, loading: productsLoading } = useFilteredProducts(selectedCategoryId);
    const [allProducts, setAllProducts] = useState<Product[]>([]); // For existing list display
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const ITEMS_PER_PAGE = 50;

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    // Confirmation Dialog State
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Stock Update State
    const [showStockModal, setShowStockModal] = useState(false);
    const [stockImage, setStockImage] = useState('');
    const [stockAction, setStockAction] = useState<'IN' | 'OUT'>('IN');
    const [stockQuantity, setStockQuantity] = useState('');
    const [selectedProductId, setSelectedProductId] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<PurchaseFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(purchaseSchema) as any,
        defaultValues: {
            purchase_date: new Date().toISOString().split('T')[0],
            expiry_date: '',
            image_url: '',
            categoryId: ''
        }
    });

    const watchedProductId = watch('product_id');
    const watchedPurchaseDate = watch('purchase_date');
    const watchedCategoryId = watch('categoryId');

    const fetchAllProducts = useCallback(async () => {
        try {
            const res = await api.get('/products?limit=1000');
            if (res.data && res.data.data) {
                setAllProducts(res.data.data);
            } else if (Array.isArray(res.data)) {
                setAllProducts(res.data);
            } else {
                setAllProducts([]);
            }
        } catch (error) {
            console.warn('Error fetching products:', error);
            toast.error('Failed to load products list for purchases');
            setAllProducts([]);
        }
    }, []);

    const fetchPurchases = useCallback(async (page = currentPage) => {
        setLoading(true);
        try {
            const res = await api.get(`/purchases?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&page=${page}&limit=${ITEMS_PER_PAGE}`);
            if (res.data.data) {
                setPurchases(res.data.data);
                setTotalPages(res.data.totalPages);
                setTotalItems(res.data.count);
            } else {
                setPurchases(res.data);
            }
        } catch (error) {
            console.warn('Error fetching purchases:', error);
            toast.error('Failed to load purchases');
        } finally {
            setLoading(false);
        }
    }, [dateRange.startDate, dateRange.endDate, currentPage, ITEMS_PER_PAGE]);

    useEffect(() => {
        fetchAllProducts();
    }, [fetchAllProducts]);

    useEffect(() => {
        fetchPurchases(currentPage);
    }, [dateRange, currentPage, fetchPurchases]);

    useEffect(() => {
        if (watchedCategoryId) {
            setSelectedCategoryId(watchedCategoryId);
        }
    }, [watchedCategoryId]);

    useEffect(() => {
        if (watchedProductId) {
            const product = allProducts.find(p => String(p.id) === watchedProductId);
            setSelectedProduct(product || null);

            if (product?.track_expiry && product?.expiry_days && watchedPurchaseDate) {
                const purchaseDate = new Date(watchedPurchaseDate);
                const expiryDate = new Date(purchaseDate);
                expiryDate.setDate(expiryDate.getDate() + (product.expiry_days || 0));
                setValue('expiry_date', expiryDate.toISOString().split('T')[0]);
            } else if (!product?.track_expiry) {
                setValue('expiry_date', '');
            }
        } else {
            setSelectedProduct(null);
        }
    }, [watchedProductId, watchedPurchaseDate, allProducts, setValue]);

    const onSubmit = async (data: PurchaseFormData) => {
        try {
            if (isEditing && editId) {
                await api.put(`/purchases/${editId}`, data);
                toast.success('Purchase updated successfully!');
            } else {
                await api.post('/purchases', data);
                toast.success('Purchase recorded successfully!');
            }

            reset({
                categoryId: '',
                product_id: '',
                quantity: 0,
                purchase_date: new Date().toISOString().split('T')[0],
                expiry_date: '',
                image_url: ''
            });

            setIsEditing(false);
            setEditId(null);
            setSelectedCategoryId('');
            fetchPurchases();
        } catch (error: unknown) {
            console.warn('Error recording purchase:', error);
            const serverMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(serverMessage || 'Error recording purchase');
        }
    };

    const handleEdit = (purchase: Purchase) => {
        const product = allProducts.find((p: Product) => String(p.id) === String(purchase.product_id));
        const catId = product?.categoryId || product?.category || 'products';
        
        setSelectedCategoryId(catId);
        setValue('categoryId', catId);
        setValue('product_id', String(purchase.product_id));
        setValue('quantity', Number(purchase.quantity));
        setValue('purchase_date', purchase.purchase_date.split('T')[0]);
        setValue('expiry_date', purchase.expiry_date ? purchase.expiry_date.split('T')[0] : '');
        setValue('image_url', '');

        setIsEditing(true);
        setEditId(purchase.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        setSelectedCategoryId('');
        reset({
            categoryId: '',
            product_id: '',
            quantity: 0,
            purchase_date: new Date().toISOString().split('T')[0],
            expiry_date: '',
            image_url: ''
        });
    };

    const handleDeleteClick = (id: number) => {
        setDeleteId(id);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/purchases/${deleteId}`);
            toast.success('Purchase record deleted successfully');
            fetchPurchases();
        } catch (error) {
            console.warn('Error deleting purchase:', error);
            toast.error('Failed to delete purchase record');
        } finally {
            setIsDeleteDialogOpen(false);
            setDeleteId(null);
        }
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
        let uploadData = null;

        try {
            toast.info('Uploading document...');
            const res = await api.post('/stock/upload', formData);
            uploadData = res.data;
        } catch (uploadError: unknown) {
            const errorMessage = uploadError instanceof Error ? uploadError.message : 'Failed';
            toast.error(`Upload Error: ${errorMessage}`);
            return;
        }

        if (!uploadData) return;

        try {
            const { url: imageUrl, filePath } = uploadData;
            toast.info('Analyzing document content...');
            setValue('image_url', imageUrl || '');

            const analyzeRes = await api.post('/stock/analyze', { imageUrl, filePath });
            const { productName, quantity, date } = analyzeRes.data;

            if (quantity) setValue('quantity', quantity);
            if (date) setValue('purchase_date', date);

            if (productName) {
                const matchedProduct = allProducts.find(p =>
                    p.name.toLowerCase().includes(productName.toLowerCase()) ||
                    productName.toLowerCase().includes(p.name.toLowerCase())
                );
                if (matchedProduct) {
                    const catId = matchedProduct.categoryId || matchedProduct.category || 'products';
                    setSelectedCategoryId(catId);
                    setValue('categoryId', catId);
                    setValue('product_id', String(matchedProduct.id));
                    toast.success(`Matched: ${matchedProduct.name}`);
                }
            }
            toast.success('Data extracted successfully. Please verify.');

        } catch (err) {
            console.warn('Analysis failed:', err);
            toast.error('Analysis failed');
        }
    };

    const handleStockUpdate = async () => {
        if (!selectedProductId || !stockQuantity) {
            toast.error('Please select a product and enter quantity');
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
            fetchPurchases();
            toast.success('Stock updated successfully!');
        } catch (err) {
            console.warn('Update failed:', err);
            toast.error('Failed to update stock');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1800px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-heading">Purchase Orders</h1>
                    <p className="text-slate-500 font-medium whitespace-nowrap">Acquisition tracking and digital document management.</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleImageCapture}
                    />
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        variant="gradient"
                        size="lg"
                        className="rounded-2xl shadow-xl shadow-blue-500/20"
                    >
                        <ScanLine className="w-5 h-5 mr-3" />
                        Scan Purchase Bill
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-4">
                    <Card className="sticky top-24 border-none shadow-premium bg-white/70 backdrop-blur-xl">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl flex items-center">
                                <PlusCircle className="w-5 h-5 mr-2 text-primary" />
                                {isEditing ? 'Edit Purchase' : 'Record Purchase'}
                            </CardTitle>
                            <CardDescription>
                                {isEditing ? 'Modify recorded data' : 'Enter new supply acquisition'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                                <Select
                                    label="Product Category"
                                    {...register('categoryId')}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSelectedCategoryId(val);
                                        setValue('categoryId', val);
                                        setValue('product_id', ''); // Reset product
                                    }}
                                    error={errors.categoryId}
                                    options={CATEGORIES.map(c => ({ value: c.id, label: c.name }))}
                                    placeholder="Choose category first"
                                    className="bg-white"
                                />

                                <Select
                                    label="Supply Product"
                                    {...register('product_id')}
                                    error={errors.product_id}
                                    disabled={!selectedCategoryId || productsLoading}
                                    options={filteredProducts.map(p => ({
                                        value: String(p.id),
                                        label: `${p.name} (${p.unit})`
                                    }))}
                                    placeholder={
                                        productsLoading 
                                            ? "Loading products..." 
                                            : !selectedCategoryId 
                                                ? "Select category to see products" 
                                                : filteredProducts.length === 0 
                                                    ? "No products in this category" 
                                                    : "Select product"
                                    }
                                    className="bg-white"
                                />

                                {selectedProduct?.track_expiry && (
                                    <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50 flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                                        <span className="text-[11px] font-bold text-blue-600">Perishable: {selectedProduct.expiry_days} day shelf life</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Quantity"
                                        type="number"
                                        step="0.01"
                                        {...register('quantity')}
                                        error={errors.quantity}
                                        placeholder="0.00"
                                        startAdornment={<span className="text-slate-400 font-bold">{selectedProduct?.unit || 'qty'}</span>}
                                        className="bg-white"
                                    />
                                    <Input
                                        label="Purchase Date"
                                        type="date"
                                        {...register('purchase_date')}
                                        error={errors.purchase_date}
                                        className="bg-white"
                                    />
                                </div>

                                {selectedProduct?.track_expiry && (
                                    <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-3">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                            <label className="text-[13px] font-bold text-slate-700">Expiry Management</label>
                                        </div>
                                        <Input
                                            label=""
                                            type="date"
                                            {...register('expiry_date')}
                                            error={errors.expiry_date}
                                            className="bg-white"
                                            helperText="Adjust if different from default"
                                        />
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        type="submit"
                                        variant="gradient"
                                        className="flex-1 h-11 rounded-xl font-bold"
                                        disabled={isSubmitting}
                                    >
                                        {isEditing ? 'Confirm Update' : 'Record Entry'}
                                        {!isSubmitting && <ArrowRight className="w-4 h-4 ml-2" />}
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
                    {/* Filter & Advanced Search */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-white/70 backdrop-blur-md rounded-3xl shadow-premium border border-slate-100">
                        <div className="flex items-center gap-3 w-full md:w-auto p-1 bg-slate-50 rounded-2xl border border-slate-100/50">
                            <div className="flex items-center px-4 border-r border-slate-200/50 group">
                                <Calendar className="h-3.5 w-3.5 text-slate-400 mr-2 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="date"
                                    value={dateRange.startDate}
                                    onChange={(e) => {
                                        setDateRange({ ...dateRange, startDate: e.target.value });
                                        setCurrentPage(1);
                                    }}
                                    className="bg-transparent border-none text-[11px] font-bold text-slate-600 outline-none w-24"
                                />
                            </div>
                            <span className="text-[10px] font-black text-slate-300 px-1">TO</span>
                            <div className="flex items-center px-4 group">
                                <input
                                    type="date"
                                    value={dateRange.endDate}
                                    onChange={(e) => {
                                        setDateRange({ ...dateRange, endDate: e.target.value });
                                        setCurrentPage(1);
                                    }}
                                    className="bg-transparent border-none text-[11px] font-bold text-slate-600 outline-none w-24"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                             <div className="h-10 px-4 rounded-xl border border-slate-200 bg-white flex items-center shadow-sm">
                                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 mr-3">
                                    <FileText className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Invoices: <span className="text-slate-900">{totalItems}</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Date & Invoice</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Total Cost</TableHead>
                                    <TableHead>Expiry Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-10 h-10 rounded-full border-4 border-slate-50 border-t-blue-500 animate-spin" />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compiling Records...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : purchases.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="p-5 rounded-full bg-slate-50 text-slate-200">
                                                    <Package className="w-12 h-12" />
                                                </div>
                                                <span className="text-slate-400 font-bold">No purchase records within this timeframe.</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    purchases.map((purchase) => (
                                        <TableRow key={purchase.id} className="group">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-slate-900 font-bold">{new Date(purchase.purchase_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">BATCH-#{purchase.id.toString().padStart(4, '0')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                                                        <Package className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-bold text-slate-900">{purchase.products?.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-slate-900 font-extrabold">{purchase.quantity}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">{purchase.products?.unit}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="text-slate-700 font-bold italic">₹{purchase.price}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="text-base font-black text-slate-900">
                                                    ₹{(purchase.quantity * purchase.price).toLocaleString()}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {purchase.expiry_date ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn(
                                                            "w-2 h-2 rounded-full",
                                                            new Date(purchase.expiry_date) < new Date() ? "bg-rose-500" : "bg-emerald-500"
                                                        )} />
                                                        <span className="text-[11px] font-bold text-slate-600">{new Date(purchase.expiry_date).toLocaleDateString()}</span>
                                                    </div>
                                                ) : <span className="text-slate-300 font-medium italic text-xs">No Expiry</span>}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-primary/5" onClick={() => handleEdit(purchase)}>
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteClick(purchase.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {/* Pagination Bar */}
                        {totalPages > 1 && (
                            <div className="bg-slate-50 border-t border-slate-100 px-8 py-5 flex items-center justify-between">
                                <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">
                                    Displaying <span className="text-slate-900">{((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}</span> of <span className="text-slate-900">{totalItems}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl h-9 w-9 p-0 bg-white"
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1 || loading}
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl h-9 w-9 p-0 bg-white"
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages || loading}
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Stock Analysis Feedback Modal */}
            {showStockModal && (
                <Modal
                    isOpen={showStockModal}
                    onClose={() => setShowStockModal(false)}
                    className="max-w-md rounded-3xl"
                >
                    <div className="p-8">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-4 rounded-3xl bg-blue-50 text-blue-600">
                                <ScanLine className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">Scan Results</h2>
                                <p className="text-sm font-bold text-slate-400">Verifying extracted bill data</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {stockImage && (
                                <div className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 p-2">
                                    <img src={stockImage} alt="Bill Capture" className="w-full h-40 object-cover rounded-xl" />
                                </div>
                            )}

                            <div className="space-y-4">
                                <Select
                                    label="Correct Product"
                                    value={selectedProductId}
                                    onChange={(e) => setSelectedProductId(e.target.value)}
                                    options={allProducts.map((p: Product) => ({ value: String(p.id), label: p.name }))}
                                    placeholder="Confirm mapped product"
                                    className="bg-slate-50 border-none"
                                />
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setStockAction('IN')}
                                        className={cn(
                                            "p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all",
                                            stockAction === 'IN' ? "bg-emerald-50 border-emerald-200 text-emerald-600 ring-4 ring-emerald-500/10" : "bg-white border-slate-100 text-slate-400"
                                        )}
                                    >
                                        Stock In
                                    </button>
                                    <button
                                        onClick={() => setStockAction('OUT')}
                                        className={cn(
                                            "p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all",
                                            stockAction === 'OUT' ? "bg-rose-50 border-rose-200 text-rose-600 ring-4 ring-rose-500/10" : "bg-white border-slate-100 text-slate-400"
                                        )}
                                    >
                                        Stock Out
                                    </button>
                                </div>

                                <Input
                                    label="Adjust Quantity"
                                    type="number"
                                    value={stockQuantity}
                                    onChange={(e) => setStockQuantity(e.target.value)}
                                    className="bg-slate-50 border-none"
                                />
                            </div>

                            <Button onClick={handleStockUpdate} variant="gradient" className="w-full h-12 rounded-2xl font-bold">
                                Confirm & Update Stock
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}

            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Void Purchase Entry?"
                description="This will permanently delete the record and inverse any stock adjustments. Continue?"
                confirmText="Void Record"
                variant="danger"
            />
        </div>
    );
}
