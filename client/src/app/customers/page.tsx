'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '../../utils/api';
import { 
    Plus, 
    Trash2, 
    Edit2, 
    Phone, 
    MapPin,
    Users,
    ArrowRight,
    Search,
    Shield,
    CreditCard
} from 'lucide-react';
import { Customer } from '../../types';
import ConfirmationDialog from '../../components/ui/ConfirmationDialog';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { cn } from '../../lib/utils';

const customerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().optional(),
    address: z.string().optional(),
    credit_limit: z.number().min(0, 'Credit limit cannot be negative').optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

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

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/customers');
            setCustomers(res.data);
        } catch (error) {
            console.warn('Error fetching customers:', error);
            toast.error('Failed to load customers');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]);

    const onSubmit = async (data: CustomerFormData) => {
        try {
            if (isEditing && editId) {
                await api.put(`/customers/${editId}`, data);
                toast.success('Client profile updated!');
            } else {
                await api.post('/customers', data);
                toast.success('New client registered!');
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
        } catch (err: unknown) {
            console.warn('Error saving customer:', err);
            const serverMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(serverMessage || 'Error saving customer');
        }
    };

    const handleEdit = (customer: Customer) => {
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
            toast.success('Client removed successfully');
            fetchCustomers();
        } catch (error) {
            console.warn('Error deleting customer:', error);
            toast.error('Dependencies exist. Unable to remove client.');
        } finally {
            setIsDeleteDialogOpen(false);
            setDeleteId(null);
        }
    };

    const filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.phone?.includes(searchQuery)
    );

    const totalCreditLimit = customers.reduce((acc, curr) => acc + Number(curr.credit_limit || 0), 0);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-[1600px] mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-heading">Client Directory</h1>
                    <p className="text-slate-500 font-medium whitespace-nowrap">Manage customer relationships and credit limits.</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Card isGlass={false} className="border-none bg-indigo-50 py-2 px-6 flex items-center gap-3 w-full md:w-auto">
                        <div className="p-2 rounded-xl bg-white text-indigo-600 shadow-sm border border-indigo-100/50">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-indigo-600/60 uppercase tracking-widest leading-none mb-1">Total Credit Extended</p>
                            <h4 className="text-lg font-black text-slate-900 leading-none">₹{totalCreditLimit.toLocaleString()}</h4>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-4 xl:col-span-3">
                    <Card className="sticky top-24 border-none shadow-premium bg-white/70 backdrop-blur-xl">
                        <CardHeader className="pb-4 border-b border-slate-50">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                    <Users className="w-5 h-5" />
                                </div>
                                <CardTitle className="text-xl">{isEditing ? 'Edit Profile' : 'New Client'}</CardTitle>
                            </div>
                            <CardDescription>
                                {isEditing ? 'Update existing client details' : 'Register a new customer account'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                                <Input
                                    label="Full Name"
                                    {...register('name')}
                                    error={errors.name}
                                    placeholder="Enter client name"
                                    className="bg-white"
                                    autoFocus
                                />
                                
                                <Input
                                    label="Contact Number"
                                    {...register('phone')}
                                    error={errors.phone}
                                    placeholder="+91..."
                                    className="bg-white"
                                    startAdornment={<Phone className="w-4 h-4 text-slate-400" />}
                                />
                                
                                <div className="space-y-1.5 group">
                                    <label className="text-[13px] font-semibold text-slate-700 ml-1 transition-colors group-focus-within:text-primary">
                                        Credit Authorization
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-[14px] font-black text-slate-400">₹</span>
                                        </div>
                                        <input
                                            type="number"
                                            {...register('credit_limit', { valueAsNumber: true })}
                                            className="w-full h-11 pl-7 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 transition-all focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5 group">
                                    <label className="text-[13px] font-semibold text-slate-700 ml-1 transition-colors group-focus-within:text-primary">
                                        Billing Address
                                    </label>
                                    <textarea
                                        {...register('address')}
                                        className="flex min-h-[100px] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm transition-all focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none placeholder:text-slate-400 font-medium"
                                        placeholder="Complete address locater..."
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button
                                        type="submit"
                                        variant="gradient"
                                        className="flex-1 h-11 rounded-xl font-bold shadow-lg shadow-blue-500/20"
                                        disabled={isSubmitting}
                                    >
                                        {isEditing ? 'Save Changes' : 'Register Client'}
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

                {/* Directory List Area */}
                <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                    {/* Search & Filter Bar */}
                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between p-4 bg-white/70 backdrop-blur-md rounded-3xl shadow-premium border border-slate-100">
                        <div className="relative w-full sm:w-96">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search clients by name or phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary outline-none transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-3">
                             <div className="h-11 px-4 rounded-xl border border-slate-200 bg-white flex items-center shadow-sm">
                                <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                                    Clients: <span className="text-primary">{filteredCustomers.length}</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-32 flex-col gap-4 bg-white/50 rounded-3xl border border-slate-100 backdrop-blur-sm">
                            <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-primary animate-spin" />
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Directory...</span>
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-premium">
                            <div className="p-6 rounded-full bg-slate-50 text-slate-300 mb-4">
                                <Users className="w-16 h-16" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1">No Clients Found</h3>
                            <p className="text-sm font-medium text-slate-500">Adjust your search or register a new client.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                            {filteredCustomers.map((customer) => (
                                <Card key={customer.id} className="group border-none shadow-premium bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                                    <CardContent className="p-0">
                                        <div className="p-5 border-b border-slate-50">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                                                    {customer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5" onClick={() => handleEdit(customer)}>
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50" onClick={() => handleDeleteClick(customer.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <h3 className="text-lg font-bold text-slate-900 truncate" title={customer.name}>{customer.name}</h3>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">ID: CLI-{customer.id.toString().padStart(4, '0')}</p>
                                        </div>
                                        
                                        <div className="p-5 space-y-3 bg-slate-50/50">
                                            <div className="flex items-center text-sm font-medium text-slate-600">
                                                <Phone className="w-4 h-4 mr-3 text-slate-400" />
                                                {customer.phone || <span className="text-slate-300 italic">No contact provided</span>}
                                            </div>
                                            <div className="flex items-start text-sm font-medium text-slate-600">
                                                <MapPin className="w-4 h-4 mr-3 text-slate-400 mt-0.5" />
                                                <span className="line-clamp-2">{customer.address || <span className="text-slate-300 italic">No address provided</span>}</span>
                                            </div>
                                        </div>

                                        <div className="p-5 border-t border-slate-50 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                <CreditCard className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase tracking-wider">Credit Cap</span>
                                            </div>
                                            <span className="text-base font-black text-slate-900">
                                                ₹{(Number(customer.credit_limit) || 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Revoke Client Access?"
                description="This will permanently delete the client record. Cannot be done if they have active transactions."
                confirmText="Delete Outline"
                variant="danger"
            />
        </div>
    );
}
