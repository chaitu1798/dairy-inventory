'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { 
    Trash2, 
    ChevronLeft, 
    ChevronRight,
    TrendingDown,
    ArrowRight,
    Info,
    AlertTriangle,
    Edit2
} from 'lucide-react';
import { Product, Waste } from '../../types';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
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

export default function WastePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [wasteRecords, setWasteRecords] = useState<Waste[]>([]);
    const [summary, setSummary] = useState<{ total_waste_value: number; waste_by_reason: Record<string, number> } | null>(null);
    const [formData, setFormData] = useState({
        product_id: '',
        quantity: '',
        reason: 'expired',
        cost_value: '',
        waste_date: new Date().toISOString().split('T')[0],
        notes: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const ITEMS_PER_PAGE = 50;
    const [loading, setLoading] = useState(true);

    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const fetchProducts = useCallback(async () => {
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
            console.warn('Error fetching products:', error);
            setProducts([]);
        }
    }, []);

    const fetchWasteRecords = useCallback(async (page = currentPage) => {
        setLoading(true);
        try {
            const res = await api.get(`/waste?page=${page}&limit=${ITEMS_PER_PAGE}`);
            if (res.data.data) {
                setWasteRecords(res.data.data);
                setTotalPages(res.data.totalPages);
                setTotalItems(res.data.count);
            } else {
                setWasteRecords(res.data);
            }
        } catch (error) {
            console.warn('Error fetching waste records:', error);
        } finally {
            setLoading(false);
        }
    }, [currentPage]);

    const fetchSummary = async () => {
        try {
            const res = await api.get('/waste/summary');
            setSummary(res.data);
        } catch (error) {
            console.warn('Error fetching summary:', error);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchSummary();
    }, [fetchProducts]);

    useEffect(() => {
        fetchWasteRecords(currentPage);
    }, [currentPage, fetchWasteRecords]);

    useEffect(() => {
        if (formData.product_id && formData.quantity) {
            const product = products.find(p => p.id === Number.parseInt(formData.product_id, 10));
            if (product) {
                const costValue = Number.parseFloat(formData.quantity) * Number.parseFloat(String(product.cost_price || 0));
                setFormData(prev => ({ ...prev, cost_value: costValue.toFixed(2) }));
            }
        }
    }, [formData.product_id, formData.quantity, products]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing && editId) {
                await api.put(`/waste/${editId}`, formData);
                toast.success('Waste record updated successfully');
            } else {
                await api.post('/waste', formData);
                toast.success('Waste record recorded successfully');
            }
            handleCancelEdit();
            fetchWasteRecords();
            fetchSummary();
        } catch (error: unknown) {
            console.warn('Error recording waste:', error);
            const serverMessage = (error as { response?: { data?: { error?: string, message?: string } } })?.response?.data?.error || (error as any)?.response?.data?.message;
            toast.error(serverMessage || 'Failed to save waste record');
        }
    };

    const handleEdit = (record: Waste) => {
        setIsEditing(true);
        setEditId(record.id!);
        setFormData({
            product_id: String(record.product_id),
            quantity: String(record.quantity),
            reason: record.reason,
            cost_value: record.cost_value ? String(record.cost_value) : '',
            waste_date: record.waste_date ? record.waste_date.split('T')[0] : new Date().toISOString().split('T')[0],
            notes: record.notes || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        setFormData({
            product_id: '',
            quantity: '',
            reason: 'expired',
            cost_value: '',
            waste_date: new Date().toISOString().split('T')[0],
            notes: ''
        });
    };

    const handleDeleteClick = (id: number) => {
        setDeleteId(id);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/waste/${deleteId}`);
            toast.success('Waste record deleted successfully');
            fetchWasteRecords();
            fetchSummary();
        } catch (error: unknown) {
            console.warn('Error deleting waste:', error);
            toast.error('Failed to delete waste record');
        } finally {
            setIsDeleteDialogOpen(false);
            setDeleteId(null);
        }
    };

    const getReasonVariant = (reason: string): "destructive" | "warning" | "secondary" => {
        const variants: Record<string, "destructive" | "warning" | "secondary"> = {
            expired: 'destructive',
            damaged: 'warning',
            other: 'secondary'
        };
        return variants[reason] || 'secondary';
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-heading">Waste & Loss Tracking</h1>
                    <p className="text-slate-500 font-medium whitespace-nowrap">Monitor spoiled inventory and financial shrinkage.</p>
                </div>
                <div className="flex-1 max-w-sm md:ml-auto">
                    {summary && (
                        <Card isGlass={false} className="border-none bg-rose-50 py-2 px-4 flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-white text-rose-600 shadow-sm">
                                <TrendingDown className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] font-black text-rose-600/50 uppercase tracking-widest leading-none mb-1">Total Loss Value</p>
                                <h4 className="text-lg font-black text-slate-900 leading-none">₹{summary.total_waste_value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h4>
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* Reason Breakdown Quick Stats */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                   {Object.entries(summary.waste_by_reason || {}).map(([reason, value]) => (
                        <Card key={reason} isGlass className="border-none shadow-sm p-4 bg-white/50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{reason}</p>
                                    <h5 className="text-lg font-black text-slate-900 leading-none">₹{Number(value).toLocaleString()}</h5>
                                </div>
                                <Badge variant={getReasonVariant(reason)} className="h-6 px-2">
                                    {reason.charAt(0).toUpperCase()}
                                </Badge>
                            </div>
                        </Card>
                   ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Entry Form */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-24 border-none shadow-premium bg-white/70 backdrop-blur-xl">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl flex items-center">
                                <AlertTriangle className="w-5 h-5 mr-2 text-rose-500" />
                                {isEditing ? 'Edit Loss Record' : 'Record Loss'}
                            </CardTitle>
                            <CardDescription>
                                {isEditing ? 'Update details of the spoiled inventory.' : 'Document spoiled or damaged inventory.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <Select
                                    label="Target Product"
                                    value={formData.product_id}
                                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                                    options={products.map(p => ({
                                        value: String(p.id),
                                        label: `${p.name} (₹${p.cost_price}/u)`
                                    }))}
                                    placeholder="Select inventory item"
                                    className="bg-white"
                                    required
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Waste Quantity"
                                        type="number"
                                        step="0.01"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                        className="bg-white"
                                        placeholder="0.00"
                                        required
                                    />
                                    <Select
                                        label="Loss Reason"
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        options={[
                                            { value: 'expired', label: 'Expired' },
                                            { value: 'damaged', label: 'Damaged' },
                                            { value: 'other', label: 'Other' }
                                        ]}
                                        className="bg-white"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[13px] font-semibold text-slate-700 ml-1">Est. Loss Value</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-[13px] font-bold text-rose-500">₹</span>
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.cost_value}
                                                onChange={(e) => setFormData({ ...formData, cost_value: e.target.value })}
                                                className="w-full h-11 pl-7 pr-4 rounded-xl border border-slate-100 bg-rose-50/50 text-sm font-black text-rose-600 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <Input
                                        label="Record Date"
                                        type="date"
                                        value={formData.waste_date}
                                        onChange={(e) => setFormData({ ...formData, waste_date: e.target.value })}
                                        className="bg-white"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5 group">
                                    <label className="text-[13px] font-semibold text-slate-700 ml-1 transition-colors group-focus-within:text-rose-500">
                                        Loss Notes
                                    </label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm transition-all focus:ring-4 focus:ring-rose-500/5 focus:border-rose-300 outline-none"
                                        placeholder="Briefly describe what happened..."
                                    />
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        type="submit"
                                        variant="destructive"
                                        className="flex-1 h-11 rounded-xl font-bold shadow-lg shadow-rose-500/20"
                                    >
                                        {isEditing ? 'Update Entry' : 'Log Waste Entry'}
                                        {!isEditing && <ArrowRight className="w-4 h-4 ml-2" />}
                                    </Button>
                                    {isEditing && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="h-11 rounded-xl font-bold px-6 border-slate-200 text-slate-600 hover:bg-slate-50"
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

                {/* Records Table */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                            <h2 className="text-xl font-extrabold text-slate-900 font-heading">Loss Records Archive</h2>
                            <div className="px-3 py-1 rounded-full bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                {totalItems} Entries Found
                            </div>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Date & ID</TableHead>
                                    <TableHead>Product / Item</TableHead>
                                    <TableHead className="text-right">Quantity Lost</TableHead>
                                    <TableHead>Shrinkage Reason</TableHead>
                                    <TableHead className="text-right">Loss Amount</TableHead>
                                    <TableHead className="text-right">Notes</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-10 h-10 rounded-full border-4 border-slate-50 border-t-rose-500 animate-spin" />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auditing Waste records...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : wasteRecords.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="p-5 rounded-full bg-slate-50 text-slate-200">
                                                    <Info className="w-12 h-12" />
                                                </div>
                                                <span className="text-slate-400 font-bold text-center max-w-xs">No waste records yet. Your inventory operations appear efficient!</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    wasteRecords.map((record) => (
                                        <TableRow key={record.id} className="group">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-slate-900 font-bold">{new Date(record.waste_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">WST-#{record.id.toString().padStart(4, '0')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
                                                        <Trash2 className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-bold text-slate-900">{record.products?.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-slate-900 font-extrabold">{record.quantity}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">{record.products?.unit}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={getReasonVariant(record.reason)} className="capitalize">
                                                    {record.reason}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="text-base font-black text-rose-600">
                                                    ₹{record.cost_value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <p className="text-xs font-medium text-slate-500 max-w-[150px] line-clamp-1 italic ml-auto cursor-help" title={record.notes ?? undefined}>
                                                    {record.notes || <span className="text-slate-200">N/A</span>}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5" onClick={() => handleEdit(record)}>
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteClick(record.id!)}>
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
                                        className="rounded-xl h-9 w-9 p-0 bg-white shadow-sm"
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1 || loading}
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl h-9 w-9 p-0 bg-white shadow-sm"
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
                title="Delete Waste Record"
                description="Are you sure you want to delete this record? This action cannot be undone and will affect your waste loss summaries."
                confirmText="Delete Record"
            />
        </div>
    );
}
