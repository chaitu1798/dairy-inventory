'use client';

import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Trash2, Edit2, ChevronLeft, ChevronRight, Search, Calendar } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

const salesSchema = z.object({
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
    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [sales, setSales] = useState<any[]>([]);
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
        resolver: zodResolver(salesSchema) as any,
        defaultValues: {
            sale_date: new Date().toISOString().split('T')[0],
            status: 'paid',
            customer_id: '',
            due_date: ''
        }
    });

    const status = watch('status');

    useEffect(() => {
        fetchProducts();
        fetchCustomers();
    }, []);

    useEffect(() => {
        fetchSales(currentPage);
    }, [dateRange, currentPage]);

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
        }
    };

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/customers');
            setCustomers(res.data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const fetchSales = async (page = currentPage) => {
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
            console.error('Error fetching sales:', error);
            toast.error('Failed to load sales');
        } finally {
            setLoading(false);
        }
    };

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
                product_id: '',
                customer_id: '',
                quantity: 0,
                sale_date: new Date().toISOString().split('T')[0],
                status: 'paid',
                due_date: ''
            });

            setIsEditing(false);
            setEditId(null);
            fetchSales();
        } catch (error) {
            console.error('Error recording sale:', error);
            toast.error('Error recording sale');
        }
    };

    const handleEdit = (sale: any) => {
        setIsEditing(true);
        setEditId(sale.id);
        reset({
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
        reset({
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
            console.error('Error deleting sale:', error);
            toast.error('Failed to delete sale record');
        } finally {
            setIsDeleteDialogOpen(false);
            setDeleteId(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900" tabIndex={0}>Sales Management</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle>{isEditing ? 'Edit Sale' : 'Record New Sale'}</CardTitle>
                            <CardDescription>
                                {isEditing ? 'Update the sale details below.' : 'Enter new sale details to record a transaction.'}
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
                                        label: `${p.name} (${p.unit})`
                                    }))}
                                    placeholder="Select Product"
                                />

                                <Select
                                    label="Customer (Optional)"
                                    {...register('customer_id')}
                                    error={errors.customer_id}
                                    options={customers.map(c => ({
                                        value: String(c.id),
                                        label: c.name
                                    }))}
                                    placeholder="Walk-in Customer"
                                />

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
                                        {...register('sale_date')}
                                        error={errors.sale_date}
                                    />
                                </div>

                                <Select
                                    label="Payment Status"
                                    {...register('status')}
                                    error={errors.status}
                                    options={[
                                        { value: 'paid', label: 'Paid (Cash/UPI)' },
                                        { value: 'pending', label: 'Pending (Credit)' }
                                    ]}
                                />

                                {status === 'pending' && (
                                    <div className="animate-fade-in">
                                        <Input
                                            label="Due Date"
                                            type="date"
                                            {...register('due_date')}
                                            error={errors.due_date}
                                        />
                                    </div>
                                )}

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        type="submit"
                                        className="flex-1 bg-sky-500 hover:bg-sky-600"
                                        disabled={isSubmitting}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        {isEditing ? 'Update Sale' : 'Record Sale'}
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
                                <CardTitle>Recent Sales</CardTitle>
                                <div className="flex items-center gap-2 w-full md:w-auto p-1 bg-muted rounded-md">
                                    <div className="flex items-center px-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground mr-2" />
                                        <input
                                            type="date"
                                            value={dateRange.startDate}
                                            onChange={(e) => {
                                                setDateRange({ ...dateRange, startDate: e.target.value });
                                                setCurrentPage(1);
                                            }}
                                            className="bg-transparent border-none text-sm focus:ring-0 w-32"
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
                                            className="bg-transparent border-none text-sm focus:ring-0 w-32"
                                            aria-label="End Date Filter"
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="p-8 text-center text-muted-foreground">Loading sales records...</div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Mobile View: Card Stack */}
                                    <div className="md:hidden divide-y divide-gray-100">
                                        {sales.map((sale) => (
                                            <div key={sale.id} className="p-4 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="text-sm text-gray-500 mb-1">{new Date(sale.sale_date).toLocaleDateString()}</div>
                                                        <h3 className="font-semibold text-gray-900">{sale.products?.name}</h3>
                                                        <div className="text-sm text-muted-foreground">
                                                            {sale.customers?.name || <span className="italic">Walk-in</span>}
                                                        </div>
                                                    </div>
                                                    <Badge variant={
                                                        sale.status === 'paid' ? 'success' :
                                                            sale.status === 'overdue' ? 'destructive' : 'warning'
                                                    } className="uppercase text-[10px]">
                                                        {sale.status || 'PAID'}
                                                    </Badge>
                                                </div>

                                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                                                    <div>
                                                        <p className="text-xs text-gray-500 uppercase font-semibold">Qty</p>
                                                        <p className="font-medium">{sale.quantity} {sale.products?.unit}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-gray-500 uppercase font-semibold">Amount</p>
                                                        <p className="font-bold text-emerald-600">₹{(sale.quantity * sale.price).toFixed(2)}</p>
                                                    </div>
                                                </div>

                                                <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-primary"
                                                        onClick={() => handleEdit(sale)}
                                                    >
                                                        <Edit2 className="w-4 h-4 mr-2" /> Edit
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-destructive"
                                                        onClick={() => handleDeleteClick(sale.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                    </Button>
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
                                                    <TableHead>Customer</TableHead>
                                                    <TableHead>Product</TableHead>
                                                    <TableHead>Amount</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {sales.map((sale) => (
                                                    <TableRow key={sale.id}>
                                                        <TableCell className="text-muted-foreground text-sm">
                                                            {new Date(sale.sale_date).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {sale.customers?.name || <span className="text-muted-foreground italic">Walk-in</span>}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div>{sale.products?.name}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {sale.quantity} {sale.products?.unit}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-bold text-emerald-600">
                                                            ₹{(sale.quantity * sale.price).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={
                                                                sale.status === 'paid' ? 'success' :
                                                                    sale.status === 'overdue' ? 'destructive' : 'warning'
                                                            } className="uppercase text-[10px]">
                                                                {sale.status || 'PAID'}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-primary"
                                                                    onClick={() => handleEdit(sale)}
                                                                    aria-label="Edit sale"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-destructive"
                                                                    onClick={() => handleDeleteClick(sale.id)}
                                                                    aria-label="Delete sale"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {sales.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                            No sales found for the selected period.
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

            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Sale Record"
                description="Are you sure you want to delete this sale? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
