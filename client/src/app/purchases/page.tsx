'use client';

import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import { Plus, Calendar, Trash2, Edit2, Camera, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { cn } from '../../lib/utils';
import Modal from '../../components/ui/Modal'; // Assuming we have this or use the custom modal

// Schema Definition
const purchaseSchema = z.object({
    product_id: z.string().min(1, 'Product is required'),
    quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
    purchase_date: z.string().min(1, 'Purchase date is required'),
    expiry_date: z.string().optional(),
    image_url: z.string().optional()
});

type PurchaseFormData = z.infer<typeof purchaseSchema>;

export default function PurchasesPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [purchases, setPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const ITEMS_PER_PAGE = 50;

    const [selectedProduct, setSelectedProduct] = useState<any>(null);
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
        resolver: zodResolver(purchaseSchema) as any,
        defaultValues: {
            purchase_date: new Date().toISOString().split('T')[0],
            expiry_date: '',
            image_url: ''
        }
    });

    const watchedProductId = watch('product_id');
    const watchedPurchaseDate = watch('purchase_date');

    useEffect(() => {
        fetchProducts();
    }, []);

    useEffect(() => {
        fetchPurchases(currentPage);
    }, [dateRange, currentPage]);

    // Handle Product Change & Auto Expiry Calculation
    useEffect(() => {
        if (watchedProductId) {
            const product = products.find(p => String(p.id) === watchedProductId);
            setSelectedProduct(product || null);

            if (product?.track_expiry && product?.expiry_days && watchedPurchaseDate) {
                const purchaseDate = new Date(watchedPurchaseDate);
                const expiryDate = new Date(purchaseDate);
                expiryDate.setDate(expiryDate.getDate() + parseInt(product.expiry_days));
                setValue('expiry_date', expiryDate.toISOString().split('T')[0]);
            } else if (!product?.track_expiry) {
                setValue('expiry_date', '');
            }
        } else {
            setSelectedProduct(null);
        }
    }, [watchedProductId, watchedPurchaseDate, products, setValue]);


    const fetchProducts = async () => {
        try {
            const res = await api.get('/products?limit=1000');
            if (res.data && res.data.data) {
                setProducts(res.data.data);
            } else if (Array.isArray(res.data)) {
                setProducts(res.data);
            } else {
                setProducts([]);
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            toast.error('Failed to load products');
            setProducts([]);
        }
    };

    const fetchPurchases = async (page = currentPage) => {
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
            console.error('Error fetching purchases:', error);
            toast.error('Failed to load purchases');
        } finally {
            setLoading(false);
        }
    };

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
                product_id: '',
                quantity: 0,
                purchase_date: new Date().toISOString().split('T')[0],
                expiry_date: '',
                image_url: ''
            });

            setIsEditing(false);
            setEditId(null);
            fetchPurchases();
        } catch (error) {
            console.error('Error recording purchase:', error);
            toast.error('Error recording purchase');
        }
    };

    const handleEdit = (purchase: any) => {
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
        reset({
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
            console.error('Error deleting purchase:', error);
            toast.error('Failed to delete purchase record');
        } finally {
            setIsDeleteDialogOpen(false);
            setDeleteId(null);
        }
    };

    // Camera & Image Handling
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
            toast.info('Uploading image...');
            const res = await api.post('/stock/upload', formData);
            uploadData = res.data;
        } catch (uploadError: any) {
            console.error('Upload Step Failed:', uploadError);
            toast.error(`Upload Error: ${uploadError.message || 'Failed'}`);
            return;
        }

        if (!uploadData) return;

        try {
            const { url: imageUrl, filePath } = uploadData;
            toast.info('Analyzing image...');
            setValue('image_url', imageUrl || '');
            setShowStockModal(true); // For visual feedback if needed, or stick to form autofill
            // Note: The original logic opened a modal, but here we can integrate closely.
            // Let's stick to auto-filling the main form.

            const analyzeRes = await api.post('/stock/analyze', { imageUrl, filePath });
            const { productName, quantity, date } = analyzeRes.data;

            if (quantity) setValue('quantity', quantity);
            if (date) setValue('purchase_date', date);

            if (productName) {
                const matchedProduct = products.find(p =>
                    p.name.toLowerCase().includes(productName.toLowerCase()) ||
                    productName.toLowerCase().includes(p.name.toLowerCase())
                );
                if (matchedProduct) {
                    setValue('product_id', String(matchedProduct.id));
                    toast.success(`Matched product: ${matchedProduct.name}`);
                } else {
                    toast.warning(`Could not auto-match product: ${productName}`);
                }
            }
            toast.success('Analysis complete. Please verify details.');

        } catch (analyzeError: any) {
            console.error('Analysis Step Failed:', analyzeError);
            toast.error('Analysis failed');
        }
    };

    // Legacy Stock Update (Standalone Modal)
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
        } catch (error) {
            console.error('Stock update failed', error);
            toast.error('Failed to update stock');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900" tabIndex={0}>Purchases</h1>
                <div>
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleImageCapture}
                        aria-hidden="true"
                    />
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-purple-600 hover:bg-purple-700 text-white shadow-md"
                    >
                        <Camera className="w-5 h-5 mr-2" aria-hidden="true" />
                        Capture / Upload
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle>{isEditing ? 'Edit Purchase' : 'Record Purchase'}</CardTitle>
                            <CardDescription>
                                {isEditing ? 'Update purchase details.' : 'Record a new inventory purchase.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <Select
                                    label="Product"
                                    {...register('product_id')}
                                    error={errors.product_id}
                                    options={products.map(p => ({
                                        value: String(p.id),
                                        label: `${p.name} (${p.unit}) ${p.track_expiry ? '🕐' : ''}`
                                    }))}
                                    placeholder="Select Product"
                                    autoFocus
                                />

                                {selectedProduct?.track_expiry && (
                                    <p className="text-xs text-blue-600 -mt-2">
                                        ℹ️ Shelf life: {selectedProduct.expiry_days} days
                                    </p>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Quantity"
                                        type="number"
                                        step="0.01"
                                        {...register('quantity')}
                                        error={errors.quantity}
                                        placeholder="0.00"
                                    />
                                    <Input
                                        label="Date"
                                        type="date"
                                        {...register('purchase_date')}
                                        error={errors.purchase_date}
                                    />
                                </div>

                                {selectedProduct?.track_expiry && (
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                        <Input
                                            label="Expiry Date (Optional)"
                                            type="date"
                                            {...register('expiry_date')}
                                            error={errors.expiry_date}
                                            helperText="Leave blank for non-perishable items"
                                            className="bg-white"
                                        />
                                        <p className="text-xs text-gray-600 mt-2">
                                            Auto-calculated. Adjust if needed.
                                        </p>
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        type="submit"
                                        className="flex-1"
                                        disabled={isSubmitting}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        {isEditing ? 'Update Purchase' : 'Record Purchase'}
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
                                <CardTitle>Recent Purchases</CardTitle>
                                <div className="flex items-center gap-2 w-full md:w-auto p-1 bg-muted rounded-md border">
                                    <div className="flex items-center px-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                                        <input
                                            type="date"
                                            value={dateRange.startDate}
                                            onChange={(e) => {
                                                setDateRange({ ...dateRange, startDate: e.target.value });
                                                setCurrentPage(1);
                                            }}
                                            className="bg-transparent border-none text-sm focus:ring-0 w-32 outline-none text-right"
                                            aria-label="Start Date Filter"
                                        />
                                    </div>
                                    <span className="text-muted-foreground">-</span>
                                    <div className="flex items-center px-2">
                                        <input
                                            type="date"
                                            value={dateRange.endDate}
                                            onChange={(e) => {
                                                setDateRange({ ...dateRange, endDate: e.target.value });
                                                setCurrentPage(1);
                                            }}
                                            className="bg-transparent border-none text-sm focus:ring-0 w-32 outline-none"
                                            aria-label="End Date Filter"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="p-8 text-center text-muted-foreground">Loading purchases...</div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Mobile View: Card Stack */}
                                    <div className="md:hidden divide-y divide-gray-100">
                                        {purchases.map((purchase) => (
                                            <div key={purchase.id} className="p-4 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="text-xs text-muted-foreground mb-1">
                                                            {new Date(purchase.purchase_date).toLocaleDateString()}
                                                        </div>
                                                        <h3 className="font-semibold text-gray-900">{purchase.products?.name}</h3>
                                                        <div className="text-xs text-muted-foreground mt-0.5">
                                                            Exp: {purchase.expiry_date ? new Date(purchase.expiry_date).toLocaleDateString() : 'N/A'}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-blue-600">
                                                            ₹{(purchase.quantity * purchase.price).toFixed(2)}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            ₹{purchase.price} / unit
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                                    <div>
                                                        <p className="text-xs text-gray-500 uppercase font-semibold">Qty</p>
                                                        <p className="font-medium">
                                                            {purchase.quantity} <span className="text-xs text-muted-foreground">{purchase.products?.unit}</span>
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-primary"
                                                            onClick={() => handleEdit(purchase)}
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive"
                                                            onClick={() => handleDeleteClick(purchase.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
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
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Product</TableHead>
                                                    <TableHead>Qty</TableHead>
                                                    <TableHead>Price</TableHead>
                                                    <TableHead>Total</TableHead>
                                                    <TableHead>Expiry</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {purchases.map((purchase) => (
                                                    <TableRow key={purchase.id}>
                                                        <TableCell className="text-muted-foreground text-sm">
                                                            {new Date(purchase.purchase_date).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {purchase.products?.name}
                                                        </TableCell>
                                                        <TableCell>
                                                            {purchase.quantity} <span className="text-xs text-muted-foreground">{purchase.products?.unit}</span>
                                                        </TableCell>
                                                        <TableCell>
                                                            ₹{purchase.price}
                                                        </TableCell>
                                                        <TableCell className="font-bold text-blue-600">
                                                            ₹{(purchase.quantity * purchase.price).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground">
                                                            {purchase.expiry_date ? new Date(purchase.expiry_date).toLocaleDateString() : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-primary"
                                                                    onClick={() => handleEdit(purchase)}
                                                                    aria-label="Edit purchase"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-destructive"
                                                                    onClick={() => handleDeleteClick(purchase.id)}
                                                                    aria-label="Delete purchase"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {purchases.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                            No purchases found for the selected period.
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

                    {/* Pagination Controls */}
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

            {/* Legacy Modal Support (For Image Uploads that might trigger this flow) */}
            {showStockModal && (
                <Modal
                    isOpen={showStockModal}
                    onClose={() => setShowStockModal(false)}
                    title="Update Stock from Image"
                >
                    <div className="space-y-4">
                        {stockImage && (
                            <img src={stockImage} alt="Captured Stock" className="w-full h-48 object-contain rounded bg-muted" />
                        )}
                        <div>
                            <label className="text-sm font-medium mb-1 block">Select Product</label>
                            <select
                                value={selectedProductId}
                                onChange={(e) => setSelectedProductId(e.target.value)}
                                className="w-full border p-2 rounded"
                            >
                                <option value="">-- Choose Product --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant={stockAction === 'IN' ? 'default' : 'outline'}
                                onClick={() => setStockAction('IN')}
                                className={stockAction === 'IN' ? 'bg-green-600 hover:bg-green-700' : ''}
                            >
                                Stock In
                            </Button>
                            <Button
                                variant={stockAction === 'OUT' ? 'default' : 'outline'}
                                onClick={() => setStockAction('OUT')}
                                className={stockAction === 'OUT' ? 'bg-red-600 hover:bg-red-700' : ''}
                            >
                                Stock Out
                            </Button>
                        </div>
                        <Input
                            label="Quantity"
                            type="number"
                            value={stockQuantity}
                            onChange={(e) => setStockQuantity(e.target.value)}
                        />
                        <Button onClick={handleStockUpdate} className="w-full">
                            Confirm Update
                        </Button>
                    </div>
                </Modal>
            )}

            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Purchase Record"
                description="Are you sure you want to delete this purchase? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
