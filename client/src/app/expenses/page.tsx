'use client';

import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Trash2, Edit2 } from 'lucide-react';

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        category: '',
        amount: '',
        notes: '',
        expense_date: new Date().toISOString().split('T')[0]
    });
    const [message, setMessage] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchExpenses();
    }, [dateRange]);

    const fetchExpenses = async () => {
        try {
            const res = await api.get(`/expenses?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`);
            setExpenses(res.data);
        } catch (error) {
            console.error('Error fetching expenses:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing && editId) {
                await api.put(`/expenses/${editId}`, formData);
                setMessage('Expense updated successfully!');
            } else {
                await api.post('/expenses', formData);
                setMessage('Expense recorded successfully!');
            }

            setFormData({
                category: '',
                amount: '',
                notes: '',
                expense_date: new Date().toISOString().split('T')[0]
            });
            setIsEditing(false);
            setEditId(null);
            fetchExpenses();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error recording expense:', error);
            setMessage('Error recording expense');
        }
    };

    const handleEdit = (expense: any) => {
        setFormData({
            category: expense.category,
            amount: expense.amount,
            notes: expense.notes || '',
            expense_date: expense.expense_date
        });
        setIsEditing(true);
        setEditId(expense.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this expense record?')) {
            try {
                await api.delete(`/expenses/${id}`);
                fetchExpenses();
            } catch (error) {
                console.error('Error deleting expense:', error);
                alert('Failed to delete expense record');
            }
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        setFormData({
            category: '',
            amount: '',
            notes: '',
            expense_date: new Date().toISOString().split('T')[0]
        });
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>

            <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl transform transition-all duration-300 hover:shadow-lg">
                <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Expense' : 'Record New Expense'}</h2>
                {message && (
                    <div className={`p-4 mb-4 rounded ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {message}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Category</label>
                            <input
                                type="text"
                                placeholder="e.g., Transport, Packaging, Salary"
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full mt-1 border p-2 rounded"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Amount</label>
                            <input
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full mt-1 border p-2 rounded"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Date</label>
                            <input
                                type="date"
                                value={formData.expense_date}
                                onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                                className="w-full mt-1 border p-2 rounded"
                                required
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full mt-1 border p-2 rounded"
                                rows={3}
                            />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="submit"
                            className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center justify-center transition-all transform hover:scale-105"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {isEditing ? 'Update Expense' : 'Record Expense'}
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
                    <h2 className="text-xl font-bold">Recent Expenses</h2>
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
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {expenses.map((expense) => (
                                <tr key={expense.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(expense.expense_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {expense.category}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                                        ₹{expense.amount}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                        {expense.notes || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(expense)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(expense.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {expenses.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                        No expenses recorded yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
