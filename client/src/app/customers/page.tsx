'use client';

import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Plus, Trash2, Edit2, Phone, MapPin } from 'lucide-react';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

const customerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().optional(),
    address: z.string().optional(),
    credit_limit: z.number().min(0, 'Credit limit cannot be negative').optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);

    // Confirmation Dialog State
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<CustomerFormData>({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            name: '',
            phone: '',
            address: '',
            credit_limit: 0
        }
    });

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/customers');
            setCustomers(res.data);
        } catch (error) {
            console.error('Error fetching customers:', error);
            toast.error('Failed to load customers');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: CustomerFormData) => {
        try {
            if (isEditing && editId) {
                await api.put(`/customers/${editId}`, data);
                toast.success('Customer updated successfully');
            } else {
                await api.post('/customers', data);
                toast.success('Customer added successfully');
            }

            reset({
                name: '',
                phone: '',
                address: '',
                credit_limit: 0
            });
            setIsEditing(false);
            setEditId(null);
            fetchCustomers();
        } catch (error) {
            console.error('Error saving customer:', error);
            toast.error('Error saving customer');
        }
    };

    const handleEdit = (customer: any) => {
        setValue('name', customer.name);
        setValue('phone', customer.phone || '');
        setValue('address', customer.address || '');
        setValue('credit_limit', Number(customer.credit_limit) || 0);

        setIsEditing(true);
        setEditId(customer.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditId(null);
        reset({
            name: '',
            phone: '',
            address: '',
            credit_limit: 0
        });
    };

    const handleDeleteClick = (id: number) => {
        setDeleteId(id);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;

        try {
            await api.delete(`/customers/${deleteId}`);
            toast.success('Customer deleted successfully');
            fetchCustomers();
        } catch (error) {
            console.error('Error deleting customer:', error);
            toast.error('Failed to delete customer. They may have active sales.');
        } finally {
            setIsDeleteDialogOpen(false);
            setDeleteId(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900" tabIndex={0}>Customers</h1>

            {/* Form Section */}
            <Card>
                <CardHeader>
                    <CardTitle>{isEditing ? 'Edit Customer' : 'Add New Customer'}</CardTitle>
                    <CardDescription>
                        {isEditing ? 'Update customer details.' : 'Register a new customer for credit tracking.'}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Name"
                                {...register('name')}
                                error={errors.name}
                                placeholder="Customer full name"
                            />
                            <Input
                                label="Phone"
                                {...register('phone')}
                                error={errors.phone}
                                placeholder="Phone number"
                            />
                            <Input
                                type="number"
                                label="Credit Limit"
                                {...register('credit_limit', { valueAsNumber: true })}
                                error={errors.credit_limit}
                                placeholder="0.00"
                            />
                            <div className="space-y-2">
                                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                    Address
                                </label>
                                <textarea
                                    {...register('address')}
                                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Full address (optional)"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                type="submit"
                                className="flex-1 md:flex-none md:w-48"
                                disabled={isSubmitting}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {isEditing ? 'Update Customer' : 'Add Customer'}
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

            {/* List Section - Grid of Cards */}
            {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loading customers...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {customers.map((customer) => (
                        <Card key={customer.id} className="flex flex-col h-full hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-xl">{customer.name}</CardTitle>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-primary"
                                            onClick={() => handleEdit(customer)}
                                            aria-label={`Edit ${customer.name}`}
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive"
                                            onClick={() => handleDeleteClick(customer.id)}
                                            aria-label={`Delete ${customer.name}`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-2 text-sm">
                                {customer.phone && (
                                    <div className="flex items-center text-muted-foreground">
                                        <Phone className="w-4 h-4 mr-2" aria-hidden="true" />
                                        {customer.phone}
                                    </div>
                                )}
                                {customer.address && (
                                    <div className="flex items-center text-muted-foreground">
                                        <MapPin className="w-4 h-4 mr-2" aria-hidden="true" />
                                        <span className="truncate">{customer.address}</span>
                                    </div>
                                )}
                                <div className="pt-4 mt-2 border-t flex justify-between items-center">
                                    <span className="font-medium text-slate-700">Credit Limit</span>
                                    <Badge variant="outline" className="font-mono text-emerald-600 bg-emerald-50 border-emerald-200">
                                        ₹{customer.credit_limit || 0}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {customers.length === 0 && (
                        <div className="col-span-full text-center py-10 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                            No customers found. Add your first customer above.
                        </div>
                    )}
                </div>
            )}

            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Customer"
                description="Are you sure you want to delete this customer? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
