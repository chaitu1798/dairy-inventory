'use client';

import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Trash2, Edit2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';

const expenseSchema = z.object({
    category: z.string().min(1, 'Category is required'),
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    expense_date: z.string().min(1, 'Date is required'),
    notes: z.string().optional()
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
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
        resolver: zodResolver(expenseSchema) as any,
        defaultValues: {
            expense_date: new Date().toISOString().split('T')[0],
            category: '',
            amount: 0,
            notes: ''
        }
    });

    useEffect(() => {
        fetchExpenses(currentPage);
    }, [dateRange, currentPage]);

    const fetchExpenses = async (page = currentPage) => {
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
        } catch (error) {
            console.error('Error fetching expenses:', error);
            toast.error('Failed to load expenses');
        } finally {
            setLoading(false);
        }
    };

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
        } catch (error: any) {
            console.error('Error recording expense:', error);
            toast.error(error.serverMessage || 'Error recording expense');
        }
    };

    const handleEdit = (expense: any) => {
        setValue('category', expense.category);
        setValue('amount', expense.amount);
        setValue('notes', expense.notes || '');
        setValue('expense_date', expense.expense_date.split('T')[0]);

        setIsEditing(true);
        setEditId(expense.id);
        globalThis.window?.scrollTo({ top: 0, behavior: 'smooth' });
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
        } catch (error) {
            console.error('Error deleting expense:', error);
            toast.error('Failed to delete expense record');
        } finally {
            setIsDeleteDialogOpen(false);
            setDeleteId(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Expenses</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Section */}
                <div className="lg:col-span-1">
                    <Card className="sticky top-6">
                        <CardHeader>
                            <CardTitle>{isEditing ? 'Edit Expense' : 'Record Expense'}</CardTitle>
                            <CardDescription>
                                {isEditing ? 'Update expense details.' : 'Track operational expenses.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <Input
                                    label="Category"
                                    {...register('category')}
                                    error={errors.category}
                                    placeholder="e.g., Transport, Salary"
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
                                        startAdornment={<span className="text-gray-500 font-medium">₹</span>}
                                    />

                                    <Input
                                        label="Date"
                                        type="date"
                                        {...register('expense_date')}
                                        error={errors.expense_date}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                        Notes
                                    </label>
                                    <textarea
                                        {...register('notes')}
                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        placeholder="Optional details..."
                                    />
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <Button
                                        type="submit"
                                        variant="destructive" // Use red for expenses
                                        className="flex-1"
                                        disabled={isSubmitting}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        {isEditing ? 'Update Expense' : 'Record Expense'}
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
                                <CardTitle>Recent Expenses</CardTitle>
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
                                <div className="p-8 text-center text-muted-foreground">Loading expenses...</div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Mobile View: Card Stack */}
                                    <div className="md:hidden divide-y divide-gray-100">
                                        {expenses.map((expense) => (
                                            <div key={expense.id} className="p-4 space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="text-xs text-muted-foreground mb-1">
                                                            {new Date(expense.expense_date).toLocaleDateString()}
                                                        </div>
                                                        <h3 className="font-semibold text-gray-900">{expense.category}</h3>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-destructive">
                                                            ₹{expense.amount}
                                                        </p>
                                                    </div>
                                                </div>

                                                {expense.notes && (
                                                    <div className="bg-gray-50 p-2 rounded text-sm text-gray-600 italic">
                                                        {expense.notes}
                                                    </div>
                                                )}

                                                <div className="flex justify-end gap-2 pt-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-primary"
                                                        onClick={() => handleEdit(expense)}
                                                    >
                                                        <Edit2 className="w-4 h-4 mr-1" /> Edit
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-destructive"
                                                        onClick={() => handleDeleteClick(expense.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-1" /> Delete
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
                                                    <TableHead>Category</TableHead>
                                                    <TableHead>Amount</TableHead>
                                                    <TableHead>Notes</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {expenses.map((expense) => (
                                                    <TableRow key={expense.id}>
                                                        <TableCell className="text-muted-foreground text-sm">
                                                            {new Date(expense.expense_date).toLocaleDateString()}
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {expense.category}
                                                        </TableCell>
                                                        <TableCell className="font-bold text-destructive">
                                                            ₹{expense.amount}
                                                        </TableCell>
                                                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                                                            {expense.notes || '-'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-primary"
                                                                    onClick={() => handleEdit(expense)}
                                                                    aria-label="Edit expense"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-destructive"
                                                                    onClick={() => handleDeleteClick(expense.id)}
                                                                    aria-label="Delete expense"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {expenses.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                            No expenses found for the selected period.
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
                title="Delete Expense Record"
                description="Are you sure you want to delete this expense? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
