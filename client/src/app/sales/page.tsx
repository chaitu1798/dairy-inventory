'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { 
    PlusCircle,
    Trash2, 
    Edit2, 
    ChevronLeft, 
    ChevronRight, 
    Calendar,
    ShoppingCart,
    ArrowUpRight,
    Filter,
    ArrowRight,
    User
} from 'lucide-react';
import { Product, Customer, Sale } from '../../types';
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
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import { useFilteredProducts } from '../../hooks/useFilteredProducts';
import { CATEGORIES } from '../../constants/categories';

const salesSchema = z.object({
    categoryId: z.string().min(1, 'Category is required'),
    product_id: z.string().min(1, 'Product is required'),
    customer_id: z.string().optional(),
    quantity: z.coerce.number().min(0.01, 'Quantity must be greater than 0'),
    sale_date: z.string().min(1, 'Sale date is required'),
    status: z.enum(['paid', 'pending', 'overdue']),
    due_date: z.string().optional(),
}).refine((data) => {
    if (data.status === 'pending' && !data.due_date) {
        return false;
    }
    return true;
}, {
    message: "Due date is required for pending sales",
    path: ["due_date"]
});

type SalesFormData = z.infer<typeof salesSchema>;

export default function SalesPage() {
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const { products: filteredProducts, loading: productsLoading } = useFilteredProducts(selectedCategoryId);
    const [allProducts, setAllProducts] = useState<Product[]>([]); 
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const ITEMS_PER_PAGE = 50;

    // UI State
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    // Confirmation Dialog State
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<SalesFormData>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(salesSchema) as any,
        defaultValues: {
            sale_date: new Date().toISOString().split('T')[0],
            status: 'paid',
            customer_id: '',
            due_date: '',
            categoryId: ''
        }
    });

    const status = watch('status');
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
            toast.error('Failed to load products list for sales');
            setAllProducts([]);
        }
    }, []);

    const fetchCustomers = useCallback(async () => {
        try {
            const res = await api.get('/customers');
            setCustomers(res.data);
        } catch (error) {
            console.warn('Error fetching customers:', error);
            toast.error('Failed to load customers for sales');
        }
    }, []);

    const fetchSales = useCallback(async (page = currentPage) => {
        try {
            setLoading(true);
            const res = await api.get(`/sales?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&page=${page}&limit=${ITEMS_PER_PAGE}`);
            if (res.data.data) {
                setSales(res.data.data);
                setTotalPages(res.data.totalPages);
                setTotalItems(res.data.count);
            } else {
                setSales(res.data);
            }
        } catch (error) {
            console.warn('Error fetching sales:', error);
            toast.error('Failed to load sales');
        } finally {
            setLoading(false);
        }
    }, [currentPage, dateRange.startDate, dateRange.endDate]);

    useEffect(() => {
        fetchAllProducts();
        fetchCustomers();
    }, [fetchAllProducts, fetchCustomers]);

    useEffect(() => {
        if (watchedCategoryId) {
            setSelectedCategoryId(watchedCategoryId);
        }
    }, [watchedCategoryId]);

    useEffect(() => {
        fetchSales(currentPage);
    }, [dateRange, currentPage, fetchSales]);

    const onSubmit = async (data: SalesFormData) => {
        try {
            const payload = {
                ...data,
                customer_id: data.customer_id || null,
                due_date: data.status === 'pending' ? data.due_date : null
            };

            if (isEditing && editId) {
                await api.put(`/sales/${editId}`, payload);
                toast.success('Sale updated successfully!');
            } else {
                await api.post('/sales', payload);
                toast.success('Sale recorded successfully!');
            }

            reset({
                categoryId: '',
                product_id: '',
                customer_id: '',
                quantity: 0,
                sale_date: new Date().toISOString().split('T')[0],
                status: 'paid',
                due_date: ''
            });

            setIsEditing(false);
            setEditId(null);
            setSelectedCategoryId('');
            fetchSales();
        } catch (error: unknown) {
            console.warn('Error recording sale:', error);
            const serverMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(serverMessage || 'Error recording sale');
        }
    };

    const handleEdit = (sale: Sale) => {
        const product = allProducts.find((p: Product) => String(p.id) === String(sale.product_id));
        const catId = product?.categoryId || product?.category || 'products';
        
        setSelectedCategoryId(catId);
        setValue('categoryId', catId);
        
        setIsEditing(true);
        setEditId(sale.id);
        reset({
            categoryId: catId,
            product_id: String(sale.product_id),
            customer_id: sale.customer_id ? String(sale.customer_id) : '',
            quantity: sale.quantity,
            sale_date: sale.sale_date.split('T')[0],
            status: sale.status || 'paid',
            due_date: sale.due_date ? sale.due_date.split('T')[0] : ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        setSelectedCategoryId('');
        reset({
            categoryId: '',
            product_id: '',
            customer_id: '',
            quantity: 0,
            sale_date: new Date().toISOString().split('T')[0],
            status: 'paid',
            due_date: ''
        });
    };

    const handleDeleteClick = (id: number) => {
        setDeleteId(id);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;

        try {
            await api.delete(`/sales/${deleteId}`);
            toast.success('Sale deleted successfully');
            fetchSales();
        } catch (error) {
            console.warn('Error deleting sale:', error);
            toast.error('Failed to delete sale record');
        } finally {
            setIsDeleteDialogOpen(false);
            setDeleteId(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1800px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-heading">Sales Ledger</h1>
                    <p className="text-slate-500 font-medium whitespace-nowrap">Manage customer transactions and payment tracking.</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                     <Card isGlass={false} className="border-none bg-emerald-50 py-2 px-4 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white text-emerald-600 shadow-sm">
                            <ArrowUpRight className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-600/50 uppercase tracking-widest leading-none mb-1">Total Sales</p>
                            <h4 className="text-lg font-black text-slate-900 leading-none">₹{sales.reduce((acc, sale) => acc + (sale.quantity * sale.price), 0).toLocaleString()}</h4>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-4">
                    <Card className="sticky top-24 border-none shadow-premium bg-white/70 backdrop-blur-xl">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl flex items-center">
                                <PlusCircle className="w-5 h-5 mr-2 text-primary" />
                                {isEditing ? 'Edit Transaction' : 'Record New Sale'}
                            </CardTitle>
                            <CardDescription>
                                {isEditing ? 'Modify transaction details' : 'Enter sales data for your ledger'}
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
                                    label="Select Product"
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

                                <Select
                                    label="Customer Account"
                                    {...register('customer_id')}
                                    error={errors.customer_id}
                                    options={customers.map(c => ({
                                        value: String(c.id),
                                        label: c.name
                                    }))}
                                    placeholder="Walk-in Customer"
                                    className="bg-white"
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Quantity"
                                        type="number"
                                        step="0.01"
                                        {...register('quantity')}
                                        error={errors.quantity}
                                        placeholder="0.00"
                                        className="bg-white"
                                    />

                                    <Input
                                        label="Sale Date"
                                        type="date"
                                        {...register('sale_date')}
                                        error={errors.sale_date}
                                        className="bg-white"
                                    />
                                </div>

                                <Select
                                    label="Payment Status"
                                    {...register('status')}
                                    error={errors.status}
                                    options={[
                                        { value: 'paid', label: 'Paid Immediately' },
                                        { value: 'pending', label: 'Pending / Credit' }
                                    ]}
                                    className="bg-white"
                                />

                                {status === 'pending' && (
                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                        <Input
                                            label="Credit Due Date"
                                            type="date"
                                            {...register('due_date')}
                                            error={errors.due_date}
                                            className="bg-white"
                                        />
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        type="submit"
                                        variant="gradient"
                                        className="flex-1 h-11 rounded-xl font-bold shadow-lg shadow-blue-500/20"
                                        disabled={isSubmitting}
                                    >
                                        {isEditing ? 'Update Sale' : 'Commit Transaction'}
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
                            <div className="flex items-center px-3 border-r border-slate-200/50">
                                <Calendar className="h-3.5 w-3.5 text-slate-400 mr-2" />
                                <input
                                    type="date"
                                    value={dateRange.startDate}
                                    onChange={(e) => {
                                        setDateRange({ ...dateRange, startDate: e.target.value });
                                        setCurrentPage(1);
                                    }}
                                    className="bg-transparent border-none text-[11px] font-bold text-slate-600 outline-none w-24"
                                    aria-label="Start Date"
                                />
                            </div>
                            <span className="text-[10px] font-black text-slate-300 px-1">TO</span>
                            <div className="flex items-center px-3">
                                <input
                                    type="date"
                                    value={dateRange.endDate}
                                    onChange={(e) => {
                                        setDateRange({ ...dateRange, endDate: e.target.value });
                                        setCurrentPage(1);
                                    }}
                                    className="bg-transparent border-none text-[11px] font-bold text-slate-600 outline-none w-24"
                                    aria-label="End Date"
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="h-9 px-4 rounded-xl border-slate-200">
                                <Filter className="w-3.5 h-3.5 mr-2" />
                                Advanced Filters
                            </Badge>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Date & ID</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Product Details</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-8 h-8 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Records...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : sales.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="p-4 rounded-full bg-slate-50 text-slate-200">
                                                    <ShoppingCart className="w-12 h-12" />
                                                </div>
                                                <span className="text-slate-400 font-bold">No sales records found for this period.</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sales.map((sale) => (
                                        <TableRow key={sale.id} className="group">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-slate-900 font-bold">{new Date(sale.sale_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">ID: #{sale.id.toString().padStart(4, '0')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                                        <User className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="font-bold text-slate-700">
                                                        {sale.customers?.name || <span className="text-slate-400 font-medium italic">Walk-in Customer</span>}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{sale.products?.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                        {sale.quantity} {sale.products?.unit} @ ₹{sale.price}/{sale.products?.unit}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="text-base font-black text-emerald-600">
                                                    ₹{(sale.quantity * sale.price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    sale.status === 'paid' ? 'success' :
                                                        sale.status === 'overdue' ? 'destructive' : 'warning'
                                                }>
                                                    {sale.status || 'PAID'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-primary/5" onClick={() => handleEdit(sale)}>
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteClick(sale.id)}>
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

            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Void Transaction?"
                description="This will permanently remove the sale from ledger and reverse stock changes. Proceed?"
                confirmText="Void Transaction"
                variant="danger"
            />
        </div>
    );
}
