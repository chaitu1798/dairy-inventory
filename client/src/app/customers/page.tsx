'use client';

import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Trash2, Edit2, Phone, Mail, MapPin } from 'lucide-react';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        credit_limit: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const res = await api.get('/customers');
            setCustomers(res.data);
        } catch (error) {
            console.error('Error fetching customers:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isEditing && editId) {
                await api.put(`/customers/${editId}`, formData);
                setMessage('Customer updated successfully');
            } else {
                await api.post('/customers', formData);
                setMessage('Customer added successfully');
            }
            setFormData({
                name: '',
                phone: '',
                address: '',
                credit_limit: ''
            });
            setIsEditing(false);
            setEditId(null);
            fetchCustomers();
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error saving customer:', error);
            setMessage('Error saving customer');
        }
    };

    const handleEdit = (customer: any) => {
        setFormData({
            name: customer.name,
            phone: customer.phone || '',
            address: customer.address || '',
            credit_limit: customer.credit_limit || ''
        });
        setIsEditing(true);
        setEditId(customer.id);
    };

    const handleDelete = async (id: number) => {
        if (confirm('Are you sure you want to delete this customer?')) {
            try {
                await api.delete(`/customers/${id}`);
                fetchCustomers();
            } catch (error) {
                console.error('Error deleting customer:', error);
                alert('Failed to delete customer');
            }
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900">Customers</h1>

            <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl transform transition-all duration-300 hover:shadow-lg">
                <h2 className="text-xl font-bold mb-4">{isEditing ? 'Edit Customer' : 'Add New Customer'}</h2>
                {message && (
                    <div className={`p-4 mb-4 rounded ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {message}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full mt-1 border p-2 rounded"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <input
                            type="text"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full mt-1 border p-2 rounded"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Credit Limit</label>
                        <input
                            type="number"
                            value={formData.credit_limit}
                            onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
                            className="w-full mt-1 border p-2 rounded"
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Address</label>
                        <textarea
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="w-full mt-1 border p-2 rounded"
                            rows={3}
                        />
                    </div>
                    <div className="md:col-span-2 flex gap-2">
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center justify-center transition-all transform hover:scale-105"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {isEditing ? 'Update Customer' : 'Add Customer'}
                        </button>
                        {isEditing && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditId(null);
                                    setFormData({
                                        name: '',
                                        phone: '',
                                        address: '',
                                        credit_limit: ''
                                    });
                                }}
                                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-all"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {customers.map((customer) => (
                    <div key={customer.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-gray-900">{customer.name}</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(customer)}
                                    className="text-indigo-600 hover:text-indigo-900"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(customer.id)}
                                    className="text-red-600 hover:text-red-900"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm text-gray-600">
                            {customer.phone && (
                                <div className="flex items-center">
                                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                    {customer.phone}
                                </div>
                            )}
                            {customer.address && (
                                <div className="flex items-center">
                                    <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                                    {customer.address}
                                </div>
                            )}
                            <div className="pt-2 border-t mt-2">
                                <span className="font-medium text-gray-700">Credit Limit: </span>
                                <span className="text-green-600 font-bold">₹{customer.credit_limit || 0}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
