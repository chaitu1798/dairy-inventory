'use client';

import { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { Plus, Trash2, Edit2, Shield, User, Info, Save, X, Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/Table';
import { Badge } from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import ConfirmationDialog from '../../../components/ui/ConfirmationDialog';
import { toast } from 'sonner';

const userSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    role: z.enum(['admin', 'manager', 'staff', 'viewer'], {
        errorMap: (issue, ctx) => ({ message: 'Please select a valid role' })
    })
});

type UserFormData = z.infer<typeof userSchema>;

const RoleTooltip = ({ role }: { role: string }) => {
    const tooltips: Record<string, string> = {
        admin: 'Full access to all system features and settings.',
        manager: 'Can manage inventory, sales, and view reports. Cannot manage users.',
        staff: 'Can record transactions (sales, purchases) but limited access to reports.',
        viewer: 'Read-only access to dashboard and basic reports.'
    };

    return (
        <div className="group relative inline-block ml-1">
            <Info className="w-3 h-3 text-gray-400 cursor-help" />
            <div className="invisible group-hover:visible absolute z-10 w-48 p-2 mt-1 text-xs text-white bg-gray-800 rounded shadow-lg -left-20">
                {tooltips[role] || 'No description available'}
            </div>
        </div>
    );
};

export default function UsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            role: 'staff'
        }
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: UserFormData) => {
        console.log('Submitting user form data:', data);
        try {
            if (editingUser) {
                console.log('Updating user role for:', editingUser.id);
                await api.put(`/users/${editingUser.id}/role`, { role: data.role });
                toast.success('User role updated successfully');
            } else {
                console.log('Inviting new user');
                await api.post('/users', data);
                toast.success('User invited successfully');
            }
            fetchUsers();
            closeModal();
        } catch (error: any) {
            console.error('Error saving user:', error);
            // Log full error details for debugging
            console.log('Validation/API Error:', error.response?.data);
            toast.error(error.response?.data?.error || 'Failed to save user');
        }
    };

    const handleEdit = (user: any) => {
        setEditingUser(user);
        setValue('email', user.email);
        setValue('role', user.user_metadata?.role || 'staff');
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setDeleteId(id);
        setIsDeleteDialogOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/users/${deleteId}`);
            toast.success('User deleted successfully');
            fetchUsers();
        } catch (error) {
            console.error('Error deleting user:', error);
            toast.error('Failed to delete user');
        } finally {
            setIsDeleteDialogOpen(false);
            setDeleteId(null);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
        reset({ email: '', password: '', role: 'staff' });
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'manager': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'staff': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                        <User className="w-8 h-8 mr-3 text-primary" />
                        User Management
                    </h1>
                    <p className="text-gray-500 mt-1">Manage system access and roles.</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" />
                    Invite User
                </Button>
            </div>

            {/* Mobile View: Cards */}
            <div className="md:hidden space-y-4">
                {users.map((user) => (
                    <div key={user.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold text-gray-900 break-all">{user.email}</p>
                                <p className="text-xs text-gray-500">Last sign in: {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}</p>
                            </div>
                            <Badge className={getRoleBadgeColor(user.user_metadata?.role || 'staff')}>
                                {user.user_metadata?.role || 'staff'}
                            </Badge>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>
                                <Edit2 className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(user.id)}>
                                <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Last Active</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <div className="flex items-center">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                                            <span className="text-primary font-bold text-xs">
                                                {user.email?.[0].toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{user.email}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center">
                                        <Badge className={`mr-2 ${getRoleBadgeColor(user.user_metadata?.role || 'staff')}`}>
                                            {user.user_metadata?.role || 'staff'}
                                        </Badge>
                                        <RoleTooltip role={user.user_metadata?.role || 'staff'} />
                                    </div>
                                </TableCell>
                                <TableCell className="text-gray-500">
                                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                                </TableCell>
                                <TableCell className="text-gray-500">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => handleEdit(user)} title="Edit Role">
                                            <Edit2 className="w-4 h-4 text-blue-600" />
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(user.id)} title="Delete User">
                                            <Trash2 className="w-4 h-4 text-red-600" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {users.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* User Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={editingUser ? "Edit User Role" : "Invite New User"}
            >
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        label="Email Address"
                        type="email"
                        {...register('email')}
                        error={errors.email}
                        placeholder="user@example.com"
                        readOnly={!!editingUser}
                        className={editingUser ? 'bg-gray-100' : ''}
                    />

                    {!editingUser && (
                        <Input
                            label="Password"
                            type="password"
                            {...register('password')}
                            error={errors.password}
                            placeholder="At least 6 characters"
                        />
                    )}

                    <div className="space-y-1">
                        <Select
                            label="Role"
                            {...register('role')}
                            error={errors.role}
                            options={[
                                { value: 'staff', label: 'Staff (Transaction Access)' },
                                { value: 'manager', label: 'Manager (Inventory & Reports)' },
                                { value: 'admin', label: 'Admin (Full Access)' },
                                { value: 'viewer', label: 'Viewer (Read Only)' }
                            ]}
                        />
                        <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded flex items-start">
                            <Info className="w-3 h-3 text-blue-500 mr-1 mt-0.5 shrink-0" />
                            Role permissions determine what features this user can access.
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="outline" onClick={closeModal}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <>Saving...</>
                            ) : (
                                <><Save className="w-4 h-4 mr-2" /> {editingUser ? 'Update Role' : 'Send Invite'}</>
                            )}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmationDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => setIsDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Delete User"
                description="Are you sure you want to delete this user? They will no longer be able to access the system. This action cannot be undone."
                confirmText="Delete User"
                variant="danger"
            />
        </div>
    );
}
