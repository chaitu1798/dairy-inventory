'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { 
    Plus, 
    Trash2, 
    Edit2, 
    Calendar, 
    ChevronLeft, 
    ChevronRight,
    Wallet,
    TrendingDown,
    ArrowRight,
    PlusCircle,
    FileText,
    PieChart,
    ArrowUpRight
} from 'lucide-react';
import { Expense } from '../../types';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../../components/ui/Input';
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
import { Badge } from '../../components/ui/Badge';

const expenseSchema = z.object({
    category: z.string().min(1, 'Category is required'),
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    expense_date: z.string().min(1, 'Date is required'),
    notes: z.string().optional()
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const ITEMS_PER_PAGE = 50;

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
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<ExpenseFormData>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            expense_date: new Date().toISOString().split('T')[0],
            category: '',
            amount: 0,
            notes: ''
        }
    });

    const fetchExpenses = useCallback(async (page = currentPage) => {
        setLoading(true);
        try {
            const res = await api.get(`/expenses?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&page=${page}&limit=${ITEMS_PER_PAGE}`);
            if (res.data.data) {
                setExpenses(res.data.data);
                setTotalPages(res.data.totalPages);
                setTotalItems(res.data.count);
            } else {
                setExpenses(res.data);
            }
        } catch (error: unknown) {
            console.warn('Error fetching expenses:', error);
            toast.error('Failed to load expenses');
        } finally {
            setLoading(false);
        }
    }, [dateRange.startDate, dateRange.endDate, currentPage, ITEMS_PER_PAGE]);

    useEffect(() => {
        fetchExpenses(currentPage);
    }, [dateRange, currentPage, fetchExpenses]);

    const onSubmit = async (data: ExpenseFormData) => {
        try {
            if (isEditing && editId) {
                await api.put(`/expenses/${editId}`, data);
                toast.success('Expense updated successfully!');
            } else {
                await api.post('/expenses', data);
                toast.success('Expense recorded successfully!');
            }

            reset({
                category: '',
                amount: 0,
                notes: '',
                expense_date: new Date().toISOString().split('T')[0]
            });
            setIsEditing(false);
            setEditId(null);
            fetchExpenses();
        } catch (err: unknown) {
            console.warn('Error recording expense:', err);
            const serverMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(serverMessage || 'Error recording expense');
        }
    };

    const handleEdit = (expense: Expense) => {
        setValue('category', expense.category);
        setValue('amount', expense.amount);
        setValue('notes', expense.notes || '');
        setValue('expense_date', expense.expense_date.split('T')[0]);

        setIsEditing(true);
        setEditId(expense.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        reset({
            category: '',
            amount: 0,
            notes: '',
            expense_date: new Date().toISOString().split('T')[0]
        });
    };

    const handleDeleteClick = (id: number) => {
        setDeleteId(id);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/expenses/${deleteId}`);
            toast.success('Expense deleted successfully');
            fetchExpenses();
        } catch (err: unknown) {
            console.warn('Error deleting expense:', err);
            const serverMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(serverMessage || 'Failed to delete expense record');
        } finally {
            setIsDeleteDialogOpen(false);
            setDeleteId(null);
        }
    };

    const totalExpenseAmount = expenses.reduce((acc, exp) => acc + exp.amount, 0);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-heading">Operational Expenses</h1>
                    <p className="text-slate-500 font-medium whitespace-nowrap">Track overheads, salaries, and maintenance costs.</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Card isGlass={false} className="border-none bg-rose-50 py-2 px-4 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white text-rose-600 shadow-sm">
                            <TrendingDown className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-rose-600/50 uppercase tracking-widest leading-none mb-1">Total Outflow</p>
                            <h4 className="text-lg font-black text-slate-900 leading-none">₹{totalExpenseAmount.toLocaleString()}</h4>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-24 border-none shadow-premium bg-white/70 backdrop-blur-xl">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl flex items-center">
                                <PlusCircle className="w-5 h-5 mr-2 text-rose-500" />
                                {isEditing ? 'Edit Expense' : 'Log Expense'}
                            </CardTitle>
                            <CardDescription>
                                {isEditing ? 'Modify expense tracking' : 'Record a new business cost'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                                <Input
                                    label="Expense Category"
                                    {...register('category')}
                                    error={errors.category}
                                    placeholder="e.g., Labor, Feed Transport"
                                    className="bg-white"
                                    autoFocus
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label="Amount"
                                        type="number"
                                        step="0.01"
                                        {...register('amount', { valueAsNumber: true })}
                                        error={errors.amount}
                                        placeholder="0.00"
                                        startAdornment={<span className="text-slate-400 font-bold">₹</span>}
                                        className="bg-white font-bold text-rose-600"
                                    />

                                    <Input
                                        label="Date"
                                        type="date"
                                        {...register('expense_date')}
                                        error={errors.expense_date}
                                        className="bg-white"
                                    />
                                </div>

                                <div className="space-y-1.5 group">
                                    <label className="text-[13px] font-semibold text-slate-700 ml-1 transition-colors group-focus-within:text-rose-500">
                                        Notes & Details
                                    </label>
                                    <textarea
                                        {...register('notes')}
                                        className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm transition-all focus:ring-4 focus:ring-rose-500/5 focus:border-rose-300 outline-none placeholder:text-slate-400 group-focus-within:bg-white"
                                        placeholder="Specific reason for this expense..."
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        type="submit"
                                        variant="destructive"
                                        className="flex-1 h-11 rounded-xl font-bold shadow-lg shadow-rose-500/20"
                                        disabled={isSubmitting}
                                    >
                                        {isEditing ? 'Confirm Update' : 'Commit Outflow'}
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
                <div className="lg:col-span-3 space-y-6">
                    {/* Period Selector */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-white/70 backdrop-blur-md rounded-3xl shadow-premium border border-slate-100">
                        <div className="flex items-center gap-3 w-full md:w-auto p-1 bg-slate-50 rounded-2xl border border-slate-100/50">
                            <div className="flex items-center px-4 border-r border-slate-200/50">
                                <Calendar className="h-3.5 w-3.5 text-slate-400 mr-2" />
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
                            <div className="flex items-center px-4">
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
                                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 mr-3">
                                    <PieChart className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">Items: <span className="text-slate-900">{totalItems}</span></span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-3xl shadow-premium border border-slate-100 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead>Date & ID</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Notes</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-10 h-10 rounded-full border-4 border-slate-50 border-t-rose-500 animate-spin" />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processing Ledger...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : expenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="p-5 rounded-full bg-slate-50 text-slate-200">
                                                    <Wallet className="w-12 h-12" />
                                                </div>
                                                <span className="text-slate-400 font-bold">No expenditure recorded for this period.</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    expenses.map((expense) => (
                                        <TableRow key={expense.id} className="group">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-slate-900 font-bold">{new Date(expense.expense_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">EX-#{expense.id.toString().padStart(4, '0')}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-rose-50 group-hover:text-rose-500 transition-colors">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-bold text-slate-900">{expense.category}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-base font-black text-rose-600">
                                                    ₹{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-xs font-medium text-slate-500 max-w-sm line-clamp-1 italic">
                                                    {expense.notes || <span className="text-slate-300">No additional notes</span>}
                                                </p>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-primary hover:bg-primary/5" onClick={() => handleEdit(expense)}>
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteClick(expense.id)}>
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
                                    Archive Range: <span className="text-slate-900">{((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}</span> of <span className="text-slate-900">{totalItems}</span>
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
                title="Void Expense?"
                description="This entry will be permanently struck from the operations ledger. Continue?"
                confirmText="Void Record"
                variant="danger"
            />
        </div>
    );
}
