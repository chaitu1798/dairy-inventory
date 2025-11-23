'use client';

import { useState } from 'react';
import api from '../../utils/api';
import { Plus } from 'lucide-react';

export default function ExpensesPage() {
    const [formData, setFormData] = useState({
        category: '',
        amount: '',
        notes: '',
        expense_date: new Date().toISOString().split('T')[0]
    });
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/expenses', formData);
            setMessage('Expense recorded successfully!');
            setFormData({
                category: '',
                amount: '',
                notes: '',
                expense_date: new Date().toISOString().split('T')[0]
            });
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error recording expense:', error);
            setMessage('Error recording expense');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900">Record Expense</h1>

            <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl transform transition-all duration-300 hover:shadow-lg">
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

                    <button
                        type="submit"
                        className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 flex items-center justify-center transition-all transform hover:scale-105"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Record Expense
                    </button>
                </form>
            </div>
        </div>
    );
}
